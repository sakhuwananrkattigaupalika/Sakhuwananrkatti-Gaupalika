import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { PWAInstallBanner } from './PWAInstallBanner';
import { Shield, ChevronDown, Check, Globe, LogOut, QrCode } from 'lucide-react';
import emblemSvg from '../assets/emblem-of-nepal.svg';

interface HeaderProps {
  lang: Language;
  onLangChange: (lang: Language) => void;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  onOpenQRScanner?: () => void;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onLangChange,
  isAuthenticated,
  onLogout,
  onOpenQRScanner,
  onRefresh,
}) => {
  const t = translations[lang] || translations.ne;
  const [showLangMenu, setShowLangMenu] = useState(false);

  return (
    <header className="bg-[#163A63] text-white border-b border-blue-950 shadow-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-3">
        {/* Municipality Emblem & Branding */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white p-1 shadow-md shrink-0 flex items-center justify-center border-2 border-amber-400 overflow-hidden"
            title="नेपालको आधिकारिक निशान छाप (Emblem of Nepal) - सखुवानान्कारकट्टी गाउँपालिका"
          >
            <img
              src={emblemSvg}
              alt="नेपालको आधिकारिक निशान छाप (Emblem of Nepal)"
              className="w-full h-full object-contain object-center scale-95"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-lg font-extrabold tracking-tight leading-tight text-white drop-shadow-xs">
                {t.municipalityTitle}
              </h1>
              <span className="hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-900 uppercase">
                सिराहा
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-blue-100 font-medium leading-none mt-0.5">
              {t.municipalitySub}
            </p>
            <p className="text-[10px] sm:text-[11px] text-teal-300 font-semibold tracking-wide mt-0.5 hidden xs:block">
              {t.portalTitle}
            </p>
          </div>
        </div>

        {/* Action Controls: QR Scanner, PWA Install, Language, Role Selector */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick QR Scanner Button */}
          {onOpenQRScanner && (
            <button
              onClick={onOpenQRScanner}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold border border-teal-400/50 shadow-xs transition active:scale-95"
              title="रसिद वा टोकन QR स्क्यान गर्नुहोस्"
            >
              <QrCode className="w-3.5 h-3.5 text-teal-100" />
              <span className="hidden sm:inline">QR स्क्यान</span>
            </button>
          )}



          {/* PWA Install Button */}
          <PWAInstallBanner lang={lang} />

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowLangMenu(!showLangMenu);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-900/80 hover:bg-blue-800 text-xs font-medium border border-blue-700/60 transition"
              aria-label="Change language"
            >
              <Globe className="w-3.5 h-3.5 text-blue-300" />
              <span className="uppercase font-bold text-[11px]">{lang}</span>
              <ChevronDown className="w-3 h-3 text-blue-300" />
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-xl py-1 z-50 border border-slate-200 text-slate-800 animate-in fade-in">
                <button
                  onClick={() => {
                    onLangChange('ne');
                    setShowLangMenu(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-slate-100 ${
                    lang === 'ne' ? 'font-bold text-blue-700 bg-blue-50' : ''
                  }`}
                >
                  <span>नेपाली</span>
                  {lang === 'ne' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
                <button
                  onClick={() => {
                    onLangChange('en');
                    setShowLangMenu(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-slate-100 ${
                    lang === 'en' ? 'font-bold text-blue-700 bg-blue-50' : ''
                  }`}
                >
                  <span>English</span>
                  {lang === 'en' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
                <button
                  onClick={() => {
                    onLangChange('mai');
                    setShowLangMenu(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-slate-100 ${
                    lang === 'mai' ? 'font-bold text-blue-700 bg-blue-50' : ''
                  }`}
                >
                  <span>मैथिली</span>
                  {lang === 'mai' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              </div>
            )}
          </div>

          {/* Authenticated Staff Badge (Admin) */}
          {isAuthenticated && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-800/80 text-white text-xs font-semibold border border-teal-600/60 shadow-xs">
              <Shield className="w-3.5 h-3.5 text-teal-300" />
              <span>प्रशासक (Admin)</span>
            </div>
          )}

          {/* Secure Logout / Lock App Button */}
          {isAuthenticated && onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-800/80 hover:bg-red-700 text-white text-xs font-bold border border-red-600/60 transition shadow-xs"
              title="Lock portal & Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">लगआउट</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
