import React from 'react';
import { Language, UserRole } from '../types';
import { translations } from '../i18n/translations';
import {
  FilePlus,
  Search,
  Calendar,
  Briefcase,
  ShieldCheck,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
  Download,
  QrCode,
} from 'lucide-react';
import { ActiveTab } from './MobileNav';
import { PWAInstallBanner } from './PWAInstallBanner';

interface HomeViewProps {
  lang: Language;
  onNavigate: (tab: ActiveTab) => void;
  onOpenPrivacy: () => void;
  currentRole: UserRole;
  onOpenStaffPortal?: () => void;
  onOpenQRScanner?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  lang,
  onNavigate,
  onOpenPrivacy,
  currentRole,
  onOpenStaffPortal,
  onOpenQRScanner,
}) => {
  const t = translations[lang] || translations.ne;

  const quickActions = [
    {
      id: 'quick-action-submit',
      tab: 'submit' as ActiveTab,
      title: 'गुनासो दर्ता गर्नुहोस्',
      sub: 'सडक, खानेपानी, स्वास्थ्य वा ढिलासुस्तीसम्बन्धी समस्या',
      icon: FilePlus,
      bg: 'bg-emerald-500/10 text-emerald-800 border-emerald-200',
      btnBg: 'bg-emerald-700 hover:bg-emerald-800 text-white',
      badge: 'अनलाइन फाराम',
    },
    {
      id: 'quick-action-track',
      tab: 'track' as ActiveTab,
      title: 'गुनासोको स्थिति हेर्नुहोस्',
      sub: 'दर्ता नम्बर (SKK-2026-...) राखेर प्रगति विवरण हेर्नुहोस्',
      icon: Search,
      bg: 'bg-blue-500/10 text-blue-800 border-blue-200',
      btnBg: 'bg-[#163A63] hover:bg-blue-900 text-white',
      badge: 'सिधा ट्र्याक',
    },
    {
      id: 'quick-action-qr',
      tab: 'track' as ActiveTab,
      customAction: onOpenQRScanner,
      title: 'QR स्क्यानर ट्र्याकर',
      sub: 'रसिद वा फारामको QR कोड क्यामेराबाट स्क्यान गरी सिधै स्थिति हेर्नुहोस्',
      icon: QrCode,
      bg: 'bg-teal-500/10 text-teal-900 border-teal-200',
      btnBg: 'bg-teal-700 hover:bg-teal-800 text-white',
      badge: 'मोबाइल क्यामेरा',
    },
    {
      id: 'quick-action-appointments',
      tab: 'appointments' as ActiveTab,
      title: 'अध्यक्षसँग भेटघाट समय',
      sub: 'गाउँपालिका अध्यक्षसँग प्रत्यक्ष भेटका लागि समय तालिका',
      icon: Calendar,
      bg: 'bg-amber-500/10 text-amber-900 border-amber-200',
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
      badge: 'सचिवालय समय',
    },
  ];

  const wards = [
    { ward: 1, name: 'वडा नं. १', center: 'टोल विकास केन्द्र' },
    { ward: 2, name: 'वडा नं. २', center: 'कटहा / सखुवा' },
    { ward: 3, name: 'वडा नं. ३', center: 'हाटबजार क्षेत्र' },
    { ward: 4, name: 'वडा नं. ४', center: 'मौवाही स्वास्थ्य चौकी' },
    { ward: 5, name: 'वडा नं. ५', center: 'सिमाना क्षेत्र' },
  ];

  return (
    <div className="max-w-5xl mx-auto py-5 px-3 sm:px-6 space-y-7">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#163A63] via-[#1a477a] to-[#138A83] text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-blue-900/40">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-teal-200">
            <Building className="w-3.5 h-3.5 text-teal-300" />
            <span>सखुवानान्कारकट्टी गाउँपालिका, सिराहा</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
            जनगुनासो सम्बोधन तथा नागरिक सेवा प्रणाली
          </h2>

          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            गाउँपालिकाभित्रका विकास निर्माण, सार्वजनिक सेवा प्रवाह, ढिलासुस्ती तथा जनसरोकारका विषयमा आफ्ना गुनासाहरू सहज रूपमा दर्ता गर्नुहोस् र घरमै बसेर प्रगति स्थिति ट्र्याक गर्नुहोस्।
          </p>

          <div className="pt-3 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('submit')}
              className="px-5 py-3 rounded-xl bg-white text-[#163A63] font-black text-xs sm:text-sm shadow-lg hover:bg-blue-50 active:scale-95 transition flex items-center gap-2"
            >
              <FilePlus className="w-4 h-4 text-teal-600" />
              <span>नयाँ गुनासो दर्ता गर्नुहोस्</span>
              <ArrowRight className="w-4 h-4 text-[#163A63]" />
            </button>

            <button
              onClick={() => onNavigate('track')}
              className="px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-amber-300" />
              <span>दर्ता स्थिति ट्र्याक</span>
            </button>

            {onOpenQRScanner && (
              <button
                onClick={onOpenQRScanner}
                className="px-5 py-3 rounded-xl bg-teal-500/30 hover:bg-teal-500/40 backdrop-blur-md border border-teal-300/40 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-xs"
              >
                <QrCode className="w-4 h-4 text-teal-200" />
                <span>QR स्क्यानर</span>
              </button>
            )}
          </div>
        </div>

        {/* Civic decorative background ring */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* 5 Quick Action Cards */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-800 mb-3 px-1 flex items-center gap-2">
          <span>प्रमुख सेवाहरू (Key Services)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((act) => {
            const Icon = act.icon;
            return (
              <div
                key={act.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="p-2.5 rounded-xl bg-slate-100 text-[#163A63]">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${act.bg}`}>
                      {act.badge}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    {act.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    {act.sub}
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (act.customAction) {
                      act.customAction();
                    } else {
                      onNavigate(act.tab);
                    }
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs ${act.btnBg}`}
                >
                  <span>{act.id === 'quick-action-qr' ? 'क्यामेरा खोल्नुहोस्' : 'अगाडि बढ्नुहोस्'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ward Directory (Wards 1 - 5) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              सखुवानान्कारकट्टी गाउँपालिका वडा क्षेत्र (Wards 1–5)
            </h3>
            <p className="text-xs text-slate-500">
              प्रत्येक वडामा तोकिएका गुनासो अधिकृतद्वारा प्रत्यक्ष अनुगमन
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {wards.map((w) => (
            <div
              key={w.ward}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center"
            >
              <div className="w-7 h-7 rounded-full bg-[#163A63] text-white text-xs font-bold mx-auto flex items-center justify-center mb-1.5">
                {w.ward}
              </div>
              <h5 className="font-bold text-slate-800 text-xs">{w.name}</h5>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">{w.center}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pilot Assurance & Privacy Footer Notice */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>नागरिक अधिकार र व्यक्तिगत विवरणको सुरक्षा नीतिअनुसार सञ्चालित</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onOpenPrivacy}
            className="text-blue-700 hover:text-blue-900 underline font-semibold text-xs"
          >
            गोपनीयता नीति र कानुनी नियम
          </button>

          {/* Discrete Administrative Access: Hidden from general public view */}
          {onOpenStaffPortal && (
            <button
              onClick={onOpenStaffPortal}
              className="text-slate-300 hover:text-slate-500 text-[10px] p-1 rounded-sm transition opacity-60 hover:opacity-100"
              title="अधिकृत कर्मचारी प्रवेश"
              aria-label="Staff Portal Entry"
            >
              <span>🔒</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
