import React, { useState } from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';

interface EmergencyBannerProps {
  lang: Language;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ lang }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = translations[lang] || translations.ne;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 text-slate-800 text-xs px-3 sm:px-6 py-2 transition-all">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] shrink-0">
            <AlertTriangle className="w-3 h-3" />
            {t.pilotBadge}
          </span>
          <p className="text-slate-700 text-xs line-clamp-1 sm:line-clamp-none">
            {t.pilotDisclaimer}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1 underline underline-offset-2"
          >
            <ShieldAlert className="w-3 h-3" />
            <span>आपतकालीन नम्बरहरू</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="max-w-6xl mx-auto mt-2 pt-2 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2 p-1.5 bg-white/80 rounded-lg border border-amber-200">
            <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
            <span><strong>नेपाल प्रहरी (Police):</strong> १००</span>
          </div>
          <div className="flex items-center gap-2 p-1.5 bg-white/80 rounded-lg border border-amber-200">
            <PhoneCall className="w-3.5 h-3.5 text-red-600" />
            <span><strong>एम्बुलेन्स सेवा (Ambulance):</strong> १०२</span>
          </div>
          <div className="flex items-center gap-2 p-1.5 bg-white/80 rounded-lg border border-amber-200">
            <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
            <span><strong>दमकल / वारुणयन्त्र (Fire):</strong> १०१</span>
          </div>
        </div>
      )}
    </div>
  );
};
