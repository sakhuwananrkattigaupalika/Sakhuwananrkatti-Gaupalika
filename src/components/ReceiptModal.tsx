import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Complaint, Language } from '../types';
import { formatNepalDateTime, formatPdfNepalDateTime } from '../utils/nepalTime';
import { translations } from '../i18n/translations';
import { generateReceiptPDF } from '../utils/pdfGenerator';
import { Printer, X, ShieldAlert, CheckCircle, Copy, Check, Download, FileDown } from 'lucide-react';
import { PWANotificationBanner } from './PWANotificationBanner';
import emblemSvg from '../assets/emblem-of-nepal.svg';

interface ReceiptModalProps {
  complaint: Complaint;
  onClose: () => void;
  lang: Language;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  complaint,
  onClose,
  lang,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const t = translations[lang] || translations.ne;

  useEffect(() => {
    // Generate private local QR code without 3rd party external services
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sakhuwanankarkatti.gov.np';
    const trackingUrl = `${origin}/?ref=${encodeURIComponent(complaint.referenceNumber)}`;

    QRCode.toDataURL(trackingUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: '#163a63',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR', err));
  }, [complaint.referenceNumber]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateReceiptPDF(complaint, lang);
    } catch (err) {
      console.error('PDF error', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(complaint.referenceNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200 relative my-auto animate-in zoom-in-95">
        {/* Close Button (Hidden on Print) */}
        <button
          onClick={onClose}
          className="no-print absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Official Printable Receipt Content */}
        <div className="print-card">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-white p-1 border-2 border-amber-400 shrink-0 flex items-center justify-center overflow-hidden">
              <img
                src={emblemSvg}
                alt="नेपालको आधिकारिक निशान छाप (Emblem of Nepal)"
                className="w-full h-full object-contain scale-95"
              />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#163A63] leading-tight">
                सखुवानान्कारकट्टी गाउँपालिका
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                गाउँ कार्यपालिकाको कार्यालय, सिराहा, मधेश प्रदेश
              </p>
              <p className="text-xs font-bold text-teal-700 mt-0.5">
                नागरिक जनगुनासो आधिकारिक दर्ता भरपाई (Official Receipt)
              </p>
            </div>
          </div>

          {/* Pilot Project Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-4 text-[11px] text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>परीक्षण परियोजना सूचना:</strong> यो रसिद प्रणाली परीक्षणका क्रममा उत्पन्न गरिएको हो।
            </div>
          </div>

          {/* Reference Number Highlight Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center mb-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              दर्ता नम्बर (Reference Number)
            </span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-mono font-black text-[#163A63] tracking-widest">
                {complaint.referenceNumber}
              </span>
              <button
                onClick={handleCopyRef}
                className="no-print p-1.5 text-slate-500 hover:text-slate-800 rounded bg-white border border-slate-200 text-xs flex items-center gap-1 shadow-xs"
                title="Copy Reference"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              यो नम्बर सुरक्षित राख्नुहोस्। अवस्था बुझ्न यही नम्बर आवश्यक पर्दछ।
            </p>
          </div>

          {/* Grievance Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
            <div className="p-2.5 bg-slate-50/70 rounded-lg">
              <span className="text-slate-500 block font-medium">दर्ता मिति तथा समय (Submission Time):</span>
              <span className="font-bold text-slate-900 block mt-0.5">
                {formatPdfNepalDateTime(complaint.createdAt)}
              </span>
              <span className="text-[11px] text-teal-700 block">
                {formatNepalDateTime(complaint.createdAt, 'ne')}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50/70 rounded-lg">
              <span className="text-slate-500 block font-medium">सम्बन्धित वडा / स्थान:</span>
              <span className="font-semibold text-slate-900">
                वडा नं. {complaint.wardNumber} ({complaint.landmark || 'सखुवानान्कारकट्टी'})
              </span>
            </div>

            <div className="p-2.5 bg-slate-50/70 rounded-lg">
              <span className="text-slate-500 block font-medium">विषय / क्षेत्र:</span>
              <span className="font-semibold text-slate-900">
                {complaint.category.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50/70 rounded-lg">
              <span className="text-slate-500 block font-medium">अवस्था (Safe Status):</span>
              <span className="font-bold text-teal-700 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {complaint.status}
              </span>
            </div>
          </div>

          {/* QR Code Section (Separated from Emblem) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-4 mb-4">
            <div className="bg-white p-2 rounded-lg border border-slate-200 shrink-0">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Secure QR Code for Private Direct Tracking" className="w-28 h-28" />
              ) : (
                <div className="w-28 h-28 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                  QR Code
                </div>
              )}
            </div>

            <div className="text-xs space-y-1 text-slate-600">
              <p className="font-bold text-slate-800">
                निजी सिधा ट्र्याकिङका लागि QR कोड (Private Direct Tracking)
              </p>
              <p className="text-[11px] leading-relaxed">
                यो QR कोड स्क्यान गरी सिधै तपाईंको गुनासोको कारबाही अवस्था हेर्न सक्नुहुन्छ।
              </p>
              <p className="text-[11px] text-red-600 font-semibold">
                "Keep this receipt private. यो रसिद आफ्नो व्यक्तिगत जानकारी भएकाले अरूलाई नबाँड्नुहोला।"
              </p>
            </div>
          </div>

          {/* Signoff / Seal Note */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <div>सखुवानान्कारकट्टी जनगुनासो डेस्क</div>
            <div className="italic">
              कम्प्युटर सिर्जित आधिकारिक भरपाई (जारी: {formatPdfNepalDateTime(new Date().toISOString())})
            </div>
          </div>
        </div>

        {/* PWA Service Worker Status Notification Opt-In (Compact) */}
        <div className="no-print mt-4">
          <PWANotificationBanner
            referenceNumber={complaint.referenceNumber}
            lang={lang}
            compact={true}
          />
        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="no-print mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            बन्द गर्नुहोस्
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-slate-300 transition"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>प्रिन्ट</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-4 py-2 bg-[#163A63] hover:bg-blue-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4 text-teal-300" />
            <span>{isGeneratingPdf ? 'PDF तयार हुँदैछ...' : 'आधिकारिक फाराम PDF डाउनलोड'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
