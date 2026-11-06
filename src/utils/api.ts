/**
 * API Client for Sakhuwanankarkatti Municipal System
 * Synchronizes complaints, photo attachments, messages, and appointments
 * across all client devices and the persistent backend.
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

export const API_BASE = '/api';

export class MunicipalityAPI {
  /**
   * Fetch all complaints from server, fall back to LocalStorage if offline
   */
  static async getComplaints(): Promise<Complaint[]> {
    try {
      const res = await fetch(`${API_BASE}/complaints`);
      if (res.ok) {
        const complaints: Complaint[] = await res.json();
        // Update local cache
        LocalMunicipalityDB.saveComplaints(complaints);
        return complaints;
      }
    } catch (err) {
      console.warn('Backend API unreachable, using local cache:', err);
    }
    return LocalMunicipalityDB.getComplaints();
  }

  /**
   * Submit new complaint with photo attachments (Base64 data URLs)
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
    try {
      const res = await fetch(`${API_BASE}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.complaint) {
          // Add to local cache as well
          const localComplaints = LocalMunicipalityDB.getComplaints();
          localComplaints.unshift(json.complaint);
          LocalMunicipalityDB.saveComplaints(localComplaints);
          return json.complaint;
        }
      }
    } catch (err) {
      console.warn('API submission failed, falling back to local database:', err);
    }

    // Local fallback if server is offline
    return LocalMunicipalityDB.submitComplaint(data);
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
    try {
      const res = await fetch(`${API_BASE}/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus, reason, actorRole, actorName }),
      });
      if (res.ok) {
        // Also update local DB
        LocalMunicipalityDB.updateComplaintStatus(complaintId, newStatus, reason, actorRole, actorName);
        return true;
      }
    } catch (err) {
      console.warn('Failed to update status on server:', err);
    }
    return LocalMunicipalityDB.updateComplaintStatus(complaintId, newStatus, reason, actorRole, actorName);
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
    try {
      const res = await fetch(`${API_BASE}/complaints/${complaintId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department, wardNumber, officerName, actorRole, actorName }),
      });
      if (res.ok) {
        LocalMunicipalityDB.assignComplaint(complaintId, department, wardNumber, officerName, actorRole, actorName);
        return true;
      }
    } catch (err) {
      console.warn('Failed to assign on server:', err);
    }
    return LocalMunicipalityDB.assignComplaint(complaintId, department, wardNumber, officerName, actorRole, actorName);
  }

  /**
   * Get messages for a complaint
   */
  static async getMessages(complaintId: string, role: UserRole): Promise<ComplaintMessage[]> {
    try {
      const res = await fetch(`${API_BASE}/complaints/${complaintId}/messages`);
      if (res.ok) {
        const msgs: ComplaintMessage[] = await res.json();
        if (role === 'citizen') {
          return msgs.filter((m) => !m.isInternalNote);
        }
        return msgs;
      }
    } catch (err) {
      console.warn('Failed to fetch messages from server:', err);
    }
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
    try {
      const res = await fetch(`${API_BASE}/complaints/${complaintId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderRole, senderName, content, isInternalNote }),
      });
      if (res.ok) {
        const json = await res.json();
        LocalMunicipalityDB.addMessage(complaintId, senderRole, senderName, content, isInternalNote);
        return json.message;
      }
    } catch (err) {
      console.warn('Failed to post message to server:', err);
    }
    return LocalMunicipalityDB.addMessage(complaintId, senderRole, senderName, content, isInternalNote);
  }

  /**
   * Get Appointments
   */
  static async getAppointments(): Promise<Appointment[]> {
    try {
      const res = await fetch(`${API_BASE}/appointments`);
      if (res.ok) {
        const apts = await res.json();
        LocalMunicipalityDB.saveAppointments(apts);
        return apts;
      }
    } catch (err) {
      console.warn('Failed to fetch appointments:', err);
    }
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
    try {
      const res = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.appointment) {
          return json.appointment;
        }
      }
    } catch (err) {
      console.warn('Failed to book appointment on server:', err);
    }
    return LocalMunicipalityDB.bookAppointment(data);
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
    try {
      const res = await fetch(`${API_BASE}/appointments/${aptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, secretariatNotes, reviewedBy }),
      });
      if (res.ok) {
        LocalMunicipalityDB.updateAppointmentStatus(aptId, status, secretariatNotes, reviewedBy, actorRole);
        return true;
      }
    } catch (err) {
      console.warn('Failed to update appointment on server:', err);
    }
    return LocalMunicipalityDB.updateAppointmentStatus(aptId, status, secretariatNotes, reviewedBy, actorRole);
  }
}
