import React, { useState, useEffect } from 'react';
import { Appointment, Language, UserRole } from '../types';
import { LocalMunicipalityDB } from '../utils/storage';
import { MunicipalityAPI } from '../utils/api';
import { getTodayNepalDateString } from '../utils/nepalTime';
import { translations } from '../i18n/translations';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  Check,
  X,
  MapPin,
  CalendarDays,
} from 'lucide-react';

interface ChairpersonAppointmentsViewProps {
  lang: Language;
  currentRole: UserRole;
}

export const ChairpersonAppointmentsView: React.FC<ChairpersonAppointmentsViewProps> = ({
  lang,
  currentRole,
}) => {
  const t = translations[lang] || translations.ne;
  const isSecretariatOrChair = currentRole === 'chairperson' || currentRole === 'secretariat' || currentRole === 'admin';

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Form State
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenWard, setCitizenWard] = useState<number>(1);
  const [requestedDate, setRequestedDate] = useState<string>(getTodayNepalDateString());
  const [requestedTimeSlot, setRequestedTimeSlot] = useState<string>('11:30 AM');
  const [purpose, setPurpose] = useState('');
  const [relatedComplaintRef, setRelatedComplaintRef] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApt, setSubmittedApt] = useState<Appointment | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Secretariat action notes state
  const [secretariatNotes, setSecretariatNotes] = useState<{ [key: string]: string }>({});

  const loadAppointments = async () => {
    try {
      const data = await MunicipalityAPI.getAppointments();
      setAppointments(data);
    } catch {
      setAppointments(LocalMunicipalityDB.getAppointments());
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const availableSlots = [
    '10:30 AM',
    '11:30 AM',
    '12:30 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
  ];

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!citizenName.trim() || !citizenPhone.trim()) {
      setErrorMsg('कृपया आफ्नो नाम र मोबाइल नम्बर अनिवार्य रूपमा प्रविष्ट गर्नुहोस्।');
      return;
    }

    if (!purpose.trim()) {
      setErrorMsg('कृपया भेटघाटको उद्देश्य वा एजेन्डा संक्षिप्तमा खुलाउनुहोस्।');
      return;
    }

    // Double booking check for approved slots
    const isSlotTaken = appointments.some(
      (a) =>
        a.requestedDate === requestedDate &&
        a.requestedTimeSlot === requestedTimeSlot &&
        a.status === 'Approved'
    );

    if (isSlotTaken) {
      setErrorMsg('यो समय स्लट अध्यक्षज्यूको कार्यतालिकामा पहिले नै स्वीकृत भइसकेको छ। कृपया अर्को समय छान्नुहोस्।');
      return;
    }

    setIsSubmitting(true);

    try {
      const newApt = await MunicipalityAPI.bookAppointment({
        citizenName: citizenName.trim(),
        citizenPhone: citizenPhone.trim(),
        citizenWard,
        requestedDate,
        requestedTimeSlot,
        purpose: purpose.trim(),
        relatedComplaintRef: relatedComplaintRef.trim(),
      });

      await loadAppointments();
      setSubmittedApt(newApt);
      setIsSubmitting(false);

      // Reset form
      setCitizenName('');
      setCitizenPhone('');
      setPurpose('');
      setRelatedComplaintRef('');
    } catch {
      setIsSubmitting(false);
      setErrorMsg('अनुरोध पठाउन सकिएन। पुनः प्रयास गर्नुहोस्।');
    }
  };

  const handleUpdateStatus = async (
    aptId: string,
    newStatus: 'Approved' | 'Declined' | 'Completed' | 'Cancelled'
  ) => {
    const note = secretariatNotes[aptId] || '';
    const reviewer = currentRole === 'chairperson' ? 'गाउँपालिका अध्यक्ष' : 'सचिवालय अधिकृत';

    await MunicipalityAPI.updateAppointmentStatus(aptId, newStatus, note, reviewer, currentRole);
    await loadAppointments();
  };

  return (
    <div className="max-w-4xl mx-auto py-4 px-3 sm:px-6 space-y-6">
      {/* Official Helpdesk Banner */}
      <div className="bg-gradient-to-r from-[#163A63] to-[#138A83] text-white rounded-2xl p-5 sm:p-6 shadow-md">
        <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider mb-1">
          <Building className="w-4 h-4" />
          <span>गाउँ कार्यपालिका अध्यक्षको सचिवालय</span>
        </div>
        <h2 className="text-lg sm:text-xl font-black mb-2">
          {t.aptTitle}
        </h2>
        <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed mb-4">
          {t.aptDesc}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-3 border-t border-white/15">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{t.aptOfficeInfo}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-teal-300 shrink-0" />
            <span>{t.aptPublicContact}</span>
          </div>
        </div>
      </div>

      {/* Citizen Booking Form */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
          <CalendarDays className="w-4 h-4 text-[#163A63]" />
          <span>नयाँ भेटघाट समय अनुरोध फाराम</span>
        </h3>

        {submittedApt && (
          <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{t.aptSuccess}</span>
            </div>
            <p>
              अनुरोध नम्बर: <strong>{submittedApt.referenceNumber}</strong> | मिति: {submittedApt.requestedDate} ({submittedApt.requestedTimeSlot})
            </p>
          </div>
        )}

        <form onSubmit={handleBook} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                तपाईंको नाम <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="उदा: दीपेन्द्र प्रसाद साह"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                सम्पर्क मोबाइल नं. <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={citizenPhone}
                onChange={(e) => setCitizenPhone(e.target.value)}
                placeholder="उदा: 98528XXXXX"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                स्थानीय वडा नं.
              </label>
              <select
                value={citizenWard}
                onChange={(e) => setCitizenWard(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white"
              >
                {[1, 2, 3, 4, 5].map((w) => (
                  <option key={w} value={w}>
                    वडा नं. {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.aptReqDate} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={requestedDate}
                min={getTodayNepalDateString()}
                onChange={(e) => setRequestedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.aptReqSlot} <span className="text-red-500">*</span>
              </label>
              <select
                value={requestedTimeSlot}
                onChange={(e) => setRequestedTimeSlot(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white"
              >
                {availableSlots.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.aptRelatedGrievance}
              </label>
              <input
                type="text"
                value={relatedComplaintRef}
                onChange={(e) => setRelatedComplaintRef(e.target.value)}
                placeholder="SKK-2026-XXXXXX"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.aptPurpose} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="भेटघाटको विषय, छलफल गर्न खोजिएको समस्या वा सुझाव स्पष्ट खुलाउनुहोस्..."
              rows={3}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63]"
              required
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-[#163A63] hover:bg-blue-900 text-white font-bold text-xs sm:text-sm shadow transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-teal-300" />
            <span>{t.btnBookApt}</span>
          </button>
        </form>
      </div>

      {/* Appointment Schedule List (Secretariat & Chairperson Review Mode) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>दर्ता भएका भेटघाट अनुरोधहरू</span>
          </h3>
          <span className="text-xs text-slate-500">कुल: {appointments.length}</span>
        </div>

        <div className="space-y-3">
          {appointments.map((a) => (
            <div
              key={a.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#163A63] text-sm">
                    {a.referenceNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      a.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : a.status === 'Declined'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {a.status}
                  </span>
                </div>

                <div className="text-slate-800 font-semibold">
                  नागरिक: {a.citizenName} (फोन: {a.citizenPhone}) — वडा नं. {a.citizenWard}
                </div>

                <div className="text-slate-600 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>मिति: <strong>{a.requestedDate}</strong> ({a.requestedTimeSlot})</span>
                </div>

                <p className="text-slate-600 italic">"{a.purpose}"</p>

                {a.secretariatNotes && (
                  <p className="text-[11px] text-teal-800 font-medium bg-teal-50 p-1.5 rounded border border-teal-200">
                    सचिवालय टिप्पणी: {a.secretariatNotes}
                  </p>
                )}
              </div>

              {/* Secretariat / Chairperson Actions */}
              {isSecretariatOrChair && a.status === 'Requested' && (
                <div className="flex flex-col gap-2 shrink-0 md:w-60">
                  <input
                    type="text"
                    placeholder="टिप्पणी / समय संशोधन..."
                    value={secretariatNotes[a.id] || ''}
                    onChange={(e) =>
                      setSecretariatNotes({
                        ...secretariatNotes,
                        [a.id]: e.target.value,
                      })
                    }
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(a.id, 'Approved')}
                      className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>स्वीकृत</span>
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(a.id, 'Declined')}
                      className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>अस्वीकृत</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
