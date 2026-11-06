import React, { useState, useEffect } from 'react';
import { Bell, BellRing, BellOff, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { PWANotificationService } from '../utils/pwaNotifications';
import { Language } from '../types';

interface PWANotificationBannerProps {
  referenceNumber?: string;
  lang?: Language;
  onSubscribedChange?: (isSubscribed: boolean) => void;
  compact?: boolean;
}

export const PWANotificationBanner: React.FC<PWANotificationBannerProps> = ({
  referenceNumber,
  lang = 'ne',
  onSubscribedChange,
  compact = false,
}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    const supported = PWANotificationService.isSupported();
    setIsSupported(supported);
    if (supported) {
      setPermission(PWANotificationService.getPermission());
    }

    if (referenceNumber) {
      setIsSubscribed(PWANotificationService.isSubscribed(referenceNumber));
    }
  }, [referenceNumber]);

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    try {
      const perm = await PWANotificationService.requestPermission();
      setPermission(perm);
      if (perm === 'granted' && referenceNumber) {
        PWANotificationService.subscribe(referenceNumber);
        setIsSubscribed(true);
        if (onSubscribedChange) onSubscribedChange(true);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleToggleSubscription = () => {
    if (!referenceNumber) return;
    if (isSubscribed) {
      PWANotificationService.unsubscribe(referenceNumber);
      setIsSubscribed(false);
      if (onSubscribedChange) onSubscribedChange(false);
    } else {
      PWANotificationService.subscribe(referenceNumber);
      setIsSubscribed(true);
      if (onSubscribedChange) onSubscribedChange(true);
      if (permission !== 'granted') {
        handleEnableNotifications();
      }
    }
  };

  const handleSendTestNotification = async () => {
    const targetRef = referenceNumber || 'SKK-2026-001';
    setTestSent(true);
    await PWANotificationService.sendTestNotification(targetRef, lang);
    setTimeout(() => setTestSent(false), 3500);
  };

  if (!isSupported) {
    return null; // Browser doesn't support notifications
  }

  // Compact variant for Receipt Modal or Header
  if (compact) {
    return (
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#163A63] shrink-0" />
          <span className="font-semibold text-slate-800">
            {lang === 'en' ? 'Browser Status Notification:' : 'स्थिति परिवर्तन नोटिफिकेसन:'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {permission === 'granted' ? (
            <button
              type="button"
              onClick={handleSendTestNotification}
              className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] transition shadow-2xs"
            >
              {testSent ? '✓ सूचना पठाइयो' : 'परीक्षण अलर्ट (Test)'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={isRequesting}
              className="px-2.5 py-1 rounded-lg bg-[#163A63] hover:bg-blue-900 text-white font-bold text-[11px] transition shadow-2xs"
            >
              {isRequesting ? 'प्रतीक्षा...' : 'सक्रिय गर्नुहोस्'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full Feature Card for Citizen Tracking View
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50/90 via-white to-teal-50/70 border border-blue-200/90 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-[#163A63] text-white shadow-xs shrink-0 mt-0.5">
            {permission === 'granted' ? (
              <BellRing className="w-5 h-5 text-amber-300 animate-bounce" />
            ) : (
              <Bell className="w-5 h-5 text-teal-200" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#163A63]">
                {lang === 'en'
                  ? 'PWA Service Worker Status Alerts'
                  : 'सेवाग्राही स्थिति अलर्ट (Service Worker Notification)'}
              </h4>
              {permission === 'granted' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  सक्रिय (Active)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  अनुमति आवश्यक
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {lang === 'en'
                ? 'Get notified instantly on your phone or computer whenever municipal officers update the status of this grievance.'
                : 'सम्बन्धित वडा वा पालिका शाखाबाट यो गुनासोको स्थिति परिवर्तन हुँदा तपाईंको मोबाइल वा कम्प्युटरमा तत्काल अलर्ट आउनेछ।'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {permission !== 'granted' ? (
            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={isRequesting}
              className="px-3.5 py-2 rounded-xl bg-[#163A63] hover:bg-blue-900 active:scale-95 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>{isRequesting ? 'स्वीकार गर्नुहोस्...' : 'नोटिफिकेसन सुरु गर्नुहोस्'}</span>
            </button>
          ) : (
            <>
              {referenceNumber && (
                <button
                  type="button"
                  onClick={handleToggleSubscription}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    isSubscribed
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                  title="यस दर्ता नम्बरको सूचना अन/अफ गर्नुहोस्"
                >
                  {isSubscribed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>अलर्ट अन</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-3.5 h-3.5 text-slate-500" />
                      <span>अलर्ट बन्द</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleSendTestNotification}
                className="px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 active:scale-95 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                title="ब्राउजर नोटिफिकेशनको नमुना परीक्षण गर्नुहोस्"
              >
                <BellRing className="w-3.5 h-3.5 text-teal-200" />
                <span>{testSent ? '✓ परीक्षण अलर्ट पठाइयो' : 'परीक्षण अलर्ट (Test)'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
