import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { Language } from '../types';

interface PWAInstallBannerProps {
  lang: Language;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already installed as standalone PWA, don't show full banner, but keep minimal status if needed
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {/* Top / Header Quick Install Pill */}
      <button
        onClick={handleInstallClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition shadow-sm"
        title="Install on Android or iOS"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">
          {lang === 'ne' ? 'एप इन्स्टल (iOS/Android)' : lang === 'mai' ? 'एप इन्स्टल' : 'Install App'}
        </span>
        <span className="sm:hidden">
          {lang === 'ne' ? 'इन्स्टल' : 'Install'}
        </span>
      </button>

      {/* Guide Modal for iOS Safari & Android */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {lang === 'ne' ? 'मोबाइलमा इन्स्टल गर्नुहोस्' : lang === 'mai' ? 'मोबाइलमे इन्स्टल करू' : 'Install on Mobile'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    iOS (iPhone) र Android दुवैमा प्रत्यक्ष चल्ने प्रणाली
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* iPhone / iOS Guide */}
              <div className={`p-3.5 rounded-xl border ${isIOS ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm mb-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">1</span>
                  <span>iPhone / iPad (Apple Safari) मा इन्स्टल गर्ने तरिका:</span>
                </div>
                <ol className="text-xs text-slate-600 space-y-2 pl-2">
                  <li className="flex items-start gap-2">
                    <Share2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>सफारी (Safari) ब्राउजरको तल्लो पट्टीमा रहेको <strong>Share (सेयर)</strong> बटन थिच्नुहोस्।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <PlusSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>तल सारेर <strong>'Add to Home Screen' (होम स्क्रिनमा थप्नुहोस्)</strong> छान्नुहोस्।</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>माथि दायाँको <strong>'Add'</strong> थिच्नुहोस्। एप तुरुन्त तपाईंको फोन स्क्रिनमा आउनेछ।</span>
                  </li>
                </ol>
              </div>

              {/* Android Guide */}
              <div className="p-3.5 rounded-xl border bg-emerald-50/60 border-emerald-200">
                <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm mb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center">2</span>
                  <span>Android (Chrome / Samsung Internet) मा:</span>
                </div>
                <p className="text-xs text-slate-600 mb-2">
                  ब्राउजरको माथिल्लो दायाँ तीन थोप्ला (⋮) मा थिचेर <strong>'Install app'</strong> वा <strong>'Add to Home screen'</strong> छनोट गर्नुहोस्।
                </p>
                {isInstallable && (
                  <button
                    onClick={async () => {
                      await install();
                      setShowGuide(false);
                    }}
                    className="w-full mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition shadow"
                  >
                    <Download className="w-4 h-4" />
                    अहिले नै Android मा सिधै इन्स्टल गर्नुहोस्
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                बुझें / बन्द गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
