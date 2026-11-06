/**
 * Sakhuwanankarkatti Citizen Grievance & Chairperson Contact System
 * Domain Types & Interfaces
 */

export type Language = 'ne' | 'en' | 'mai';

export type UserRole = 
  | 'citizen'
  | 'intake_officer'
  | 'ward_officer'
  | 'chairperson'
  | 'secretariat'
  | 'admin'
  | 'auditor';

export type ComplaintCategory =
  | 'roads_infrastructure'
  | 'drinking_water_sanitation'
  | 'health_services'
  | 'education_schools'
  | 'agriculture_livestock'
  | 'social_security'
  | 'delayed_services'
  | 'staff_conduct'
  | 'other';

export type ComplaintStatus =
  | 'Submitted'
  | 'Under review'
  | 'Assigned'
  | 'In progress'
  | 'Additional information requested'
  | 'Resolved'
  | 'Closed with explanation'
  | 'Reopened';

export type ContactMethod = 'phone' | 'email' | 'in_person';

export interface Attachment {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  quarantineStatus: 'safe' | 'quarantined' | 'scanning';
  uploadedAt: string; // UTC ISO string
  dataUrl?: string; // base64 or server URL so staff can view the photo
  url?: string;
}

export interface ComplaintMessage {
  id: string;
  complaintId: string;
  senderRole: UserRole;
  senderName: string;
  content: string;
  createdAt: string; // UTC ISO
  isInternalNote: boolean; // TRUE: Only staff can see; FALSE: Visible to citizen
}

export interface StatusHistoryEntry {
  status: ComplaintStatus;
  changedByRole: UserRole;
  changedByName: string;
  reason?: string;
  timestamp: string; // UTC ISO
}

export interface Complaint {
  id: string;
  referenceNumber: string; // e.g., SKK-2026-7K4M9Q2X
  trackingSecretHash?: string; // Optional capability secret
  title: string;
  category: ComplaintCategory;
  wardNumber: number; // 1 to 5 for Sakhuwanankarkatti
  landmark: string;
  description: string;
  
  preferredReplyLanguage: Language;
  contactMethod: ContactMethod;
  citizenName?: string;
  citizenPhone?: string;
  citizenEmail?: string;
  
  isConfidentialIdentity: boolean; // hides name/phone from ward/department staff
  isChairpersonAttentionRequested: boolean;
  isConflictOfInterest: boolean; // involves leadership/staff, triggers restricted routing
  
  status: ComplaintStatus;
  assignedDepartment?: string;
  assignedWard?: number;
  assignedOfficerName?: string;
  
  attachments: Attachment[];
  statusHistory: StatusHistoryEntry[];
  
  createdAt: string; // UTC ISO
  updatedAt: string; // UTC ISO
  slaTargetDays: number;
}

export type AppointmentStatus = 'Requested' | 'Approved' | 'Declined' | 'Completed' | 'Cancelled';

export interface Appointment {
  id: string;
  referenceNumber: string; // e.g. APT-2026-XXXX
  citizenName: string;
  citizenPhone: string;
  citizenWard: number;
  requestedDate: string; // YYYY-MM-DD
  requestedTimeSlot: string; // e.g., "11:30 AM"
  purpose: string;
  relatedComplaintRef?: string;
  status: AppointmentStatus;
  secretariatNotes?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorRole: UserRole;
  actorName: string;
  action: string;
  targetType: 'complaint' | 'appointment' | 'system_config' | 'export' | 'auth';
  targetId: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILED';
  details: string;
  timestamp: string; // UTC ISO
  ipSnippet?: string;
}

export interface MunicipalityConfig {
  municipalityNameNe: string;
  municipalityNameEn: string;
  districtNe: string;
  districtEn: string;
  provinceNe: string;
  provinceEn: string;
  officeLocationNe: string;
  officeLocationEn: string;
  emergencyHelpline: string;
  officeHelpdeskPhone: string;
  officeEmail: string;
  workingDaysNe: string;
  workingDaysEn: string;
  totalWards: number;
}
