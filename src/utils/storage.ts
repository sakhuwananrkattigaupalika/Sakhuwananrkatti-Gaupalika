/**
 * Sakhuwanankarkatti Rural Municipality Data Engine
 * Enforces role-based data filtering, internal-note isolation,
 * confidential identity masking, audit logging, and safe CSV export.
 */

import {
  Complaint,
  ComplaintMessage,
  Appointment,
  AuditLog,
  UserRole,
  ComplaintStatus,
  ComplaintCategory,
} from '../types';
import { generateReferenceNumber, generateAppointmentRef } from './nepalTime';
import { PWANotificationService } from './pwaNotifications';

const COMPLAINTS_KEY = 'skk_pilot_complaints_v1';
const MESSAGES_KEY = 'skk_pilot_messages_v1';
const APPOINTMENTS_KEY = 'skk_pilot_appointments_v1';
const AUDIT_LOGS_KEY = 'skk_pilot_audit_logs_v1';

// Seed Initial Fictional Demonstration Data
const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: 'c1',
    referenceNumber: 'SKK-2026-7K4M9Q2X',
    title: 'सखुवा बजारदेखि वडा नं २ सम्मको मुख्य सडक हिलाम्मे भई आवागमन ठप्प',
    category: 'roads_infrastructure',
    wardNumber: 2,
    landmark: 'सखुवा बजार चोक, कटहा नहर पुल नजिक',
    description: 'वर्षाका कारण सखुवा बजारबाट वडा नं २ जोड्ने मुख्य सडकमा ठूला खाल्डाखुल्डी परेका छन् र हिलाम्मे भएर अटो र एम्बुलेन्स समेत गुड्न सकेका छैनन्। तत्काल ग्राभेलिङ गर्न अनुरोध छ।',
    preferredReplyLanguage: 'ne',
    contactMethod: 'phone',
    citizenName: 'रमेश कुमार यादव',
    citizenPhone: '98428XXXXX',
    citizenEmail: 'ramesh.y@example.com',
    isConfidentialIdentity: false,
    isChairpersonAttentionRequested: true,
    isConflictOfInterest: false,
    status: 'In progress',
    assignedDepartment: 'पूर्वाधार विकास तथा प्राविधिक शाखा',
    assignedWard: 2,
    assignedOfficerName: 'इन्जिनियर विजय कर्ण',
    attachments: [
      {
        id: 'att-1',
        name: 'road_damage_bazaar.jpg',
        sizeBytes: 1240000,
        mimeType: 'image/jpeg',
        quarantineStatus: 'safe',
        uploadedAt: '2026-10-25T04:30:00Z',
      },
    ],
    statusHistory: [
      {
        status: 'Submitted',
        changedByRole: 'citizen',
        changedByName: 'रमेश कुमार यादव',
        timestamp: '2026-10-25T04:30:00Z',
      },
      {
        status: 'Under review',
        changedByRole: 'intake_officer',
        changedByName: 'दर्ता अधिकृत (सुनिता महतो)',
        reason: 'प्रारम्भिक अध्ययन सम्पन्न, स्थलगत नापजाँच आवश्यक',
        timestamp: '2026-10-25T06:00:00Z',
      },
      {
        status: 'Assigned',
        changedByRole: 'intake_officer',
        changedByName: 'दर्ता अधिकृत (सुनिता महतो)',
        reason: 'पूर्वाधार शाखा र वडा नं २ का प्राविधिकलाई खटाइयो',
        timestamp: '2026-10-25T07:15:00Z',
      },
      {
        status: 'In progress',
        changedByRole: 'ward_officer',
        changedByName: 'इन्जिनियर विजय कर्ण',
        reason: 'फिल्ड सर्भे सम्पन्न भई ग्राभेलिङका लागि लागत अनुमान तयार हुँदैछ',
        timestamp: '2026-10-26T03:00:00Z',
      },
    ],
    createdAt: '2026-10-25T04:30:00Z',
    updatedAt: '2026-10-26T03:00:00Z',
    slaTargetDays: 7,
  },
  {
    id: 'c2',
    referenceNumber: 'SKK-2026-3N8P2R5Y',
    title: 'वडा नं ४ स्थित स्वास्थ्य चौकीमा आधारभूत औषधिको अभाव',
    category: 'health_services',
    wardNumber: 4,
    landmark: 'वडा नं ४ स्वास्थ्य चौकी परिसर, मौवाही',
    description: 'स्वास्थ्य चौकीमा सरकारले निःशुल्क वितरण गर्ने सिटामोल, जीवनजल, र रक्तचापका आधारभूत औषधिहरू विगत २ हप्तादेखि सकिएको छ। बिरामीहरू निजी मेडिकलमा जान बाध्य छन्।',
    preferredReplyLanguage: 'ne',
    contactMethod: 'phone',
    citizenName: 'सुमन कुमारी राउत',
    citizenPhone: '98045XXXXX',
    isConfidentialIdentity: true, // Confidential identity!
    isChairpersonAttentionRequested: true,
    isConflictOfInterest: false,
    status: 'Assigned',
    assignedDepartment: 'स्वास्थ्य शाखा',
    assignedWard: 4,
    assignedOfficerName: 'स्वास्थ्य शाखा प्रमुख (डा. अरविन्द मण्डल)',
    attachments: [],
    statusHistory: [
      {
        status: 'Submitted',
        changedByRole: 'citizen',
        changedByName: 'गोपनीय नागरिक',
        timestamp: '2026-10-26T02:10:00Z',
      },
      {
        status: 'Assigned',
        changedByRole: 'intake_officer',
        changedByName: 'दर्ता अधिकृत',
        reason: 'स्वास्थ्य शाखालाई केन्द्रीय औषधि आपूर्तिका लागि तत्काल जिम्मा दिइयो',
        timestamp: '2026-10-26T05:30:00Z',
      },
    ],
    createdAt: '2026-10-26T02:10:00Z',
    updatedAt: '2026-10-26T05:30:00Z',
    slaTargetDays: 3,
  },
  {
    id: 'c3',
    referenceNumber: 'SKK-2026-9M2K6W1L',
    title: 'वडा नं १ मा डिप बोरिङ खानेपानी योजना बन्द भएकोबारे',
    category: 'drinking_water_sanitation',
    wardNumber: 1,
    landmark: 'टोल विकास संस्था भवन पछाडि',
    description: 'खानेपानीको मोटर जलेका कारण ५० भन्दा बढी घरधुरीले पिउने पानी पाएका छैनन्। उपभोक्ता समितिले बजेट नभएको बताएकाले गाउँपालिकाबाट प्राविधिक टोली खटाउन अनुरोध छ।',
    preferredReplyLanguage: 'mai',
    contactMethod: 'phone',
    citizenName: 'हरिनन्दन महतो',
    citizenPhone: '98156XXXXX',
    isConfidentialIdentity: false,
    isChairpersonAttentionRequested: false,
    isConflictOfInterest: false,
    status: 'Resolved',
    assignedDepartment: 'खानेपानी तथा सरसफाइ शाखा',
    assignedWard: 1,
    assignedOfficerName: 'सुभाष ठाकुर',
    attachments: [],
    statusHistory: [
      {
        status: 'Submitted',
        changedByRole: 'citizen',
        changedByName: 'हरिनन्दन महतो',
        timestamp: '2026-10-20T08:00:00Z',
      },
      {
        status: 'Assigned',
        changedByRole: 'intake_officer',
        changedByName: 'दर्ता अधिकृत',
        timestamp: '2026-10-20T10:00:00Z',
      },
      {
        status: 'Resolved',
        changedByRole: 'ward_officer',
        changedByName: 'सुभाष ठाकुर',
        reason: 'नयाँ सबमर्सिबल मोटर जडान भई खानेपानी आपूर्ति पुनः सञ्चालन भएको छ।',
        timestamp: '2026-10-24T09:00:00Z',
      },
    ],
    createdAt: '2026-10-20T08:00:00Z',
    updatedAt: '2026-10-24T09:00:00Z',
    slaTargetDays: 5,
  },
];

const INITIAL_MESSAGES: ComplaintMessage[] = [
  {
    id: 'm1',
    complaintId: 'c1',
    senderRole: 'intake_officer',
    senderName: 'दर्ता अधिकृत (सुनिता महतो)',
    content: 'तपाईंको गुनासो दर्ता भएको छ। स्थलगत निरीक्षणका लागि प्राविधिक शाखा र वडा नं २ का इन्जिनियरलाई खटाइएको छ।',
    createdAt: '2026-10-25T07:20:00Z',
    isInternalNote: false, // Citizen visible!
  },
  {
    id: 'm2',
    complaintId: 'c1',
    senderRole: 'ward_officer',
    senderName: 'इन्जिनियर विजय कर्ण',
    content: 'आन्तरिक टिपोट: फिल्डमा गएर हेर्दा करिब ३०० मिटर सडक ग्राभेल बगाएको पाइयो। चालू मर्मत सम्भार कोषबाट रु १,५०,००० को लागत अनुमान अध्यक्षज्यू समक्ष स्वीकृतिका लागि पेश गरिएको छ।',
    createdAt: '2026-10-25T11:45:00Z',
    isInternalNote: true, // INTERNAL STAFF ONLY! NEVER EXPOSED TO CITIZEN!
  },
  {
    id: 'm3',
    complaintId: 'c1',
    senderRole: 'chairperson',
    senderName: 'गाउँपालिका अध्यक्ष',
    content: 'आन्तरिक निर्देशन: यो सडक बजारको मुख्य व्यापारिक मार्ग भएकाले भोलि बिहानै ग्राभेल खसालेर रोलिङ गराउने प्रबन्ध मिलाउनुहोस्।',
    createdAt: '2026-10-25T13:00:00Z',
    isInternalNote: true, // Internal staff only!
  },
  {
    id: 'm4',
    complaintId: 'c1',
    senderRole: 'ward_officer',
    senderName: 'इन्जिनियर विजय कर्ण',
    content: 'आदरणीय नागरिकज्यू, सडक मर्मतका लागि प्राविधिक लागत स्वीकृत भइसकेको छ र भोलिदेखि ग्राभेल बिछ्याउने कार्य सुरु गरिनेछ।',
    createdAt: '2026-10-26T03:05:00Z',
    isInternalNote: false, // Citizen visible!
  },
  {
    id: 'm5',
    complaintId: 'c3',
    senderRole: 'ward_officer',
    senderName: 'सुभाष ठाकुर',
    content: 'खानेपानी शाखाको प्राविधिक टोलीले मोटर प्रतिस्थापन गरी धाराहरूमा नियमित पानी वितरण सुरु गरेको जानकारी गराइन्छ।',
    createdAt: '2026-10-24T09:05:00Z',
    isInternalNote: false, // Citizen visible!
  },
];

const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    referenceNumber: 'APT-2026-9K3L',
    citizenName: 'दीपेन्द्र प्रसाद साह',
    citizenPhone: '98528XXXXX',
    citizenWard: 3,
    requestedDate: '2026-10-28',
    requestedTimeSlot: '11:30 AM',
    purpose: 'वडा नं ३ मा नवनिर्मित कृषि हाटबजार सञ्चालन तथा किसान सहकारी व्यवस्थापन सम्बन्धमा छलफल',
    relatedComplaintRef: '',
    status: 'Approved',
    secretariatNotes: 'अध्यक्षज्यूको कार्यतालिका अनुसार समय स्वीकृत गरिएको छ।',
    reviewedBy: 'सचिवालय अधिकृत',
    createdAt: '2026-10-26T06:00:00Z',
    updatedAt: '2026-10-26T08:30:00Z',
  },
  {
    id: 'apt-2',
    referenceNumber: 'APT-2026-4F8M',
    citizenName: 'उषा देवी मण्डल',
    citizenPhone: '98176XXXXX',
    citizenWard: 5,
    requestedDate: '2026-10-29',
    requestedTimeSlot: '02:00 PM',
    purpose: 'दलित तथा विपन्न समुदायका बालबालिकालाई छात्रवृत्ति तथा पोशाक वितरणमा भएको ढिलाइबारे ध्यानाकर्षण',
    relatedComplaintRef: 'SKK-2026-3N8P2R5Y',
    status: 'Requested',
    createdAt: '2026-10-27T01:30:00Z',
    updatedAt: '2026-10-27T01:30:00Z',
  },
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    actorRole: 'citizen',
    actorName: 'Citizen System Submission',
    action: 'CREATE_COMPLAINT',
    targetType: 'complaint',
    targetId: 'SKK-2026-7K4M9Q2X',
    outcome: 'SUCCESS',
    details: 'New grievance submitted under Category: roads_infrastructure, Ward 2',
    timestamp: '2026-10-25T04:30:00Z',
    ipSnippet: '103.167.*.*',
  },
  {
    id: 'aud-2',
    actorRole: 'intake_officer',
    actorName: 'सुनिता महतो (Intake Officer)',
    action: 'ASSIGN_COMPLAINT',
    targetType: 'complaint',
    targetId: 'SKK-2026-7K4M9Q2X',
    outcome: 'SUCCESS',
    details: 'Assigned case to Infrastructure Department and Ward 2 Officer',
    timestamp: '2026-10-25T07:15:00Z',
  },
  {
    id: 'aud-3',
    actorRole: 'chairperson',
    actorName: 'अध्यक्ष (Chairperson Office)',
    action: 'INTERNAL_NOTE_POSTED',
    targetType: 'complaint',
    targetId: 'SKK-2026-7K4M9Q2X',
    outcome: 'SUCCESS',
    details: 'Executive directive added to case file',
    timestamp: '2026-10-25T13:00:00Z',
  },
];

// Helper to access LocalStorage safely
export class LocalMunicipalityDB {
  static getComplaints(): Complaint[] {
    try {
      const data = localStorage.getItem(COMPLAINTS_KEY);
      if (!data) {
        localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(INITIAL_COMPLAINTS));
        return INITIAL_COMPLAINTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_COMPLAINTS;
    }
  }

  static saveComplaints(complaints: Complaint[]) {
    try {
      localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(complaints));
    } catch (e) {
      console.error('Failed to save complaints to storage', e);
    }
  }

  static getMessages(): ComplaintMessage[] {
    try {
      const data = localStorage.getItem(MESSAGES_KEY);
      if (!data) {
        localStorage.setItem(MESSAGES_KEY, JSON.stringify(INITIAL_MESSAGES));
        return INITIAL_MESSAGES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_MESSAGES;
    }
  }

  static saveMessages(messages: ComplaintMessage[]) {
    try {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save messages to storage', e);
    }
  }

  static getAppointments(): Appointment[] {
    try {
      const data = localStorage.getItem(APPOINTMENTS_KEY);
      if (!data) {
        localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(INITIAL_APPOINTMENTS));
        return INITIAL_APPOINTMENTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_APPOINTMENTS;
    }
  }

  static saveAppointments(apts: Appointment[]) {
    try {
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(apts));
    } catch (e) {
      console.error('Failed to save appointments', e);
    }
  }

  static getAuditLogs(): AuditLog[] {
    try {
      const data = localStorage.getItem(AUDIT_LOGS_KEY);
      if (!data) {
        localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
        return INITIAL_AUDIT_LOGS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  }

  static appendAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    try {
      const logs = this.getAuditLogs();
      const newLog: AuditLog = {
        ...entry,
        id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
      };
      logs.unshift(newLog);
      localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs.slice(0, 200))); // keep 200 latest
    } catch (e) {
      console.error('Failed to append audit log', e);
    }
  }

  /**
   * Scoped Complaints View based on User Role (Least Privilege)
   */
  static getScopedComplaints(role: UserRole, activeWard?: number): Complaint[] {
    const all = this.getComplaints();

    return all.map((c) => {
      // Create a cloned safe representation
      const safeComplaint: Complaint = { ...c };

      // Role isolation:
      // If Confidential Identity is requested, redact citizen phone and name from standard Ward Officers
      if (c.isConfidentialIdentity && (role === 'ward_officer' || role === 'auditor')) {
        safeComplaint.citizenName = 'गोपनीय नागरिक (Identity Protected)';
        safeComplaint.citizenPhone = '********* (Redacted)';
        safeComplaint.citizenEmail = undefined;
      }

      return safeComplaint;
    }).filter((c) => {
      // Scoping: Ward officer only sees complaints in their assigned ward
      if (role === 'ward_officer' && activeWard) {
        return c.wardNumber === activeWard;
      }
      // Chairperson sees high-priority, overdue, or all overview
      return true;
    });
  }

  /**
   * Scoped Messages: STRICT isolation between internal notes vs citizen replies
   */
  static getScopedMessages(complaintId: string, role: UserRole): ComplaintMessage[] {
    const all = this.getMessages().filter((m) => m.complaintId === complaintId);
    if (role === 'citizen') {
      // Citizens NEVER receive internal notes!
      return all.filter((m) => !m.isInternalNote);
    }
    // Staff roles can see both public replies and internal notes
    return all;
  }

  /**
   * Submit new Complaint
   */
  static submitComplaint(data: {
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
    attachments: Array<{ name: string; sizeBytes: number; mimeType: string; dataUrl?: string }>;
  }): Complaint {
    const referenceNumber = generateReferenceNumber();
    const nowIso = new Date().toISOString();

    const initialHistory = [
      {
        status: 'Submitted' as ComplaintStatus,
        changedByRole: 'citizen' as UserRole,
        changedByName: data.citizenName || 'नागरिक (Grievant)',
        timestamp: nowIso,
      },
    ];

    const safeAttachments = data.attachments.map((att, idx) => ({
      id: `att-${Date.now()}-${idx}`,
      name: att.name,
      sizeBytes: att.sizeBytes,
      mimeType: att.mimeType,
      quarantineStatus: 'safe' as const,
      uploadedAt: nowIso,
      dataUrl: att.dataUrl,
    }));

    const newComplaint: Complaint = {
      id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      referenceNumber,
      title: data.title,
      category: data.category,
      wardNumber: data.wardNumber,
      landmark: data.landmark,
      description: data.description,
      preferredReplyLanguage: data.preferredReplyLanguage,
      contactMethod: data.contactMethod,
      citizenName: data.citizenName || 'नागरिक',
      citizenPhone: data.citizenPhone || '',
      citizenEmail: data.citizenEmail || '',
      isConfidentialIdentity: data.isConfidentialIdentity,
      isChairpersonAttentionRequested: data.isChairpersonAttentionRequested,
      isConflictOfInterest: data.isConflictOfInterest,
      status: 'Submitted',
      attachments: safeAttachments,
      statusHistory: initialHistory,
      createdAt: nowIso,
      updatedAt: nowIso,
      slaTargetDays: data.isChairpersonAttentionRequested ? 4 : 7,
    };

    const current = this.getComplaints();
    current.unshift(newComplaint);
    this.saveComplaints(current);

    this.appendAuditLog({
      actorRole: 'citizen',
      actorName: data.isConfidentialIdentity ? 'Confidential Grievant' : (data.citizenName || 'Citizen'),
      action: 'SUBMIT_COMPLAINT',
      targetType: 'complaint',
      targetId: referenceNumber,
      outcome: 'SUCCESS',
      details: `New grievance submitted for Ward ${data.wardNumber}, Category: ${data.category}`,
    });

    return newComplaint;
  }

  /**
   * Update Complaint Status with auditable transition
   */
  static updateComplaintStatus(
    complaintId: string,
    newStatus: ComplaintStatus,
    reason: string,
    actorRole: UserRole,
    actorName: string
  ): boolean {
    const complaints = this.getComplaints();
    const index = complaints.findIndex((c) => c.id === complaintId);
    if (index === -1) return false;

    const c = complaints[index];
    const nowIso = new Date().toISOString();

    c.status = newStatus;
    c.updatedAt = nowIso;
    c.statusHistory.push({
      status: newStatus,
      changedByRole: actorRole,
      changedByName: actorName,
      reason,
      timestamp: nowIso,
    });

    complaints[index] = c;
    this.saveComplaints(complaints);

    // Trigger PWA Service Worker 'Status Updated' Notification
    try {
      if (typeof window !== 'undefined') {
        PWANotificationService.notifyGrievanceStatusChange({
          referenceNumber: c.referenceNumber,
          title: c.title,
          newStatus,
          reason,
        });
      }
    } catch (e) {
      console.warn('Failed to dispatch PWA status notification', e);
    }

    this.appendAuditLog({
      actorRole,
      actorName,
      action: 'TRANSITION_STATUS',
      targetType: 'complaint',
      targetId: c.referenceNumber,
      outcome: 'SUCCESS',
      details: `Transitioned status to ${newStatus}. Reason: ${reason || 'N/A'}`,
    });

    return true;
  }

  /**
   * Assign Complaint to Ward / Department
   */
  static assignComplaint(
    complaintId: string,
    department: string,
    wardNumber: number,
    officerName: string,
    actorRole: UserRole,
    actorName: string
  ): boolean {
    const complaints = this.getComplaints();
    const index = complaints.findIndex((c) => c.id === complaintId);
    if (index === -1) return false;

    const c = complaints[index];
    const nowIso = new Date().toISOString();

    c.assignedDepartment = department;
    c.assignedWard = wardNumber;
    c.assignedOfficerName = officerName;
    c.status = 'Assigned';
    c.updatedAt = nowIso;
    c.statusHistory.push({
      status: 'Assigned',
      changedByRole: actorRole,
      changedByName: actorName,
      reason: `जिम्मेवारी तोकियो: ${department} (वडा नं ${wardNumber}) - अधिकृत: ${officerName}`,
      timestamp: nowIso,
    });

    complaints[index] = c;
    this.saveComplaints(complaints);

    this.appendAuditLog({
      actorRole,
      actorName,
      action: 'ASSIGN_COMPLAINT',
      targetType: 'complaint',
      targetId: c.referenceNumber,
      outcome: 'SUCCESS',
      details: `Assigned to ${department}, Ward ${wardNumber}`,
    });

    return true;
  }

  /**
   * Add message (citizen public reply or internal staff note)
   */
  static addMessage(
    complaintId: string,
    senderRole: UserRole,
    senderName: string,
    content: string,
    isInternalNote: boolean
  ): ComplaintMessage {
    const newMessage: ComplaintMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      complaintId,
      senderRole,
      senderName,
      content,
      createdAt: new Date().toISOString(),
      isInternalNote,
    };

    const messages = this.getMessages();
    messages.push(newMessage);
    this.saveMessages(messages);

    const complaints = this.getComplaints();
    const c = complaints.find((x) => x.id === complaintId);

    this.appendAuditLog({
      actorRole: senderRole,
      actorName: senderName,
      action: isInternalNote ? 'POST_INTERNAL_NOTE' : 'POST_PUBLIC_REPLY',
      targetType: 'complaint',
      targetId: c ? c.referenceNumber : complaintId,
      outcome: 'SUCCESS',
      details: isInternalNote
        ? 'Internal investigation note added (isolated from citizen)'
        : 'Official response dispatched to citizen',
    });

    return newMessage;
  }

  /**
   * Book Appointment with Chairperson
   */
  static bookAppointment(data: {
    citizenName: string;
    citizenPhone: string;
    citizenWard: number;
    requestedDate: string;
    requestedTimeSlot: string;
    purpose: string;
    relatedComplaintRef?: string;
  }): Appointment {
    const referenceNumber = generateAppointmentRef();
    const nowIso = new Date().toISOString();

    const newApt: Appointment = {
      id: `apt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      referenceNumber,
      citizenName: data.citizenName,
      citizenPhone: data.citizenPhone,
      citizenWard: data.citizenWard,
      requestedDate: data.requestedDate,
      requestedTimeSlot: data.requestedTimeSlot,
      purpose: data.purpose,
      relatedComplaintRef: data.relatedComplaintRef,
      status: 'Requested',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const apts = this.getAppointments();
    apts.unshift(newApt);
    this.saveAppointments(apts);

    this.appendAuditLog({
      actorRole: 'citizen',
      actorName: data.citizenName,
      action: 'REQUEST_APPOINTMENT',
      targetType: 'appointment',
      targetId: referenceNumber,
      outcome: 'SUCCESS',
      details: `Appointment requested with Chairperson for date ${data.requestedDate} (${data.requestedTimeSlot})`,
    });

    return newApt;
  }

  /**
   * Update Appointment Status (Secretariat / Chairperson)
   */
  static updateAppointmentStatus(
    aptId: string,
    newStatus: 'Approved' | 'Declined' | 'Completed' | 'Cancelled',
    secretariatNotes: string,
    reviewerName: string,
    actorRole: UserRole
  ): boolean {
    const apts = this.getAppointments();
    const idx = apts.findIndex((a) => a.id === aptId);
    if (idx === -1) return false;

    const apt = apts[idx];
    apt.status = newStatus;
    apt.secretariatNotes = secretariatNotes;
    apt.reviewedBy = reviewerName;
    apt.updatedAt = new Date().toISOString();

    apts[idx] = apt;
    this.saveAppointments(apts);

    this.appendAuditLog({
      actorRole,
      actorName: reviewerName,
      action: `APPOINTMENT_${newStatus.toUpperCase()}`,
      targetType: 'appointment',
      targetId: apt.referenceNumber,
      outcome: 'SUCCESS',
      details: `Status set to ${newStatus}. Notes: ${secretariatNotes || 'None'}`,
    });

    return true;
  }

  /**
   * Safe CSV Formula Injection Neutralization
   * Prepends a single quote if string starts with dangerous characters =, +, -, @, \t, \r
   */
  static sanitizeForCSV(field: unknown): string {
    if (field === null || field === undefined) return '';
    let str = String(field);
    const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
    if (dangerousPrefixes.some((p) => str.startsWith(p))) {
      str = `'${str}`;
    }
    // Escape quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  /**
   * Generate sanitized CSV export of complaints for authorized officials
   */
  static generateComplaintsCSV(complaints: Complaint[]): string {
    const headers = [
      'Reference Number',
      'Ward',
      'Category',
      'Title',
      'Status',
      'Chairperson Attention',
      'Conflict Case',
      'Assigned Dept',
      'Assigned Officer',
      'Submission Date (UTC)',
      'Last Update (UTC)',
    ];

    const rows = complaints.map((c) => [
      this.sanitizeForCSV(c.referenceNumber),
      this.sanitizeForCSV(c.wardNumber),
      this.sanitizeForCSV(c.category),
      this.sanitizeForCSV(c.title),
      this.sanitizeForCSV(c.status),
      this.sanitizeForCSV(c.isChairpersonAttentionRequested ? 'YES' : 'NO'),
      this.sanitizeForCSV(c.isConflictOfInterest ? 'YES' : 'NO'),
      this.sanitizeForCSV(c.assignedDepartment || 'Unassigned'),
      this.sanitizeForCSV(c.assignedOfficerName || 'None'),
      this.sanitizeForCSV(c.createdAt),
      this.sanitizeForCSV(c.updatedAt),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return csvContent;
  }
}
