/**
 * API Client for Sakhuwanankarkatti Municipal System
 * Seamlessly integrates Supabase Cloud Database with LocalStorage offline caching
 * and optional Node.js Express backend proxy.
 */

import {
  Complaint,
  ComplaintMessage,
  Appointment,
  AuditLog,
  ComplaintStatus,
  ComplaintCategory,
  UserRole,
} from '../types';
import { LocalMunicipalityDB } from './storage';
import {
  getComplaintsFromSupabase,
  saveComplaintToSupabase,
  updateComplaintStatusInSupabase,
  getMessagesFromSupabase,
  saveMessageToSupabase,
  getAppointmentsFromSupabase,
  saveAppointmentToSupabase,
} from './supabaseClient';

export const API_BASE = '/api';

export class MunicipalityAPI {
  /**
   * Fetch all complaints: Supabase Cloud -> Server API -> Local Cache
   */
  static async getComplaints(): Promise<Complaint[]> {
    // 1. Try Supabase Cloud Database first
    try {
      const supabaseComplaints = await getComplaintsFromSupabase();
      if (supabaseComplaints && supabaseComplaints.length > 0) {
        LocalMunicipalityDB.saveComplaints(supabaseComplaints);
        return supabaseComplaints;
      }
    } catch (err) {
      console.warn('Supabase fetch error, trying backend server:', err);
    }

    // 2. Try Node/Express server backend if running
    try {
      const res = await fetch(`${API_BASE}/complaints`);
      if (res.ok) {
        const complaints: Complaint[] = await res.json();
        LocalMunicipalityDB.saveComplaints(complaints);
        return complaints;
      }
    } catch {
      // Offline or static host (Netlify / GitHub Pages)
    }

    // 3. Fall back to persistent Local Cache
    return LocalMunicipalityDB.getComplaints();
  }

  /**
   * Submit new complaint with photo attachments
   */
  static async submitComplaint(data: {
    title: string;
    category: ComplaintCategory;
    wardNumber: number;
    landmark: string;
    description: string;
    preferredReplyLanguage: 'ne' | 'en' | 'mai';
    contactMethod: 'phone' | 'email' | 'in_person';
    citizenName?: string;
    citizenPhone?: string;
    citizenEmail?: string;
    isConfidentialIdentity: boolean;
    isChairpersonAttentionRequested: boolean;
    isConflictOfInterest: boolean;
    attachments: Array<{
      name: string;
      sizeBytes: number;
      mimeType: string;
      dataUrl?: string;
    }>;
  }): Promise<Complaint> {
    // 1. Register in Local Database immediately (guarantees citizen gets instant token & printable receipt)
    const newComplaint = LocalMunicipalityDB.submitComplaint(data);

    // 2. Synchronize to Supabase Cloud Database
    saveComplaintToSupabase(newComplaint).catch((err) => {
      console.warn('Background Supabase complaint sync notice:', err);
    });

    // 3. Post to backend server if available
    try {
      fetch(`${API_BASE}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(() => {});
    } catch {}

    return newComplaint;
  }

  /**
   * Update complaint status
   */
  static async updateStatus(
    complaintId: string,
    newStatus: ComplaintStatus,
    reason: string,
    actorRole: UserRole,
    actorName: string
  ): Promise<boolean> {
    // 1. Update in Local Storage
    const success = LocalMunicipalityDB.updateComplaintStatus(
      complaintId,
      newStatus,
      reason,
      actorRole,
      actorName
    );

    // 2. Synchronize to Supabase Cloud Database
    const all = LocalMunicipalityDB.getComplaints();
    const updated = all.find((c) => c.id === complaintId);
    if (updated) {
      updateComplaintStatusInSupabase(complaintId, newStatus, updated.statusHistory).catch(
        (err) => console.warn('Supabase status sync notice:', err)
      );
    }

    // 3. Notify backend server if running
    try {
      fetch(`${API_BASE}/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus, reason, actorRole, actorName }),
      }).catch(() => {});
    } catch {}

    return success;
  }

  /**
   * Assign complaint to department and ward
   */
  static async assignComplaint(
    complaintId: string,
    department: string,
    wardNumber: number,
    officerName: string,
    actorRole: UserRole,
    actorName: string
  ): Promise<boolean> {
    const success = LocalMunicipalityDB.assignComplaint(
      complaintId,
      department,
      wardNumber,
      officerName,
      actorRole,
      actorName
    );

    const all = LocalMunicipalityDB.getComplaints();
    const updated = all.find((c) => c.id === complaintId);
    if (updated) {
      saveComplaintToSupabase(updated).catch(() => {});
    }

    try {
      fetch(`${API_BASE}/complaints/${complaintId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department, wardNumber, officerName, actorRole, actorName }),
      }).catch(() => {});
    } catch {}

    return success;
  }

  /**
   * Get messages for a complaint
   */
  static async getMessages(complaintId: string, role: UserRole): Promise<ComplaintMessage[]> {
    // 1. Try Supabase
    try {
      const supabaseMsgs = await getMessagesFromSupabase(complaintId);
      if (supabaseMsgs && supabaseMsgs.length > 0) {
        if (role === 'citizen') {
          return supabaseMsgs.filter((m) => !m.isInternalNote);
        }
        return supabaseMsgs;
      }
    } catch {}

    // 2. Try Backend
    try {
      const res = await fetch(`${API_BASE}/complaints/${complaintId}/messages`);
      if (res.ok) {
        const msgs: ComplaintMessage[] = await res.json();
        if (role === 'citizen') {
          return msgs.filter((m) => !m.isInternalNote);
        }
        return msgs;
      }
    } catch {}

    // 3. Local Cache
    return LocalMunicipalityDB.getScopedMessages(complaintId, role);
  }

  /**
   * Post message (public or internal note)
   */
  static async addMessage(
    complaintId: string,
    senderRole: UserRole,
    senderName: string,
    content: string,
    isInternalNote: boolean
  ): Promise<ComplaintMessage> {
    const msg = LocalMunicipalityDB.addMessage(
      complaintId,
      senderRole,
      senderName,
      content,
      isInternalNote
    );

    // Sync to Supabase
    saveMessageToSupabase(msg).catch(() => {});

    try {
      fetch(`${API_BASE}/complaints/${complaintId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderRole, senderName, content, isInternalNote }),
      }).catch(() => {});
    } catch {}

    return msg;
  }

  /**
   * Get Appointments
   */
  static async getAppointments(): Promise<Appointment[]> {
    // 1. Try Supabase
    try {
      const supabaseApts = await getAppointmentsFromSupabase();
      if (supabaseApts && supabaseApts.length > 0) {
        LocalMunicipalityDB.saveAppointments(supabaseApts);
        return supabaseApts;
      }
    } catch {}

    // 2. Try Backend
    try {
      const res = await fetch(`${API_BASE}/appointments`);
      if (res.ok) {
        const apts = await res.json();
        LocalMunicipalityDB.saveAppointments(apts);
        return apts;
      }
    } catch {}

    // 3. Local Cache
    return LocalMunicipalityDB.getAppointments();
  }

  /**
   * Book Appointment
   */
  static async bookAppointment(data: {
    citizenName: string;
    citizenPhone: string;
    citizenWard: number;
    requestedDate: string;
    requestedTimeSlot: string;
    purpose: string;
    relatedComplaintRef?: string;
  }): Promise<Appointment> {
    const newApt = LocalMunicipalityDB.bookAppointment(data);

    // Sync to Supabase
    saveAppointmentToSupabase(newApt).catch(() => {});

    try {
      fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(() => {});
    } catch {}

    return newApt;
  }

  /**
   * Update Appointment status
   */
  static async updateAppointmentStatus(
    aptId: string,
    status: 'Approved' | 'Declined' | 'Completed' | 'Cancelled',
    secretariatNotes: string,
    reviewedBy: string,
    actorRole: UserRole
  ): Promise<boolean> {
    const success = LocalMunicipalityDB.updateAppointmentStatus(
      aptId,
      status,
      secretariatNotes,
      reviewedBy,
      actorRole
    );

    const all = LocalMunicipalityDB.getAppointments();
    const updated = all.find((a) => a.id === aptId);
    if (updated) {
      saveAppointmentToSupabase(updated).catch(() => {});
    }

    try {
      fetch(`${API_BASE}/appointments/${aptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, secretariatNotes, reviewedBy }),
      }).catch(() => {});
    } catch {}

    return success;
  }
}
