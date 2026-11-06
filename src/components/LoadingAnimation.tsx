import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { Language } from '../types';
import emblemSvg from '../assets/emblem-of-nepal.svg';

interface CivicPageLoaderProps {
  onComplete?: () => void;
  lang?: Language;
  title?: string;
  subtitle?: string;
  durationMs?: number;
}

/**
 * Fullscreen Civic Page Loading Animation
 * Features official Government of Nepal circular emblem, dual animated rings,
 * progress bar, and bilingual civic messaging.
 */
export const CivicPageLoader: React.FC<CivicPageLoaderProps> = ({
  onComplete,
  lang = 'ne',
  title = 'सखुवानान्कारकट्टी गाउँपालिका',
  subtitle = 'नागरिक जनगुनासो तथा सेवा पोर्टल लोड हुँदैछ...',
  durationMs = 1500,
}) => {
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

  const stages = lang === 'en'
    ? [
        'Connecting to Municipal Secure Gateway...',
        'Validating Government of Nepal Service Protocols...',
        'Loading Civic Grievance & Ward Directory...',
        'Ready! Opening Portal...',
      ]
    : lang === 'mai'
    ? [
        'गाउँपालिकाक सुरक्षित सर्भरसँ सम्पर्क भऽ रहल अछि...',
        'नागरिक जनगुनासो डाटाबेस लोड भऽ रहल अछि...',
        'अभिलेख आ वडा प्रणाली प्रमाणीकरण...',
        'प्रणाली तयार! पोर्टल खुजि रहल अछि...',
      ]
    : [
        'सखुवानान्कारकट्टी गाउँपालिका सर्भरसँग सम्पर्क हुँदैछ...',
        'नेपाल सरकार डिजिटल सुशासन प्रोटोकल प्रमाणीकरण...',
        'नागरिक जनगुनासो तथा वडा अभिलेख लोड हुँदैछ...',
        'प्रणाली तयार! पोर्टल खुल्दैछ...',
      ];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);

      if (pct < 30) {
        setStageIndex(0);
      } else if (pct < 65) {
        setStageIndex(1);
      } else if (pct < 90) {
        setStageIndex(2);
      } else {
        setStageIndex(3);
      }

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 200);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [durationMs, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#0a1b2e] via-[#0d223a] to-[#071321] text-white px-4 overflow-hidden select-none"
    >
      {/* Civic Background Glows */}
      <div className="absolute w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-80 h-80 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      {/* Center Animated Emblem & Rings */}
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer Rotating Dash Ring in Nepal Crimson & Gold */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className="absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full border-2 border-dashed border-amber-400/60"
        />

        {/* Counter-rotating Inner Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          className="absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full border border-teal-400/40"
        />

        {/* Soft Radial Aura Pulse */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-red-600/30 to-amber-500/30 blur-md"
        />

        {/* Center Circle with Real Emblem */}
        <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white p-1.5 shadow-2xl border-2 border-amber-400 flex items-center justify-center overflow-hidden">
          <img
            src={emblemSvg}
            alt="नेपाल सरकार निशान छाप (Emblem of Nepal)"
            className="w-full h-full object-contain scale-95"
          />
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="text-center max-w-sm sm:max-w-md px-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-700/50 text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>सखुवानान्कारकट्टी गाउँपालिका, सिराहा</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
          {title}
        </h2>
        <p className="text-xs text-blue-200/80 mt-1">
          {subtitle}
        </p>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full max-w-xs sm:max-w-sm mt-6">
        <div className="flex items-center justify-between text-[11px] text-blue-200 font-semibold mb-1.5">
          <span className="truncate pr-2">{stages[stageIndex]}</span>
          <span className="font-mono text-amber-400 font-bold shrink-0">{progress}%</span>
        </div>

        <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-teal-400 shadow-sm"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Quick Skip Button */}
      {onComplete && (
        <button
          onClick={onComplete}
          className="mt-6 text-xs text-slate-400 hover:text-white transition flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-white/5 active:scale-95"
        >
          <span>छिटो प्रवेश गर्नुहोस् (Skip)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
};

interface CivicActionLoaderProps {
  isOpen: boolean;
  title: string;
  stepMessage?: string;
  lang?: Language;
}

/**
 * Modal Action Loading Animation
 * Shows during form submission, grievance search, or appointment generation.
 */
export const CivicActionLoader: React.FC<CivicActionLoaderProps> = ({
  isOpen,
  title,
  stepMessage = 'प्रणालीमा अभिलेख सुरक्षित गरिँदैछ...',
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 15 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full text-center relative overflow-hidden"
        >
          {/* Animated top indicator bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-700 via-amber-500 to-teal-500 animate-pulse" />

          {/* Animated Spinner with Emblem */}
          <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-3 border-slate-200 border-t-[#163A63] border-r-amber-500"
            />
            <div className="w-14 h-14 rounded-full bg-white p-1 flex items-center justify-center overflow-hidden border border-slate-200 shadow-xs">
              <img
                src={emblemSvg}
                alt="नेपालको आधिकारिक निशान छाप (Emblem of Nepal)"
                className="w-full h-full object-contain scale-95"
              />
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-900 leading-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping inline-block" />
            <span>{stepMessage}</span>
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            <span>सखुवानान्कारकट्टी गाउँपालिका सुरक्षित प्रणाली</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

interface CivicSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: string;
}

/**
 * Lightweight inline animated spinner
 */
export const CivicSpinner: React.FC<CivicSpinnerProps> = ({
  size = 'md',
  className = '',
  color = 'border-teal-500',
}) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      className={`rounded-full border-slate-200 border-t-current animate-spin ${sizeMap[size]} ${color} ${className}`}
      role="status"
      aria-label="loading"
    />
  );
};

/**
 * Shimmer Skeleton Loader for Cards & Details
 */
export const CivicSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className = '',
}) => {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      <div className="h-4 bg-slate-200 rounded w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-slate-100 rounded"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  );
};
