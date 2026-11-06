import { createClient } from '@supabase/supabase-js';
import { Complaint, ComplaintMessage, Appointment, ComplaintStatus, StatusHistoryEntry, AppointmentStatus } from '../types';

// Configuration from environment variables with fallback to user's provided credentials
const SUPABASE_URL =
  (import.meta.env?.VITE_SUPABASE_URL as string) ||
  'https://bwhuqislebkgmoarbjjs.supabase.co';

const SUPABASE_ANON_KEY =
  (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) ||
  (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  'sb_publishable_mqMMlx1OsKkTPWE6NT3Hvg_FUkW8F7r';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Fetch all complaints from Supabase
 */
export async function getComplaintsFromSupabase(): Promise<Complaint[] | null> {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase getComplaints warning (table may not exist yet):', error.message);
      return null;
    }

    if (!data) return null;

    return data.map((row) => ({
      id: row.id,
      referenceNumber: row.reference_number || row.referenceNumber,
      title: row.title,
      category: row.category,
      wardNumber: Number(row.ward_number || row.wardNumber || 1),
      landmark: row.landmark || '',
      description: row.description || '',
      preferredReplyLanguage: row.preferred_reply_language || row.preferredReplyLanguage || 'ne',
      contactMethod: row.contact_method || row.contactMethod || 'phone',
      citizenName: row.citizen_name || row.citizenName,
      citizenPhone: row.citizen_phone || row.citizenPhone,
      citizenEmail: row.citizen_email || row.citizenEmail,
      isConfidentialIdentity: Boolean(row.is_confidential_identity ?? row.isConfidentialIdentity),
      isChairpersonAttentionRequested: Boolean(row.is_chairperson_attention_requested ?? row.isChairpersonAttentionRequested),
      isConflictOfInterest: Boolean(row.is_conflict_of_interest ?? row.isConflictOfInterest),
      status: (row.status as ComplaintStatus) || 'Submitted',
      assignedDepartment: row.assigned_department || row.assignedDepartment,
      assignedWard: row.assigned_ward ? Number(row.assigned_ward) : undefined,
      assignedOfficerName: row.assigned_officer_name || row.assignedOfficerName,
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      statusHistory: Array.isArray(row.status_history || row.statusHistory)
        ? (row.status_history || row.statusHistory)
        : [],
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
      slaTargetDays: Number(row.sla_target_days || row.slaTargetDays || 7),
    }));
  } catch (err) {
    console.warn('Supabase fetch exception:', err);
    return null;
  }
}

/**
 * Insert new complaint into Supabase
 */
export async function saveComplaintToSupabase(complaint: Complaint): Promise<boolean> {
  try {
    const payload = {
      id: complaint.id,
      reference_number: complaint.referenceNumber,
      title: complaint.title,
      category: complaint.category,
      ward_number: complaint.wardNumber,
      landmark: complaint.landmark,
      description: complaint.description,
      preferred_reply_language: complaint.preferredReplyLanguage,
      contact_method: complaint.contactMethod,
      citizen_name: complaint.citizenName || null,
      citizen_phone: complaint.citizenPhone || null,
      citizen_email: complaint.citizenEmail || null,
      is_confidential_identity: complaint.isConfidentialIdentity,
      is_chairperson_attention_requested: complaint.isChairpersonAttentionRequested,
      is_conflict_of_interest: complaint.isConflictOfInterest,
      status: complaint.status,
      assigned_department: complaint.assignedDepartment || null,
      assigned_ward: complaint.assignedWard || null,
      assigned_officer_name: complaint.assignedOfficerName || null,
      attachments: complaint.attachments || [],
      status_history: complaint.statusHistory || [],
      created_at: complaint.createdAt,
      updated_at: complaint.updatedAt,
      sla_target_days: complaint.slaTargetDays,
    };

    const { error } = await supabase.from('complaints').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase save complaint error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase save exception:', err);
    return false;
  }
}

/**
 * Update complaint status in Supabase
 */
export async function updateComplaintStatusInSupabase(
  complaintId: string,
  newStatus: ComplaintStatus,
  statusHistory: StatusHistoryEntry[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('complaints')
      .update({
        status: newStatus,
        status_history: statusHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', complaintId);

    if (error) {
      console.warn('Supabase update status error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase update status exception:', err);
    return false;
  }
}

/**
 * Fetch messages for a complaint from Supabase
 */
export async function getMessagesFromSupabase(complaintId: string): Promise<ComplaintMessage[] | null> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('complaint_id', complaintId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase getMessages error:', error.message);
      return null;
    }

    if (!data) return null;

    return data.map((row) => ({
      id: row.id,
      complaintId: row.complaint_id || row.complaintId,
      senderRole: row.sender_role || row.senderRole,
      senderName: row.sender_name || row.senderName,
      content: row.content,
      createdAt: row.created_at || row.createdAt,
      isInternalNote: Boolean(row.is_internal_note ?? row.isInternalNote),
    }));
  } catch (err) {
    console.warn('Supabase getMessages exception:', err);
    return null;
  }
}

/**
 * Save new message to Supabase
 */
export async function saveMessageToSupabase(msg: ComplaintMessage): Promise<boolean> {
  try {
    const payload = {
      id: msg.id,
      complaint_id: msg.complaintId,
      sender_role: msg.senderRole,
      sender_name: msg.senderName,
      content: msg.content,
      is_internal_note: msg.isInternalNote,
      created_at: msg.createdAt,
    };

    const { error } = await supabase.from('messages').insert(payload);
    if (error) {
      console.warn('Supabase saveMessage error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase saveMessage exception:', err);
    return false;
  }
}

/**
 * Fetch appointments from Supabase
 */
export async function getAppointmentsFromSupabase(): Promise<Appointment[] | null> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('requested_date', { ascending: true });

    if (error) {
      console.warn('Supabase getAppointments error:', error.message);
      return null;
    }

    if (!data) return null;

    return data.map((row) => ({
      id: row.id,
      referenceNumber: row.reference_number || row.referenceNumber,
      citizenName: row.citizen_name || row.citizenName,
      citizenPhone: row.citizen_phone || row.citizenPhone,
      citizenWard: Number(row.citizen_ward || row.citizenWard || 1),
      requestedDate: row.requested_date || row.requestedDate,
      requestedTimeSlot: row.requested_time_slot || row.requestedTimeSlot || '10:00 AM',
      purpose: row.purpose || '',
      relatedComplaintRef: row.related_complaint_ref || row.relatedComplaintRef,
      status: (row.status as AppointmentStatus) || 'Requested',
      secretariatNotes: row.secretariat_notes || row.secretariatNotes,
      reviewedBy: row.reviewed_by || row.reviewedBy,
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Supabase getAppointments exception:', err);
    return null;
  }
}

/**
 * Save new appointment to Supabase
 */
export async function saveAppointmentToSupabase(apt: Appointment): Promise<boolean> {
  try {
    const payload = {
      id: apt.id,
      reference_number: apt.referenceNumber,
      citizen_name: apt.citizenName,
      citizen_phone: apt.citizenPhone,
      citizen_ward: apt.citizenWard,
      requested_date: apt.requestedDate,
      requested_time_slot: apt.requestedTimeSlot,
      purpose: apt.purpose,
      related_complaint_ref: apt.relatedComplaintRef || null,
      status: apt.status,
      secretariat_notes: apt.secretariatNotes || null,
      reviewed_by: apt.reviewedBy || null,
      created_at: apt.createdAt,
      updated_at: apt.updatedAt || new Date().toISOString(),
    };

    const { error } = await supabase.from('appointments').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase saveAppointment error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase saveAppointment exception:', err);
    return false;
  }
}

/**
 * Test live connection to Supabase project
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; url: string; error?: string }> {
  try {
    const { error } = await supabase.from('complaints').select('count', { count: 'exact', head: true });
    if (error) {
      return { success: false, url: SUPABASE_URL, error: error.message };
    }
    return { success: true, url: SUPABASE_URL };
  } catch (err) {
    return { success: false, url: SUPABASE_URL, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Staff Login exclusively via real Supabase Auth
 */
export async function loginStaffWithSupabase(
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: { username: string; email?: string; role: string }; error?: string }> {
  const cleanEmail = identifier.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanEmail || !cleanPass) {
    return {
      success: false,
      error: 'कृपया आफ्नो आधिकारिक इमेल र पासवर्ड प्रविष्ट गर्नुहोस्।',
    };
  }

  // 1. Authenticate with Supabase Auth
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPass,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return {
          success: false,
          error: 'अमान्य इमेल वा पासवर्ड! कृपया तपाईंको Supabase खाताको सही इमेल र पासवर्ड प्रविष्ट गर्नुहोस्।',
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }

    if (data?.user) {
      const userRole = (data.user.user_metadata?.role as string) || 'admin';
      return {
        success: true,
        user: {
          username: data.user.email?.split('@')[0] || cleanEmail,
          email: data.user.email,
          role: userRole,
        },
      };
    }
  } catch (e) {
    console.error('Supabase auth error:', e);
    return {
      success: false,
      error: 'Supabase प्रमाणीकरणमा समस्या आयो। कृपया इन्टरनेट जडान जाँच गर्नुहोस्।',
    };
  }

  return {
    success: false,
    error: 'प्रमाणीकरण असफल भयो। कृपया आफ्नो सही इमेल र पासवर्ड प्रविष्ट गर्नुहोस्।',
  };
}

/**
 * Register / Sign up new staff in Supabase Auth
 */
export async function signUpStaffWithSupabase(
  email: string,
  password: string
): Promise<{ success: boolean; user?: { username: string; email?: string; role: string }; error?: string; message?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  if (cleanPass.length < 6) {
    return { success: false, error: 'पासवर्ड कम्तिमा ६ अक्षरको हुनुपर्दछ।' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: cleanPass,
      options: {
        data: {
          role: 'admin',
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.session && data?.user) {
      return {
        success: true,
        user: {
          username: data.user.email?.split('@')[0] || cleanEmail,
          email: data.user.email,
          role: 'admin',
        },
      };
    }

    return {
      success: true,
      message: 'खाता सफलतापूर्वक सिर्जना भयो! अब आफ्नो पासवर्ड प्रयोग गरी लगइन गर्नुहोस्।',
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'खाता सिर्जना गर्न सकिएन।' };
  }
}
