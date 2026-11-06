import React, { useState, useEffect } from 'react';
import {
  Complaint,
  ComplaintStatus,
  ComplaintCategory,
  Language,
  UserRole,
  ComplaintMessage,
  AuditLog,
  Attachment,
} from '../types';
import { LocalMunicipalityDB } from '../utils/storage';
import { MunicipalityAPI } from '../utils/api';
import { formatNepalDateTime } from '../utils/nepalTime';
import { translations } from '../i18n/translations';
import { generateReceiptPDF } from '../utils/pdfGenerator';
import { CitizenSubmitView } from './CitizenSubmitView';
import { ReceiptModal } from './ReceiptModal';
import { QRScannerModal } from './QRScannerModal';
import {
  Briefcase,
  Filter,
  Download,
  Shield,
  Star,
  AlertTriangle,
  Lock,
  MessageSquare,
  Clock,
  CheckCircle,
  FileText,
  UserCheck,
  Send,
  Eye,
  History,
  FileDown,
  UserPlus,
  RefreshCw,
  Printer,
  Image as ImageIcon,
  ZoomIn,
  X,
  Camera,
  QrCode,
} from 'lucide-react';

interface StaffDashboardViewProps {
  currentRole: UserRole;
  lang: Language;
  activeWard: number;
}

export const StaffDashboardView: React.FC<StaffDashboardViewProps> = ({
  currentRole,
  lang,
  activeWard,
}) => {
  const t = translations[lang] || translations.ne;

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [messages, setMessages] = useState<ComplaintMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Navigation mode within staff panel
  const [staffMode, setStaffMode] = useState<'cases' | 'new_intake'>('cases');

  // Filters
  const [filterWard, setFilterWard] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Actions on Selected Complaint
  const [statusUpdateChoice, setStatusUpdateChoice] = useState<ComplaintStatus>('In progress');
  const [statusReason, setStatusReason] = useState('');
  const [newDepartment, setNewDepartment] = useState('पूर्वाधार विकास तथा प्राविधिक शाखा');
  const [newWard, setNewWard] = useState<number>(1);
  const [newOfficerName, setNewOfficerName] = useState('');

  // Message posting
  const [internalNoteText, setInternalNoteText] = useState('');
  const [publicReplyText, setPublicReplyText] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'replies' | 'audit'>('details');

  // PDF modal & downloading state
  const [receiptComplaint, setReceiptComplaint] = useState<Complaint | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Photo Lightbox modal state
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showStaffScanner, setShowStaffScanner] = useState(false);

  const handleStaffScanSuccess = (ref: string) => {
    const query = ref.trim().toUpperCase();
    const found = complaints.find((c) => c.referenceNumber.toUpperCase() === query);
    if (found) {
      setSelectedComplaint(found);
      setStaffMode('cases');
      setActionSuccessMsg(`रसिद पहिचान भयो: ${found.referenceNumber} (${found.title})`);
    } else {
      setActionSuccessMsg(`स्क्यान गरिएको दर्ता नं ${query} प्रणालीमा भेटिएन।`);
    }
    setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  const refreshData = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      // Fetch latest complaints from shared backend
      const serverComplaints = await MunicipalityAPI.getComplaints();
      
      // Filter based on role permissions
      const scoped = serverComplaints.map((c) => {
        const safeComplaint: Complaint = { ...c };
        if (c.isConfidentialIdentity && (currentRole === 'ward_officer' || currentRole === 'auditor')) {
          safeComplaint.citizenName = 'गोपनीय नागरिक (Identity Protected)';
          safeComplaint.citizenPhone = '********* (Redacted)';
          safeComplaint.citizenEmail = undefined;
        }
        return safeComplaint;
      }).filter((c) => {
        if (currentRole === 'ward_officer' && activeWard) {
          return c.wardNumber === activeWard;
        }
        return true;
      });

      setComplaints(scoped);
      setAuditLogs(LocalMunicipalityDB.getAuditLogs());

      if (selectedComplaint) {
        const refreshedSelected = scoped.find((c) => c.id === selectedComplaint.id);
        if (refreshedSelected) {
          setSelectedComplaint(refreshedSelected);
          const msgs = await MunicipalityAPI.getMessages(refreshedSelected.id, currentRole);
          setMessages(msgs);
        } else if (scoped.length > 0) {
          setSelectedComplaint(scoped[0]);
          const msgs = await MunicipalityAPI.getMessages(scoped[0].id, currentRole);
          setMessages(msgs);
        } else {
          setSelectedComplaint(null);
          setMessages([]);
        }
      } else if (scoped.length > 0) {
        setSelectedComplaint(scoped[0]);
        const msgs = await MunicipalityAPI.getMessages(scoped[0].id, currentRole);
        setMessages(msgs);
      }
    } catch (e) {
      console.error('Error refreshing staff dashboard data', e);
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData(true);
    // Real-time live polling so complaints and photos from public users show up immediately
    const pollTimer = setInterval(() => {
      refreshData(false);
    }, 4000);

    return () => clearInterval(pollTimer);
  }, [currentRole, activeWard]);

  const handleSelectCase = async (c: Complaint) => {
    setSelectedComplaint(c);
    setStatusUpdateChoice(c.status);
    setStatusReason('');
    const msgs = await MunicipalityAPI.getMessages(c.id, currentRole);
    setMessages(msgs);
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    const actorName =
      currentRole === 'chairperson'
        ? 'गाउँपालिका अध्यक्ष'
        : currentRole === 'intake_officer'
        ? 'दर्ता तथा गुनासो अधिकृत'
        : currentRole === 'ward_officer'
        ? `वडा अधिकृत (वडा ${activeWard})`
        : 'प्रशासक (Admin)';

    await MunicipalityAPI.updateStatus(
      selectedComplaint.id,
      statusUpdateChoice,
      statusReason.trim(),
      currentRole,
      actorName
    );

    setStatusReason('');
    setActionSuccessMsg(`अवस्था सफलतापूर्वक "${statusUpdateChoice}" मा परिवर्तन गरियो।`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
    await refreshData();
  };

  const handleAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    await MunicipalityAPI.assignComplaint(
      selectedComplaint.id,
      newDepartment,
      newWard,
      newOfficerName || 'सम्बन्धित शाखा प्राविधिक',
      currentRole,
      'दर्ता अधिकृत'
    );

    setActionSuccessMsg(`गुनासो ${newDepartment} (वडा नं. ${newWard}) लाई जिम्मेवारी तोकियो।`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
    await refreshData();
  };

  const handlePostInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !internalNoteText.trim()) return;

    await MunicipalityAPI.addMessage(
      selectedComplaint.id,
      currentRole,
      currentRole === 'chairperson' ? 'गाउँपालिका अध्यक्ष' : currentRole === 'admin' ? 'प्रशासक' : 'शाखा अधिकृत',
      internalNoteText.trim(),
      true // strictly internal note!
    );

    setInternalNoteText('');
    setActionSuccessMsg('आन्तरिक टिपोट सुरक्षित गरियो (नागरिकलाई देखाइँदैन)।');
    setTimeout(() => setActionSuccessMsg(null), 3500);
    await refreshData();
  };

  const handlePostPublicReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !publicReplyText.trim()) return;

    await MunicipalityAPI.addMessage(
      selectedComplaint.id,
      currentRole,
      currentRole === 'chairperson' ? 'गाउँपालिका अध्यक्ष' : 'सम्बन्धित अधिकृत',
      publicReplyText.trim(),
      false // Citizen visible reply
    );

    setPublicReplyText('');
    setActionSuccessMsg('आधिकारिक जवाफ नागरिकलाई पठाइयो।');
    setTimeout(() => setActionSuccessMsg(null), 3500);
    await refreshData();
  };

  const handleDownloadSinglePDF = async (complaintToExport: Complaint) => {
    setIsGeneratingPdf(true);
    try {
      await generateReceiptPDF(complaintToExport, lang);
    } catch (err) {
      console.error('Error generating PDF', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportCSV = () => {
    const csvData = LocalMunicipalityDB.generateComplaintsCSV(complaints);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SKK_Complaints_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    LocalMunicipalityDB.appendAuditLog({
      actorRole: currentRole,
      actorName: 'Authorized Staff',
      action: 'EXPORT_COMPLAINTS_CSV',
      targetType: 'export',
      targetId: 'BULK_CSV',
      outcome: 'SUCCESS',
      details: `Sanitized CSV exported with ${complaints.length} records. Injection protection enforced.`,
    });
  };

  // Filter complaints
  const filteredComplaints = complaints.filter((c) => {
    if (filterWard !== 'all' && c.wardNumber !== Number(filterWard)) return false;
    if (filterCategory !== 'all' && c.category !== filterCategory) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    return true;
  });

  const internalNotes = messages.filter((m) => m.isInternalNote);
  const publicReplies = messages.filter((m) => !m.isInternalNote);

  return (
    <div className="max-w-6xl mx-auto py-4 px-3 sm:px-6 space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-blue-50 text-[#163A63] rounded-xl border border-blue-200">
              <Briefcase className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                सखुवानान्कारकट्टी गाउँपालिका — अधिकृत तथा कर्मचारी कार्यक्षेत्र
              </h2>
              <p className="text-xs text-slate-500">
                सक्रिय भूमिका: <strong className="text-[#163A63] uppercase">{currentRole}</strong>
                {currentRole === 'ward_officer' && ` (सक्रिय वडा: ${activeWard})`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle between Case Management and In-Person Intake Desk */}
          <button
            onClick={() => setStaffMode(staffMode === 'cases' ? 'new_intake' : 'cases')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs ${
              staffMode === 'new_intake'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>
              {staffMode === 'new_intake' ? 'गुनासो सूचीमा फर्कनुहोस्' : 'नयाँ गुनासो दर्ता (नागरिक सहायता डेस्क)'}
            </span>
          </button>

          {/* Scan Citizen Receipt QR Code */}
          <button
            onClick={() => setShowStaffScanner(true)}
            className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs"
            title="नागरिकको रसिद वा फाराम QR स्क्यान गर्नुहोस्"
          >
            <QrCode className="w-4 h-4 text-teal-200" />
            <span>रसिद QR स्क्यान</span>
          </button>

          <button
            onClick={() => refreshData(true)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-200 transition"
            title="Export sanitized CSV with formula injection neutralization"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>{t.btnExportCsv}</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Mode A: In-Person Citizen Intake Desk */}
      {staffMode === 'new_intake' ? (
        <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200">
          <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <span>कार्यालयमा उपस्थित नागरिकको नयाँ गुनासो दर्ता</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                फाराम भरेपछि स्वतः आधिकारिक दर्ता नम्बर र <strong>PDF भरपाई</strong> प्राप्त हुनेछ।
              </p>
            </div>
            <button
              onClick={() => setStaffMode('cases')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg"
            >
              रद्द गर्नुहोस्
            </button>
          </div>

          <CitizenSubmitView
            lang={lang}
            onSubmitted={(newComp) => {
              refreshData();
              setReceiptComplaint(newComp);
              setSelectedComplaint(newComp);
              setStaffMode('cases');
            }}
          />
        </div>
      ) : (
        /* Mode B: Full Grievance Management Center */
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-xs font-semibold block">{t.totalCases}</span>
              <span className="text-2xl font-black text-[#163A63]">{complaints.length}</span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
              <span className="text-amber-800 text-xs font-semibold block">{t.pendingCases}</span>
              <span className="text-2xl font-black text-amber-700">
                {complaints.filter((c) => c.status === 'Submitted' || c.status === 'Under review').length}
              </span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-blue-200 bg-blue-50/30 shadow-xs">
              <span className="text-blue-800 text-xs font-semibold block">{t.inProgressCases}</span>
              <span className="text-2xl font-black text-blue-700">
                {complaints.filter((c) => c.status === 'In progress' || c.status === 'Assigned').length}
              </span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
              <span className="text-emerald-800 text-xs font-semibold block">{t.resolvedCases}</span>
              <span className="text-2xl font-black text-emerald-700">
                {complaints.filter((c) => c.status === 'Resolved').length}
              </span>
            </div>
          </div>

          {/* Main Layout: List & Case Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left List (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              {/* Filters */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>फिल्टर (Filters)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <select
                    value={filterWard}
                    onChange={(e) => setFilterWard(e.target.value)}
                    className="p-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="all">सबै वडा (1-5)</option>
                    {[1, 2, 3, 4, 5].map((w) => (
                      <option key={w} value={w}>
                        वडा नं. {w}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="all">सबै अवस्था</option>
                    <option value="Submitted">दर्ता भएको</option>
                    <option value="Assigned">तोकिएको</option>
                    <option value="In progress">कार्यान्वयनमा</option>
                    <option value="Resolved">समाधान भएको</option>
                  </select>
                </div>
              </div>

              {/* Cases List */}
              <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                {filteredComplaints.length === 0 ? (
                  <div className="p-8 bg-white rounded-2xl text-center text-xs text-slate-500 border border-slate-200">
                    कुनै गुनासो भेटिएन।
                  </div>
                ) : (
                  filteredComplaints.map((c) => {
                    const isSelected = selectedComplaint?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCase(c)}
                        className={`w-full text-left p-4 rounded-2xl border transition shadow-xs ${
                          isSelected
                            ? 'bg-blue-50/80 border-[#163A63] ring-1 ring-[#163A63]'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                          <span className="font-mono font-bold text-[#163A63]">
                            {c.referenceNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            वडा {c.wardNumber}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                          {c.title}
                        </h4>

                        <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                          <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-teal-50 text-teal-800 border border-teal-200">
                            {c.status}
                          </span>
                          {c.isChairpersonAttentionRequested && (
                            <span className="flex items-center gap-0.5 text-amber-600 font-bold" title="Chairperson Attention">
                              <Star className="w-3 h-3 fill-amber-500" />
                              अध्यक्ष
                            </span>
                          )}
                          {c.isConfidentialIdentity && (
                            <span className="flex items-center gap-0.5 text-purple-600 font-semibold" title="Confidential Identity">
                              <Shield className="w-3 h-3" />
                              गोप्य
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Detail Panel (7 cols) */}
            <div className="lg:col-span-7">
              {selectedComplaint ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Case Header */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-black text-[#163A63]">
                        {selectedComplaint.referenceNumber}
                      </span>

                      <div className="flex items-center gap-2">
                        {/* Download Official PDF Button */}
                        <button
                          onClick={() => handleDownloadSinglePDF(selectedComplaint)}
                          disabled={isGeneratingPdf}
                          className="px-3 py-1.5 bg-[#163A63] hover:bg-blue-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition"
                          title="Download Form PDF"
                        >
                          <FileDown className="w-3.5 h-3.5 text-teal-300" />
                          <span>{isGeneratingPdf ? 'PDF तयार हुँदै...' : 'फाराम PDF डाउनलोड'}</span>
                        </button>

                        <button
                          onClick={() => setReceiptComplaint(selectedComplaint)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200"
                          title="Print / View Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#163A63] text-white">
                          {selectedComplaint.status}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-2">
                      {selectedComplaint.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-2">
                      <span>वडा नं. {selectedComplaint.wardNumber}</span>
                      <span>•</span>
                      <span>स्थान: {selectedComplaint.landmark || 'सखुवानान्कारकट्टी'}</span>
                      <span>•</span>
                      <span>दर्ता मिति: {formatNepalDateTime(selectedComplaint.createdAt, lang)}</span>
                    </div>
                  </div>

                  {/* Sub-tabs: Details / Internal Notes / Citizen Replies / Audit */}
                  <div className="flex border-b border-slate-200 text-xs font-bold px-4 bg-slate-50 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setActiveTab('details')}
                      className={`py-3 px-3 border-b-2 transition shrink-0 ${
                        activeTab === 'details'
                          ? 'border-[#163A63] text-[#163A63]'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      विवरण तथा कार्य (Actions)
                    </button>
                    <button
                      onClick={() => setActiveTab('notes')}
                      className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                        activeTab === 'notes'
                          ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>आन्तरिक टिपोट ({internalNotes.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('replies')}
                      className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                        activeTab === 'replies'
                          ? 'border-teal-600 text-teal-900 bg-teal-50/50'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                      <span>नागरिक जवाफ ({publicReplies.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('audit')}
                      className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 shrink-0 ${
                        activeTab === 'audit'
                          ? 'border-indigo-600 text-indigo-900'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>अडिट लग</span>
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="p-5 space-y-5">
                    {activeTab === 'details' && (
                      <div className="space-y-5">
                        {/* Citizen Details (Respects Confidential Redaction) */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          <span className="font-bold text-slate-700 block mb-1">नागरिक सम्पर्क विवरण:</span>
                          <div className="grid grid-cols-2 gap-2 text-slate-800">
                            <div>
                              नाम: <strong>{selectedComplaint.citizenName || 'N/A'}</strong>
                            </div>
                            <div>
                              सम्पर्क: <strong>{selectedComplaint.citizenPhone || 'N/A'}</strong>
                            </div>
                          </div>
                          {selectedComplaint.isConfidentialIdentity && (
                            <p className="text-[11px] text-purple-700 mt-2 font-medium">
                              🔒 नागरिकद्वारा पहिचान गोप्य राख्न अनुरोध गरिएको। अधिकृत स्तरमा मात्र खुलाइएको।
                            </p>
                          )}
                        </div>

                        {/* Problem Description */}
                        <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                          <span className="font-bold text-slate-900 block mb-1">विस्तृत समस्या:</span>
                          {selectedComplaint.description}
                        </div>

                        {/* Citizen Photo Attachments Section */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <ImageIcon className="w-4 h-4 text-teal-600" />
                              <span>संलग्न तस्बिर तथा प्रमाण ({selectedComplaint.attachments?.length || 0})</span>
                            </span>
                            {selectedComplaint.attachments && selectedComplaint.attachments.length > 0 && (
                              <span className="text-[10px] text-teal-800 font-bold bg-teal-100 px-2 py-0.5 rounded-full">
                                प्रमाण उपलब्ध
                              </span>
                            )}
                          </div>

                          {(!selectedComplaint.attachments || selectedComplaint.attachments.length === 0) ? (
                            <p className="text-xs text-slate-400 italic py-1">नागरिकद्वारा कुनै तस्बिर वा कागजात संलग्न गरिएको छैन।</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                              {selectedComplaint.attachments.map((att: Attachment, idx: number) => {
                                const imgSrc = att.dataUrl || att.url;
                                return (
                                  <div
                                    key={att.id || idx}
                                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-slate-300 transition"
                                  >
                                    <div className="flex items-start gap-2.5">
                                      {imgSrc ? (
                                        <div
                                          onClick={() => setLightboxImage({ url: imgSrc, name: att.name })}
                                          className="relative group cursor-pointer w-16 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100"
                                        >
                                          <img
                                            src={imgSrc}
                                            alt={att.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition"
                                          />
                                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                            <ZoomIn className="w-4 h-4" />
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="w-16 h-16 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 shrink-0 border border-teal-200">
                                          <FileText className="w-6 h-6" />
                                        </div>
                                      )}

                                      <div className="min-w-0 flex-1">
                                        <h5 className="text-xs font-bold text-slate-800 truncate" title={att.name}>
                                          {att.name}
                                        </h5>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                          {(att.sizeBytes / 1024).toFixed(0)} KB • {att.mimeType || 'तस्बिर'}
                                        </p>
                                        <span className="inline-block mt-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                          सुरक्षित प्रमाणित
                                        </span>
                                      </div>
                                    </div>

                                    {imgSrc && (
                                      <button
                                        type="button"
                                        onClick={() => setLightboxImage({ url: imgSrc, name: att.name })}
                                        className="w-full py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-[#163A63] text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>पूरा तस्बिर हेर्नुहोस् (Zoom)</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Transition Status Form */}
                        <form onSubmit={handleStatusChange} className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-blue-700" />
                            <span>अवस्था परिवर्तन (Transition Status)</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <select
                              value={statusUpdateChoice}
                              onChange={(e) => setStatusUpdateChoice(e.target.value as ComplaintStatus)}
                              className="p-2 text-xs rounded-xl border border-slate-300 bg-white"
                            >
                              <option value="Under review">Under review (अध्ययन हुँदै)</option>
                              <option value="Assigned">Assigned (शाखा/वडामा पठाइएको)</option>
                              <option value="In progress">In progress (कार्यान्वयन हुँदै)</option>
                              <option value="Additional information requested">Additional info requested (थप जानकारी माग)</option>
                              <option value="Resolved">Resolved (समाधान भएको)</option>
                              <option value="Closed with explanation">Closed with explanation (स्पष्टीकरणसहित बन्द)</option>
                            </select>
                            <input
                              type="text"
                              value={statusReason}
                              onChange={(e) => setStatusReason(e.target.value)}
                              placeholder="निर्णय वा परिवर्तनको कारण..."
                              className="p-2 text-xs rounded-xl border border-slate-300 bg-white"
                            />
                          </div>
                          <button
                            type="submit"
                            className="py-2 px-4 bg-[#163A63] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs transition"
                          >
                            अवस्था अद्यावधिक गर्नुहोस्
                          </button>
                        </form>

                        {/* Assignment Form */}
                        <form onSubmit={handleAssignment} className="p-4 bg-teal-50/50 rounded-xl border border-teal-200 space-y-3">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-teal-700" />
                            <span>जिम्मेवारी तोक्नुहोस् (Assign Department & Ward)</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <select
                              value={newDepartment}
                              onChange={(e) => setNewDepartment(e.target.value)}
                              className="p-2 rounded-xl border border-slate-300 bg-white col-span-2 sm:col-span-1"
                            >
                              <option value="पूर्वाधार विकास तथा प्राविधिक शाखा">पूर्वाधार शाखा</option>
                              <option value="स्वास्थ्य शाखा">स्वास्थ्य शाखा</option>
                              <option value="खानेपानी तथा सरसफाइ शाखा">खानेपानी शाखा</option>
                              <option value="शिक्षा तथा युवा शाखा">शिक्षा शाखा</option>
                              <option value="कृषि तथा पशुसेवा शाखा">कृषि शाखा</option>
                              <option value="पञ्जीकरण तथा सामाजिक सुरक्षा">सामाजिक सुरक्षा</option>
                            </select>
                            <select
                              value={newWard}
                              onChange={(e) => setNewWard(Number(e.target.value))}
                              className="p-2 rounded-xl border border-slate-300 bg-white"
                            >
                              {[1, 2, 3, 4, 5].map((w) => (
                                <option key={w} value={w}>
                                  वडा नं {w}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={newOfficerName}
                              onChange={(e) => setNewOfficerName(e.target.value)}
                              placeholder="अधिकृतको नाम..."
                              className="p-2 rounded-xl border border-slate-300 bg-white"
                            />
                          </div>
                          <button
                            type="submit"
                            className="py-2 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
                          >
                            शाखा / वडालाई जिम्मा दिनुहोस्
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Internal Notes Tab */}
                    {activeTab === 'notes' && (
                      <div className="space-y-4">
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                          <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong>{t.internalNotesTitle}</strong>
                            <p className="text-[11px] mt-0.5">{t.internalNotesWarning}</p>
                          </div>
                        </div>

                        <div className="space-y-2.5 max-h-60 overflow-y-auto">
                          {internalNotes.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-4">कुनै आन्तरिक टिपोट छैन।</p>
                          ) : (
                            internalNotes.map((note) => (
                              <div key={note.id} className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/70 text-xs">
                                <div className="flex items-center justify-between font-bold text-amber-900 mb-1">
                                  <span>{note.senderName} ({note.senderRole})</span>
                                  <span className="text-[10px] text-slate-400 font-normal">{formatNepalDateTime(note.createdAt, lang)}</span>
                                </div>
                                <p className="text-slate-700 whitespace-pre-wrap">{note.content}</p>
                              </div>
                            ))
                          )}
                        </div>

                        <form onSubmit={handlePostInternalNote} className="space-y-2 pt-2 border-t border-slate-100">
                          <textarea
                            value={internalNoteText}
                            onChange={(e) => setInternalNoteText(e.target.value)}
                            placeholder="आन्तरिक टिपोट, फिल्ड नापजाँच वा अध्यक्षको निर्देशन यहाँ लेख्नुहोस्..."
                            rows={3}
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                          />
                          <button
                            type="submit"
                            disabled={!internalNoteText.trim()}
                            className="py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                          >
                            {t.btnPostInternalNote}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Citizen Visible Replies Tab */}
                    {activeTab === 'replies' && (
                      <div className="space-y-4">
                        <div className="space-y-2.5 max-h-60 overflow-y-auto">
                          {publicReplies.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-4">हालसम्म कुनै आधिकारिक जवाफ पठाइएको छैन।</p>
                          ) : (
                            publicReplies.map((r) => (
                              <div key={r.id} className="p-3 bg-teal-50/50 rounded-xl border border-teal-200 text-xs">
                                <div className="flex items-center justify-between font-bold text-teal-900 mb-1">
                                  <span>{r.senderName}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">{formatNepalDateTime(r.createdAt, lang)}</span>
                                </div>
                                <p className="text-slate-700 whitespace-pre-wrap">{r.content}</p>
                              </div>
                            ))
                          )}
                        </div>

                        <form onSubmit={handlePostPublicReply} className="space-y-2 pt-2 border-t border-slate-100">
                          <textarea
                            value={publicReplyText}
                            onChange={(e) => setPublicReplyText(e.target.value)}
                            placeholder="नागरिकलाई जाने आधिकारिक जवाफ लेख्नुहोस् (यो नागरिकले आफ्नो ट्र्याकिङ पृष्ठमा हेर्न सक्नेछन्)..."
                            rows={3}
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-600"
                          />
                          <button
                            type="submit"
                            disabled={!publicReplyText.trim()}
                            className="py-2 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{t.btnPostPublicReply}</span>
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Audit Tab */}
                    {activeTab === 'audit' && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-800">
                          यो गुनासोसम्बन्धी अडिट अभिलेख (Audit Trail):
                        </h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {auditLogs
                            .filter((a) => a.targetId === selectedComplaint.referenceNumber)
                            .map((log) => (
                              <div key={log.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                                <div className="flex items-center justify-between font-semibold text-slate-800">
                                  <span>{log.action} by {log.actorName}</span>
                                  <span className="text-slate-400">{formatNepalDateTime(log.timestamp, lang)}</span>
                                </div>
                                <p className="text-slate-600 mt-0.5">{log.details}</p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                  <Eye className="w-8 h-8 text-slate-300 mb-2" />
                  <h3 className="font-bold text-slate-700 text-sm">कुनै गुनासो छनोट गरिएको छैन</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    बायाँ सूचीबाट कुनै गुनासो छान्नुहोस् र कारबाही गर्नुहोस्।
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Printable / Downloadable Receipt Modal */}
      {receiptComplaint && (
        <ReceiptModal
          complaint={receiptComplaint}
          onClose={() => setReceiptComplaint(null)}
          lang={lang}
        />
      )}

      {/* High-Resolution Photo Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 min-w-0">
                <Camera className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="font-bold text-xs sm:text-sm truncate">{lightboxImage.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.url}
                  download={lightboxImage.name || 'complaint_photo.jpg'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 bg-[#163A63] hover:bg-blue-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">डाउनलोड</span>
                </a>

                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Canvas */}
            <div className="p-4 flex-1 flex items-center justify-center bg-black/40 overflow-auto">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.name}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Caption */}
            <div className="p-3 bg-slate-800 text-[11px] text-slate-400 text-center border-t border-slate-700">
              सखुवानान्कारकट्टी गाउँपालिका • नागरिक गुनासो प्रमाण तस्बिर
            </div>
          </div>
        </div>
      )}

      {/* Staff QR Scanner Modal */}
      <QRScannerModal
        isOpen={showStaffScanner}
        onClose={() => setShowStaffScanner(false)}
        onScanSuccess={handleStaffScanSuccess}
        lang={lang}
      />
    </div>
  );
};
