import React from 'react';
import { Home, FilePlus, Search, Calendar, Briefcase, FileText, LogOut, QrCode } from 'lucide-react';
import { Language, UserRole } from '../types';
import { translations } from '../i18n/translations';

export type ActiveTab = 'home' | 'submit' | 'track' | 'appointments' | 'staff';

interface MobileNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  lang: Language;
  currentRole: UserRole;
  isAuthenticated: boolean;
  onLogout?: () => void;
  pendingStaffCount?: number;
  onOpenQRScanner?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onTabChange,
  lang,
  currentRole,
  isAuthenticated,
  onLogout,
  pendingStaffCount = 0,
  onOpenQRScanner,
}) => {
  const t = translations[lang] || translations.ne;

  // PUBLIC CITIZEN SCREEN: 5 items with center elevated QR Scanner
  if (!isAuthenticated) {
    return (
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:hidden">
        <div className="grid grid-cols-5 h-16 items-center">
          {/* 1. Home */}
          <button
            onClick={() => onTabChange('home')}
            className={`flex flex-col items-center justify-center relative py-1 px-1 transition-colors select-none ${
              activeTab === 'home' ? 'text-[#163A63] font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home className={`w-5 h-5 transition-transform ${activeTab === 'home' ? 'scale-110 text-[#163A63]' : ''}`} />
            <span className={`text-[10px] mt-1 truncate max-w-full leading-none ${activeTab === 'home' ? 'font-bold' : 'font-medium'}`}>
              {t.navHome}
            </span>
            {activeTab === 'home' && (
              <div className="absolute top-0 w-8 h-1 bg-[#163A63] rounded-full" />
            )}
          </button>

          {/* 2. Submit */}
          <button
            onClick={() => onTabChange('submit')}
            className={`flex flex-col items-center justify-center relative py-1 px-1 transition-colors select-none ${
              activeTab === 'submit' ? 'text-[#163A63] font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FilePlus className={`w-5 h-5 transition-transform ${activeTab === 'submit' ? 'scale-110 text-[#163A63]' : ''}`} />
            <span className={`text-[10px] mt-1 truncate max-w-full leading-none ${activeTab === 'submit' ? 'font-bold' : 'font-medium'}`}>
              {t.navSubmit}
            </span>
            {activeTab === 'submit' && (
              <div className="absolute top-0 w-8 h-1 bg-[#163A63] rounded-full" />
            )}
          </button>

          {/* 3. Center Elevated QR Tracker Scanner Button */}
          <div className="flex flex-col items-center justify-center relative -mt-5">
            <button
              onClick={() => {
                if (onOpenQRScanner) {
                  onOpenQRScanner();
                } else {
                  onTabChange('track');
                }
              }}
              className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#163A63] to-teal-600 text-white flex items-center justify-center shadow-lg border-2 border-white active:scale-90 transition-transform"
              title="QR कोड स्क्यानर (Scan Receipt QR)"
            >
              <QrCode className="w-6 h-6 text-teal-200" />
            </button>
            <span className="text-[9.5px] mt-0.5 font-bold text-teal-800 tracking-tight">
              QR स्क्यान
            </span>
          </div>

          {/* 4. Track */}
          <button
            onClick={() => onTabChange('track')}
            className={`flex flex-col items-center justify-center relative py-1 px-1 transition-colors select-none ${
              activeTab === 'track' ? 'text-[#163A63] font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className={`w-5 h-5 transition-transform ${activeTab === 'track' ? 'scale-110 text-[#163A63]' : ''}`} />
            <span className={`text-[10px] mt-1 truncate max-w-full leading-none ${activeTab === 'track' ? 'font-bold' : 'font-medium'}`}>
              {t.navTrack}
            </span>
            {activeTab === 'track' && (
              <div className="absolute top-0 w-8 h-1 bg-[#163A63] rounded-full" />
            )}
          </button>

          {/* 5. Appointments */}
          <button
            onClick={() => onTabChange('appointments')}
            className={`flex flex-col items-center justify-center relative py-1 px-1 transition-colors select-none ${
              activeTab === 'appointments' ? 'text-[#163A63] font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className={`w-5 h-5 transition-transform ${activeTab === 'appointments' ? 'scale-110 text-[#163A63]' : ''}`} />
            <span className={`text-[10px] mt-1 truncate max-w-full leading-none ${activeTab === 'appointments' ? 'font-bold' : 'font-medium'}`}>
              {t.navAppointments}
            </span>
            {activeTab === 'appointments' && (
              <div className="absolute top-0 w-8 h-1 bg-[#163A63] rounded-full" />
            )}
          </button>
        </div>
      </nav>
    );
  }

  // AUTHENTICATED STAFF SCREEN: Dedicated staff mobile navigation
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 text-white z-40 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.3)] md:hidden">
      <div className="grid grid-cols-5 h-16 items-center">
        {/* Staff Dashboard */}
        <button
          onClick={() => onTabChange('staff')}
          className={`flex flex-col items-center justify-center relative py-1 px-1 transition-colors select-none ${
            activeTab === 'staff' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <Briefcase className={`w-5 h-5 transition-transform ${activeTab === 'staff' ? 'scale-110 text-teal-400' : ''}`} />
            {pendingStaffCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                {pendingStaffCount}
              </span>
            )}
          </div>
          <span className={`text-[10px] mt-1 truncate max-w-full leading-none ${activeTab === 'staff' ? 'font-bold' : 'font-medium'}`}>
            कार्यक्षेत्र
          </span>
          {activeTab === 'staff' && (
            <div className="absolute top-0 w-8 h-1 bg-teal-400 rounded-full" />
          )}
        </button>

        {/* Desk */}
        <button
          onClick={() => onTabChange('submit')}
          className={`flex flex-col items-center justify-center relative py-1 px-1 transition-colors select-none ${
            activeTab === 'submit' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className={`w-5 h-5 transition-transform ${activeTab === 'submit' ? 'scale-110 text-teal-400' : ''}`} />
          <span className={`text-[10px] mt-1 truncate max-w-full leading-none ${activeTab === 'submit' ? 'font-bold' : 'font-medium'}`}>
            दर्ता डेस्क
          </span>
          {activeTab === 'submit' && (
            <div className="absolute top-0 w-8 h-1 bg-teal-400 rounded-full" />
          )}
        </button>

        {/* Center QR Scanner for Staff (e.g. scanning citizen receipts at municipal desk) */}
        <div className="flex flex-col items-center justify-center relative -mt-5">
          <button
            onClick={() => {
              if (onOpenQRScanner) {
                onOpenQRScanner();
              } else {
                onTabChange('track');
              }
            }}
            className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-slate-900 active:scale-90 transition-transform"
            title="रसिद QR स्क्यान गर्नुहोस्"
          >
            <QrCode className="w-6 h-6 text-white" />
          </button>
          <span className="text-[9.5px] mt-0.5 font-bold text-teal-300 tracking-tight">
            QR स्क्यान
          </span>
        </div>

        {/* Track */}
        <button
          onClick={() => onTabChange('track')}
          className={`flex flex-col items-center justify-center relative py-1 px-1 transition-colors select-none ${
            activeTab === 'track' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className={`w-5 h-5 transition-transform ${activeTab === 'track' ? 'scale-110 text-teal-400' : ''}`} />
          <span className={`text-[10px] mt-1 truncate max-w-full leading-none ${activeTab === 'track' ? 'font-bold' : 'font-medium'}`}>
            ट्र्याक
          </span>
          {activeTab === 'track' && (
            <div className="absolute top-0 w-8 h-1 bg-teal-400 rounded-full" />
          )}
        </button>

        {/* Quick Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center relative py-1 px-1 text-red-400 hover:text-red-300 transition-colors select-none"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] mt-1 truncate max-w-full leading-none font-bold">
              लगआउट
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
