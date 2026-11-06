import React, { useState } from 'react';
import { ComplaintCategory, ContactMethod, Language, Complaint } from '../types';
import { MunicipalityAPI } from '../utils/api';
import { translations } from '../i18n/translations';
import {
  FileText,
  MapPin,
  Shield,
  Star,
  AlertTriangle,
  Upload,
  CheckCircle,
  HelpCircle,
  Image as ImageIcon,
  X,
  Eye,
} from 'lucide-react';
import { CivicActionLoader, CivicSpinner } from './LoadingAnimation';
import { PWANotificationService } from '../utils/pwaNotifications';

interface CitizenSubmitViewProps {
  lang: Language;
  onSubmitted: (complaint: Complaint) => void;
}

interface AttachedFileItem {
  name: string;
  sizeBytes: number;
  mimeType: string;
  dataUrl?: string;
}

export const CitizenSubmitView: React.FC<CitizenSubmitViewProps> = ({
  lang,
  onSubmitted,
}) => {
  const t = translations[lang] || translations.ne;

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('roads_infrastructure');
  const [wardNumber, setWardNumber] = useState<number>(1);
  const [landmark, setLandmark] = useState('');
  const [description, setDescription] = useState('');
  const [preferredReplyLanguage, setPreferredReplyLanguage] = useState<Language>(lang);
  const [contactMethod, setContactMethod] = useState<ContactMethod>('phone');
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');

  // Security & Attention Toggles
  const [isConfidentialIdentity, setIsConfidentialIdentity] = useState(false);
  const [isChairpersonAttentionRequested, setIsChairpersonAttentionRequested] = useState(false);
  const [isConflictOfInterest, setIsConflictOfInterest] = useState(false);
  const [ackPrivacy, setAckPrivacy] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<AttachedFileItem[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  // Submission Status & Animation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState('फाराम तथा विवरण रुजु हुँदैछ...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categories: Array<{ id: ComplaintCategory; label: string }> = [
    { id: 'roads_infrastructure', label: t.cat_roads_infrastructure },
    { id: 'drinking_water_sanitation', label: t.cat_drinking_water_sanitation },
    { id: 'health_services', label: t.cat_health_services },
    { id: 'education_schools', label: t.cat_education_schools },
    { id: 'agriculture_livestock', label: t.cat_agriculture_livestock },
    { id: 'social_security', label: t.cat_social_security },
    { id: 'delayed_services', label: t.cat_delayed_services },
    { id: 'staff_conduct', label: t.cat_staff_conduct },
    { id: 'other', label: t.cat_other },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('केबल JPEG, PNG वा PDF कागजात मात्र स्वीकृत गरिन्छ। (Executables rejected)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('फाइलको आकार ८ MB भन्दा कम हुनुपर्दछ।');
      return;
    }

    setIsProcessingPhoto(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      // If image is larger than 1.2MB, compress via canvas for mobile speed
      if (file.type.startsWith('image/') && file.size > 1.2 * 1024 * 1024) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1400;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedUrl = canvas.toDataURL('image/jpeg', 0.82);
            setAttachments((prev) => [
              ...prev,
              {
                name: file.name,
                sizeBytes: Math.round(compressedUrl.length * 0.75),
                mimeType: 'image/jpeg',
                dataUrl: compressedUrl,
              },
            ]);
            setIsProcessingPhoto(false);
            return;
          }
          // Fallback if canvas context fails
          setAttachments((prev) => [
            ...prev,
            { name: file.name, sizeBytes: file.size, mimeType: file.type, dataUrl },
          ]);
          setIsProcessingPhoto(false);
        };
        img.onerror = () => {
          setAttachments((prev) => [
            ...prev,
            { name: file.name, sizeBytes: file.size, mimeType: file.type, dataUrl },
          ]);
          setIsProcessingPhoto(false);
        };
        img.src = dataUrl;
      } else {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            sizeBytes: file.size,
            mimeType: file.type,
            dataUrl,
          },
        ]);
        setIsProcessingPhoto(false);
      }
    };

    reader.onerror = () => {
      setIsProcessingPhoto(false);
      setUploadError('तस्बिर लोड गर्न सकिएन। कृपया अर्को तस्बिर छान्नुहोस्।');
    };

    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected if needed
    e.target.value = '';
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('कृपया गुनासोको शीर्षक लेख्नुहोस्।');
      return;
    }

    if (!description.trim() || description.length < 15) {
      setErrorMsg('कृपया समस्याको स्पष्ट विवरण कम्तिमा १५ अक्षरमा खुलाउनुहोस्।');
      return;
    }

    if (!ackPrivacy) {
      setErrorMsg('कृपया गोपनीयता तथा गैर-आपतकालीन सूचना स्वीकार गर्नुहोस्।');
      return;
    }

    setIsSubmitting(true);
    setSubmittingStep(
      lang === 'en'
        ? 'Step 1/3: Verifying form details...'
        : '१/३: फाराम तथा विवरण रुजु हुँदैछ...'
    );

    try {
      await new Promise((r) => setTimeout(r, 450));
      setSubmittingStep(
        lang === 'en'
          ? 'Step 2/3: Securing in Sakhuwanankarkatti Municipal Records...'
          : '२/३: स्थानीय निकाय अभिलेखमा दर्ता गरिँदैछ...'
      );

      const complaint = await MunicipalityAPI.submitComplaint({
        title: title.trim(),
        category,
        wardNumber,
        landmark: landmark.trim(),
        description: description.trim(),
        preferredReplyLanguage,
        contactMethod,
        citizenName: citizenName.trim(),
        citizenPhone: citizenPhone.trim(),
        citizenEmail: citizenEmail.trim(),
        isConfidentialIdentity,
        isChairpersonAttentionRequested,
        isConflictOfInterest,
        attachments,
      });

      setSubmittingStep(
        lang === 'en'
          ? 'Step 3/3: Official Reference Token Generated!'
          : '३/३: आधिकारिक दर्ता नम्बर तथा रसिद तयार भयो!'
      );
      await new Promise((r) => setTimeout(r, 550));

      // Auto-subscribe citizen to status update notifications for this reference token
      try {
        PWANotificationService.subscribe(complaint.referenceNumber);
      } catch (e) {
        console.warn('Subscription error:', e);
      }

      setIsSubmitting(false);
      onSubmitted(complaint);
    } catch (err) {
      console.error('Submit complaint error:', err);
      setIsSubmitting(false);
      setErrorMsg('प्राविधिक समस्याका कारण दर्ता हुन सकेन। कृपया पुनः प्रयास गर्नुहोस्।');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 px-3 sm:px-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 mb-6">
        <div className="flex items-center gap-2.5 text-[#163A63] font-bold text-lg mb-1">
          <FileText className="w-5 h-5 text-teal-600" />
          <h2>{t.submitTitle}</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {t.submitDesc}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Grievance Details Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
            १. गुनासोको विषय तथा स्थान (Grievance Details)
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.fieldTitle} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.fieldTitlePlaceholder}
              maxLength={120}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63] focus:border-transparent transition"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.fieldCategory} <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63] bg-white transition"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.fieldWard} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWardNumber(w)}
                    className={`py-2 text-xs rounded-xl font-bold transition ${
                      wardNumber === w
                        ? 'bg-[#163A63] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    वडा {w}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.fieldLandmark}</span>
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder={t.fieldLandmarkPlaceholder}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63] transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                {t.fieldDescription} <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">{description.length}/1000</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.fieldDescriptionPlaceholder}
              rows={4}
              maxLength={1000}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63] transition resize-y"
              required
            />
          </div>

          {/* Optional Attachment Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.fieldAttachments}
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>{isProcessingPhoto ? 'तस्बिर प्रशोधन हुँदै...' : 'तस्बिर वा कागजात छान्नुहोस्'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileUpload}
                  disabled={isProcessingPhoto}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-slate-400">JPG, PNG, PDF (अधिकतम ८ MB)</span>
            </div>

            {uploadError && (
              <p className="text-xs text-red-600 mt-1">{uploadError}</p>
            )}

            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-teal-50/70 rounded-xl text-xs border border-teal-200 text-teal-900 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {att.dataUrl && att.mimeType.startsWith('image/') ? (
                        <img
                          src={att.dataUrl}
                          alt={att.name}
                          className="w-10 h-10 object-cover rounded-lg border border-teal-300 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold truncate text-slate-900">{att.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{(att.sizeBytes / 1024).toFixed(0)} KB</span>
                          <span className="text-[10px] bg-teal-200 text-teal-900 px-1.5 py-0.2 rounded font-semibold">
                            संलग्न गरिएको
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="तस्बिर हटाउनुहोस्"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Citizen Contact & Confidentiality Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
            २. सम्पर्क तथा नागरिक विवरण (Contact Information)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.fieldName}
              </label>
              <input
                type="text"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="उदा: रमेश कुमार यादव"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.fieldPhone}
              </label>
              <input
                type="tel"
                value={citizenPhone}
                onChange={(e) => setCitizenPhone(e.target.value)}
                placeholder="उदा: 98XXXXXXXX"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63] transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.fieldPreferredLang}
              </label>
              <select
                value={preferredReplyLanguage}
                onChange={(e) => setPreferredReplyLanguage(e.target.value as Language)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white"
              >
                <option value="ne">नेपाली (Nepali)</option>
                <option value="en">English</option>
                <option value="mai">मैथिली (Maithili)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.fieldContactMethod}
              </label>
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value as ContactMethod)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white"
              >
                <option value="phone">{t.contact_phone}</option>
                <option value="email">{t.contact_email}</option>
                <option value="in_person">{t.contact_in_person}</option>
              </select>
            </div>
          </div>

          {/* Privacy & Governance Toggles */}
          <div className="pt-2 space-y-3">
            {/* Confidential Identity Toggle */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={isConfidentialIdentity}
                onChange={(e) => setIsConfidentialIdentity(e.target.checked)}
                className="mt-1 w-4 h-4 text-[#163A63] rounded border-slate-300 focus:ring-[#163A63]"
              />
              <div className="text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-teal-600" />
                  <span>{t.toggleConfidential}</span>
                </div>
                <p className="text-slate-500 mt-0.5 leading-relaxed">
                  {t.toggleConfidentialDesc}
                </p>
              </div>
            </label>

            {/* Chairperson Attention Request Toggle */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={isChairpersonAttentionRequested}
                onChange={(e) => setIsChairpersonAttentionRequested(e.target.checked)}
                className="mt-1 w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
              />
              <div className="text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{t.toggleChairperson}</span>
                </div>
                <p className="text-slate-500 mt-0.5 leading-relaxed">
                  {t.toggleChairpersonDesc}
                </p>
              </div>
            </label>

            {/* Conflict of Interest Toggle */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 cursor-pointer transition">
              <input
                type="checkbox"
                checked={isConflictOfInterest}
                onChange={(e) => setIsConflictOfInterest(e.target.checked)}
                className="mt-1 w-4 h-4 text-red-600 rounded border-amber-300 focus:ring-red-500"
              />
              <div className="text-xs">
                <div className="font-bold text-red-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span>{t.toggleConflict}</span>
                </div>
                <p className="text-red-700/80 mt-0.5 leading-relaxed">
                  {t.toggleConflictDesc}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Step 3: Consent and Submission */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ackPrivacy}
              onChange={(e) => setAckPrivacy(e.target.checked)}
              className="mt-1 w-4 h-4 text-[#163A63] rounded border-slate-300"
              required
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              {t.ackPrivacy}
            </span>
          </label>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-[#163A63] hover:bg-blue-900 active:scale-[0.99] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <CivicSpinner size="sm" color="border-amber-400" />
                <span>{t.btnSubmitting}</span>
              </div>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-teal-400" />
                <span>{t.btnSubmitGrievance}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Animated Action Loader Modal */}
      <CivicActionLoader
        isOpen={isSubmitting}
        title={lang === 'en' ? 'Registering Grievance...' : 'जनगुनासो सुरक्षित दर्ता हुँदैछ'}
        stepMessage={submittingStep}
        lang={lang}
      />
    </div>
  );
};
