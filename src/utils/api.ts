/**
 * API Client for Sakhuwanankarkatti Municipal System
 * Supabase is the single source of truth. Every read goes straight to Supabase;
 * the browser's LocalStorage is only used as an offline cache when Supabase
 * cannot be reached.
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
  getComplaintByReferenceFromSupabase,
  saveComplaintToSupabase,
  updateComplaintStatusInSupabase,
  getMessagesFromSupabase,
  saveMessageToSupabase,
  getAppointmentsFromSupabase,
  saveAppointmentToSupabase,
} from './supabaseClient';

export class MunicipalityAPI {
  /**
   * Fetch all complaints: Supabase Cloud -> Local Cache (offline only)
   */
  static async getComplaints(): Promise<Complaint[]> {
    // 1. Try Supabase Cloud Database first
    try {
      const supabaseComplaints = await getComplaintsFromSupabase();
      if (supabaseComplaints) {
        LocalMunicipalityDB.saveComplaints(supabaseComplaints);
        return supabaseComplaints;
      }
    } catch (err) {
      console.warn('Supabase fetch error, using offline cache:', err);
    }

    // 2. Offline: fall back to the last cached copy
    return LocalMunicipalityDB.getComplaints();
  }

  /**
   * Find a complaint by reference number (citizen tracking): Supabase -> Local Cache
   */
  static async getComplaintByReference(ref: string): Promise<Complaint | null> {
    const cleanRef = ref.trim().toUpperCase();
    const fromCloud = await getComplaintByReferenceFromSupabase(cleanRef);
    if (fromCloud) return fromCloud;
    return (
      LocalMunicipalityDB.getComplaints().find(
        (c) => c.referenceNumber.toUpperCase() === cleanRef
      ) || null
    );
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

    // 2. Save to Supabase Cloud Database
    await saveComplaintToSupabase(newComplaint);

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

    // 2. Save to Supabase Cloud Database
    const all = LocalMunicipalityDB.getComplaints();
    const updated = all.find((c) => c.id === complaintId);
    if (updated) {
      await updateComplaintStatusInSupabase(complaintId, newStatus, updated.statusHistory);
    }

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
      await saveComplaintToSupabase(updated);
    }

    return success;
  }

  /**
   * Get messages for a complaint
   */
  static async getMessages(complaintId: string, role: UserRole): Promise<ComplaintMessage[]> {
    // 1. Try Supabase
    try {
      const supabaseMsgs = await getMessagesFromSupabase(complaintId);
      if (supabaseMsgs) {
        if (role === 'citizen') {
          return supabaseMsgs.filter((m) => !m.isInternalNote);
        }
        return supabaseMsgs;
      }
    } catch {}

    // 2. Offline: fall back to the last cached copy
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
    await saveMessageToSupabase(msg);

    return msg;
  }

  /**
   * Get Appointments
   */
  static async getAppointments(): Promise<Appointment[]> {
    // 1. Try Supabase
    try {
      const supabaseApts = await getAppointmentsFromSupabase();
      if (supabaseApts) {
        LocalMunicipalityDB.saveAppointments(supabaseApts);
        return supabaseApts;
      }
    } catch {}

    // 2. Offline: fall back to the last cached copy
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
    await saveAppointmentToSupabase(newApt);

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
      await saveAppointmentToSupabase(updated);
    }

    return success;
  }
}
