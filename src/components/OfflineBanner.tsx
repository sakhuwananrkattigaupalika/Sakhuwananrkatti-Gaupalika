import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-600 text-white text-xs px-4 py-2 flex items-center justify-center gap-2 font-medium shadow-md">
      <WifiOff className="w-4 h-4 animate-bounce" />
      <span>अफलाइन मोड (Offline Mode) — तपाईंको डिभाइसमा सुरक्षित डाटा देखाइँदैछ। नयाँ दर्ताका लागि इन्टरनेट आवश्यक पर्दछ।</span>
    </div>
  );
};
