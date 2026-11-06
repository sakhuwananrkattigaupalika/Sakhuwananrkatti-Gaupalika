import React, { useState, useEffect } from 'react';
import { Complaint, Language, ComplaintMessage } from '../types';
import { MunicipalityAPI } from '../utils/api';
import { formatNepalDateTime } from '../utils/nepalTime';
import { translations } from '../i18n/translations';
import { ReceiptModal } from './ReceiptModal';
import { QRScannerModal } from './QRScannerModal';
import {
  Search,
  CheckCircle2,
  Clock,
  Printer,
  MessageSquare,
  Send,
  AlertCircle,
  FileCheck,
  Shield,
  Star,
  MapPin,
  QrCode,
  Camera,
} from 'lucide-react';
import { CivicSpinner } from './LoadingAnimation';
import { PWANotificationBanner } from './PWANotificationBanner';
import emblemSvg from '../assets/emblem-of-nepal.svg';

interface CitizenTrackViewProps {
  initialRef?: string;
  lang: Language;
}

export const CitizenTrackView: React.FC<CitizenTrackViewProps> = ({
  initialRef = '',
  lang,
}) => {
  const t = translations[lang] || translations.ne;
  const [searchInput, setSearchInput] = useState(initialRef);
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [messages, setMessages] = useState<ComplaintMessage[]>([]);
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Additional Information state
  const [moreInfoText, setMoreInfoText] = useState('');
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState(false);

  useEffect(() => {
    if (initialRef) {
      handleSearch(initialRef);
    }
  }, [initialRef]);

  const handleSearch = async (refToFind?: string) => {
    const query = (refToFind || searchInput).trim().toUpperCase();
    setSearched(true);
    setInfoSuccess(false);

    if (!query) {
      setActiveComplaint(null);
      setMessages([]);
      return;
    }

    setIsSearching(true);

    try {
      // Allow brief moment for smooth animated civic scan
      await new Promise((r) => setTimeout(r, 400));

      // Look up directly in Supabase (falls back to offline cache)
      const found = await MunicipalityAPI.getComplaintByReference(query);

      if (found) {
        setActiveComplaint(found);
        // Strictly get citizen-scoped messages (internal notes are excluded!)
        const citizenMsgs = await MunicipalityAPI.getMessages(found.id, 'citizen');
        setMessages(citizenMsgs);
      } else {
        setActiveComplaint(null);
        setMessages([]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendMoreInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint || !moreInfoText.trim()) return;

    setIsSubmittingInfo(true);

    // Citizen post public reply to official case
    const newMsg = await MunicipalityAPI.addMessage(
      activeComplaint.id,
      'citizen',
      activeComplaint.citizenName || 'नागरिक',
      moreInfoText.trim(),
      false // public message to staff
    );

    setMessages([...messages, newMsg]);
    setMoreInfoText('');
    setIsSubmittingInfo(false);
    setInfoSuccess(true);
    setTimeout(() => setInfoSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto py-4 px-3 sm:px-6">
      {/* Search Bar Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 mb-6">
        <h2 className="text-base sm:text-lg font-bold text-[#163A63] mb-1">
          {t.trackTitle}
        </h2>
        <p className="text-xs text-slate-600 mb-4">
          {t.trackDesc}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="उदा: SKK-2026-7K4M9Q2X वा QR स्क्यान"
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63] font-mono uppercase"
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="absolute right-2.5 top-2 p-1 text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition"
              title="क्यामेराबाट QR स्क्यान गर्नुहोस्"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span>QR स्क्यान</span>
            </button>

            <button
              type="submit"
              disabled={isSearching}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#163A63] hover:bg-blue-900 text-white text-xs sm:text-sm font-bold rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-75"
            >
              {isSearching ? (
                <>
                  <CivicSpinner size="sm" color="border-white" />
                  <span>खोज्दै...</span>
                </>
              ) : (
                <span>{t.btnTrack}</span>
              )}
            </button>
          </div>
        </form>

        {/* Quick QR Scanner Banner on mobile */}
        <div className="mt-3.5 p-3 rounded-xl bg-teal-50/70 border border-teal-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-600 text-white rounded-lg shadow-xs">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-teal-900 block leading-tight">
                कागजी वा डिजिटल रसिद छ?
              </span>
              <span className="text-[11px] text-teal-700 font-medium">
                फोनको क्यामेरा वा फोटोबाट सिधै QR कोड स्क्यान गर्नुहोस्
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="px-3 py-1.5 bg-white hover:bg-teal-100 text-teal-900 border border-teal-300 rounded-lg text-xs font-bold transition shadow-xs shrink-0 flex items-center gap-1"
          >
            <Camera className="w-3.5 h-3.5 text-teal-700" />
            <span>खोल्नुहोस्</span>
          </button>
        </div>

        {/* Quick Suggestions for Demo */}
        <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
          <span>नमुना दर्ता नं:</span>
          {['SKK-2026-001', 'SKK-2026-002', 'SKK-2026-003', 'SKK-2026-7K4M9Q2X'].map((ref) => (
            <button
              key={ref}
              type="button"
              onClick={() => {
                setSearchInput(ref);
                handleSearch(ref);
              }}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono"
            >
              {ref}
            </button>
          ))}
        </div>
      </div>

      {/* Animated Searching Status */}
      {isSearching && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center my-6 shadow-sm flex flex-col items-center justify-center animate-in fade-in">
          <div className="relative w-16 h-16 mb-3 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-3 border-slate-100 border-t-[#163A63] border-r-amber-500 animate-spin" />
            <div className="w-12 h-12 rounded-full bg-white p-1 flex items-center justify-center overflow-hidden border border-slate-200 shadow-xs">
              <img
                src={emblemSvg}
                alt="नेपालको आधिकारिक निशान छाप (Emblem of Nepal)"
                className="w-full h-full object-contain scale-95"
              />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-800">
            गाउँपालिका अभिलेख प्रणालीमा खोजी हुँदैछ...
          </p>
          <p className="text-xs text-slate-500 mt-1">
            टोकन नम्बर: <span className="font-mono font-bold text-teal-700">{searchInput || initialRef}</span>
          </p>
        </div>
      )}

      {/* Case Details View */}
      {activeComplaint && (
        <div className="space-y-6">
          {/* PWA Service Worker Status Notification Alert Banner */}
          <PWANotificationBanner
            referenceNumber={activeComplaint.referenceNumber}
            lang={lang}
          />

          {/* Main Case Summary */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  REFERENCE NUMBER
                </span>
                <span className="text-xl font-black font-mono text-[#163A63]">
                  {activeComplaint.referenceNumber}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-900 border border-teal-300">
                  {activeComplaint.status}
                </span>

                <button
                  onClick={() => setShowReceipt(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-200 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t.receiptPrint}</span>
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {activeComplaint.title}
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-600 pt-1">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-medium">वडा नं:</span>
                  <span className="font-semibold text-slate-800">वडा नं. {activeComplaint.wardNumber}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-medium">स्थान:</span>
                  <span className="font-semibold text-slate-800 truncate block">{activeComplaint.landmark || 'सखुवानान्कारकट्टी'}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-400 block font-medium">दर्ता मिति:</span>
                  <span className="font-semibold text-slate-800">{formatNepalDateTime(activeComplaint.createdAt, lang)}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed border border-slate-100">
                <span className="font-bold text-slate-800 block mb-1">गुनासोको विवरण:</span>
                {activeComplaint.description}
              </div>

              {/* Citizen Uploaded Attachments */}
              {activeComplaint.attachments && activeComplaint.attachments.length > 0 && (
                <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-200/70 text-xs">
                  <span className="font-bold text-teal-900 block mb-2">तपाईंले संलग्न गर्नुभएको तस्बिर / कागजात:</span>
                  <div className="flex flex-wrap gap-2">
                    {activeComplaint.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-teal-200">
                        {att.dataUrl || att.url ? (
                          <img
                            src={att.dataUrl || att.url}
                            alt={att.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : null}
                        <span className="text-[11px] font-medium text-slate-700">{att.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Flags Badges */}
              <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                {activeComplaint.isConfidentialIdentity && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                    <Shield className="w-3 h-3 text-purple-600" />
                    गोपनीय पहिचान सुरक्षित
                  </span>
                )}
                {activeComplaint.isChairpersonAttentionRequested && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    अध्यक्ष ध्यानाकर्षण अनुरोधित
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Official Progress Timeline */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#163A63]" />
              <span>{t.timeline}</span>
            </h4>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
              {activeComplaint.statusHistory.map((h, i) => (
                <div key={i} className="relative flex items-start gap-4 pl-8">
                  <div className="absolute left-1.5 top-1 w-3.5 h-3.5 rounded-full bg-[#163A63] border-2 border-white ring-2 ring-blue-100" />
                  <div className="flex-1 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{h.status}</span>
                      <span className="text-[10px] text-slate-500">{formatNepalDateTime(h.timestamp, lang)}</span>
                    </div>
                    {h.reason && (
                      <p className="text-xs text-slate-600 mt-1 leading-normal">{h.reason}</p>
                    )}
                    <span className="text-[10px] text-slate-400 block mt-1">अधिकारी: {h.changedByName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Official Replies Section */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-600" />
              <span>{t.officialReplies}</span>
            </h4>

            {messages.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                {t.noOfficialRepliesYet}
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-xl border text-xs ${
                      m.senderRole === 'citizen'
                        ? 'bg-blue-50/60 border-blue-200 ml-4 sm:ml-8'
                        : 'bg-emerald-50/60 border-emerald-200 mr-4 sm:mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span className={m.senderRole === 'citizen' ? 'text-blue-900' : 'text-emerald-900 font-bold'}>
                        {m.senderName} ({m.senderRole.replace('_', ' ')})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatNepalDateTime(m.createdAt, lang)}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Provide More Information Form */}
            <form onSubmit={handleSendMoreInfo} className="mt-5 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t.addMoreInfoTitle}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={moreInfoText}
                  onChange={(e) => setMoreInfoText(e.target.value)}
                  placeholder="कुनै थप तथ्य, विवरण वा अद्यावधिक भए यहाँ लेख्नुहोस्..."
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63]"
                />
                <button
                  type="submit"
                  disabled={isSubmittingInfo || !moreInfoText.trim()}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>पठाउनुहोस्</span>
                </button>
              </div>
              {infoSuccess && (
                <p className="text-xs text-emerald-600 mt-1 font-semibold">
                  तपाईंको थप जानकारी सुरक्षित रूपमा दर्ता भयो। अधिकृतले समीक्षा गर्नेछन्।
                </p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Not Found View */}
      {searched && !isSearching && !activeComplaint && (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm animate-in fade-in">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 text-sm">कुनै गुनासो फेला परेन</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            कृपया दर्ता नम्बर (उदा: SKK-2026-XXXXXX) सही छ कि छैन पुनः जाँच गर्नुहोस्।
          </p>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {showReceipt && activeComplaint && (
        <ReceiptModal
          complaint={activeComplaint}
          onClose={() => setShowReceipt(false)}
          lang={lang}
        />
      )}

      {/* QR Code Scanner Modal */}
      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={(code) => {
          setSearchInput(code);
          handleSearch(code);
        }}
        lang={lang}
      />
    </div>
  );
};
