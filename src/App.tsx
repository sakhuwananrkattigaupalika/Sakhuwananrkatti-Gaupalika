/**
 * Sakhuwanankarkatti Citizen Grievance & Chairperson Portal
 * Pure Public Citizen Experience (Zero Staff buttons/tabs visible to public)
 * Separate Staff Portal: accessed via private link or URL (?staff=true) and secured by login
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole, Language, Complaint } from './types';
import { Header } from './components/Header';
import { EmergencyBanner } from './components/EmergencyBanner';
import { OfflineBanner } from './components/OfflineBanner';
import { MobileNav, ActiveTab } from './components/MobileNav';
import { HomeView } from './components/HomeView';
import { CitizenSubmitView } from './components/CitizenSubmitView';
import { CitizenTrackView } from './components/CitizenTrackView';
import { ChairpersonAppointmentsView } from './components/ChairpersonAppointmentsView';
import { StaffDashboardView } from './components/StaffDashboardView';
import { StaffLoginView } from './components/StaffLoginView';
import { ReceiptModal } from './components/ReceiptModal';
import { PrivacyGovernanceModal } from './components/PrivacyGovernanceModal';
import { CivicPageLoader } from './components/LoadingAnimation';
import { QRScannerModal } from './components/QRScannerModal';
import { LocalMunicipalityDB } from './utils/storage';
import { PWANotificationService } from './utils/pwaNotifications';
import { translations } from './i18n/translations';
import { LogOut, Briefcase, FileText, CheckCircle2, QrCode } from 'lucide-react';

const AUTH_STORAGE_KEY = 'skk_staff_auth_session_v1';

export default function App() {
  const [lang, setLang] = useState<Language>('ne');
  const [activeWard, setActiveWard] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  // Initial App Preloader & Refresh Loading Animation State
  const [isAppLoading, setIsAppLoading] = useState<boolean>(true);

  // Staff Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [currentRole, setCurrentRole] = useState<UserRole>('admin');

  // Tracking query & submitted popup
  const [trackRef, setTrackRef] = useState<string>('');
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showQRScanner, setShowQRScanner] = useState<boolean>(false);

  const handleScanSuccess = (ref: string) => {
    setTrackRef(ref);
    setActiveTab('track');
    setShowQRScanner(false);
  };

  // Check URL query parameters (e.g. ?ref=SKK... or ?staff=true) & keyboard shortcut (Alt+S)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      const isStaffPortalRequest =
        params.get('staff') === 'true' ||
        params.get('portal') === 'staff' ||
        params.get('admin') === 'true';

      if (ref) {
        setTrackRef(ref);
        setActiveTab('track');
      } else if (isStaffPortalRequest) {
        setActiveTab('staff');
      }

      // Keyboard shortcut: Alt+S or Ctrl+Shift+S opens Staff Portal login directly
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.altKey && e.key.toLowerCase() === 's') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's')) {
          e.preventDefault();
          setActiveTab('staff');
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  // PWA Service Worker Status Watcher for Subscribed Grievances
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkUpdates = () => {
      try {
        const complaints = LocalMunicipalityDB.getComplaints();
        PWANotificationService.checkAndNotifyStatusUpdates(complaints, lang);
      } catch (err) {
        console.warn('Status check error:', err);
      }
    };

    // Run on initial mount
    checkUpdates();

    // Listen to storage events from other tabs/windows
    window.addEventListener('storage', checkUpdates);

    // Poll periodically for grievance status transitions
    const interval = setInterval(checkUpdates, 15000);

    return () => {
      window.removeEventListener('storage', checkUpdates);
      clearInterval(interval);
    };
  }, [lang]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentRole('admin');
    setActiveTab('staff');
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
    } catch (e) {
      console.error('Failed to save session', e);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentRole('citizen');
    setActiveTab('home'); // return to clean public screen
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  };

  const handleSubmitted = (newComplaint: Complaint) => {
    setSubmittedComplaint(newComplaint);
    setTrackRef(newComplaint.referenceNumber);
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const t = translations[lang] || translations.ne;

  return (
    <div className="min-h-screen-safe flex flex-col bg-slate-50 text-slate-900 pb-20 md:pb-8 selection:bg-[#163A63] selection:text-white">
      {/* Fullscreen Civic Loading Animation on App Load & Refresh */}
      <AnimatePresence>
        {isAppLoading && (
          <CivicPageLoader
            lang={lang}
            durationMs={1300}
            onComplete={() => setIsAppLoading(false)}
          />
        )}
      </AnimatePresence>

      {/* Offline Status Bar */}
      <OfflineBanner />

      {/* Emergency & Helpline Banner */}
      <EmergencyBanner lang={lang} />

      {/* Municipal Top Header with Fitted Emblem, Language and Staff Logout Status */}
      <Header
        lang={lang}
        onLangChange={setLang}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        onOpenQRScanner={() => setShowQRScanner(true)}
        onRefresh={() => setIsAppLoading(true)}
      />

      {/* Desktop Navigation Bar */}
      <div className="hidden md:block bg-white border-b border-slate-200 sticky top-16 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          {/* A. PUBLIC USER NAVIGATION (When NOT logged in as staff: ZERO staff buttons visible!) */}
          {!isAuthenticated ? (
            <nav className="flex items-center space-x-1 py-1">
              <button
                onClick={() => handleTabChange('home')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'home'
                    ? 'bg-blue-50 text-[#163A63]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t.navHome}
              </button>

              <button
                onClick={() => handleTabChange('submit')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'submit'
                    ? 'bg-blue-50 text-[#163A63]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t.navSubmit}
              </button>

              <button
                onClick={() => handleTabChange('track')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'track'
                    ? 'bg-blue-50 text-[#163A63]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t.navTrack}
              </button>

              <button
                onClick={() => setShowQRScanner(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-teal-800 hover:text-teal-950 hover:bg-teal-50 transition flex items-center gap-1.5"
                title="रसिद वा टोकन QR स्क्यानर"
              >
                <QrCode className="w-3.5 h-3.5 text-teal-600" />
                <span>QR स्क्यान</span>
              </button>

              <button
                onClick={() => handleTabChange('appointments')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'appointments'
                    ? 'bg-blue-50 text-[#163A63]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t.navAppointments}
              </button>
            </nav>
          ) : (
            /* B. DEDICATED STAFF OPERATIONS NAVIGATION (Visible ONLY when logged in as staff) */
            <nav className="flex items-center space-x-1 py-1">
              <button
                onClick={() => handleTabChange('staff')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'staff'
                    ? 'bg-[#163A63] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>कार्यक्षेत्र (Staff Dashboard)</span>
              </button>

              <button
                onClick={() => handleTabChange('submit')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'submit'
                    ? 'bg-blue-50 text-[#163A63]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>उजुरी दर्ता डेस्क</span>
              </button>

              <button
                onClick={() => handleTabChange('appointments')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'appointments'
                    ? 'bg-blue-50 text-[#163A63]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{t.navAppointments}</span>
              </button>

              <button
                onClick={() => handleTabChange('track')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'track'
                    ? 'bg-blue-50 text-[#163A63]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{t.navTrack}</span>
              </button>

              <button
                onClick={handleLogout}
                className="ml-2 px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 hover:bg-red-50 border border-red-200 transition flex items-center gap-1"
                title="Exit Staff Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>लगआउट</span>
              </button>
            </nav>
          )}

          <div className="flex items-center gap-3 text-xs">
            <div className="text-[11px] text-slate-500 font-medium">
              सखुवानान्कारकट्टी गाउँपालिका • सिराहा
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full"
        >
          {/* PUBLIC VIEW: Home View */}
          {activeTab === 'home' && (
            <HomeView
              lang={lang}
              onNavigate={handleTabChange}
              onOpenPrivacy={() => setShowPrivacyModal(true)}
              currentRole={isAuthenticated ? currentRole : 'citizen'}
              onOpenStaffPortal={() => handleTabChange('staff')}
              onOpenQRScanner={() => setShowQRScanner(true)}
            />
          )}

          {/* PUBLIC VIEW: Citizen Grievance Submission -> Generates Form PDF */}
          {activeTab === 'submit' && (
            <CitizenSubmitView
              lang={lang}
              onSubmitted={handleSubmitted}
            />
          )}

          {/* PUBLIC VIEW: Track Grievance Status with Reference */}
          {activeTab === 'track' && (
            <CitizenTrackView
              initialRef={trackRef}
              lang={lang}
            />
          )}

          {/* PUBLIC VIEW: Chairperson Appointments Request */}
          {activeTab === 'appointments' && (
            <ChairpersonAppointmentsView
              lang={lang}
              currentRole={isAuthenticated ? currentRole : 'citizen'}
            />
          )}

          {/* SEPARATE STAFF PORTAL: Login Screen if not authenticated, Dashboard if authenticated */}
          {activeTab === 'staff' && (
            isAuthenticated ? (
              <StaffDashboardView
                currentRole={currentRole}
                lang={lang}
                activeWard={activeWard}
              />
            ) : (
              <StaffLoginView
                lang={lang}
                onLoginSuccess={handleLoginSuccess}
                onCancel={() => handleTabChange('home')}
              />
            )
          )}
        </motion.div>
      </main>

      {/* iOS & Android Bottom Navigation Bar (Public: 5 items with center QR; Staff: Dedicated Staff Bar) */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        lang={lang}
        currentRole={isAuthenticated ? currentRole : 'citizen'}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        onOpenQRScanner={() => setShowQRScanner(true)}
        pendingStaffCount={
          isAuthenticated
            ? LocalMunicipalityDB.getComplaints().filter((c) => c.status === 'Submitted').length
            : undefined
        }
      />

      {/* Printable / Downloadable Official PDF Receipt Modal */}
      {submittedComplaint && (
        <ReceiptModal
          complaint={submittedComplaint}
          onClose={() => {
            setSubmittedComplaint(null);
            setActiveTab(isAuthenticated ? 'staff' : 'track');
          }}
          lang={lang}
        />
      )}

      {/* Privacy Policy & Governance Modal */}
      <PrivacyGovernanceModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        lang={lang}
      />

      {/* Municipal QR Tracker Scanner Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanSuccess={handleScanSuccess}
        lang={lang}
      />
    </div>
  );
}
