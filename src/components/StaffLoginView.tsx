import React, { useState } from 'react';
import { Lock, Mail, KeyRound, AlertCircle, ShieldCheck, ArrowRight, Eye, EyeOff, CheckCircle, UserPlus, LogIn } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { CivicSpinner, CivicActionLoader } from './LoadingAnimation';
import { loginStaffWithSupabase, signUpStaffWithSupabase } from '../utils/supabaseClient';
import emblemSvg from '../assets/emblem-of-nepal.svg';

interface StaffLoginViewProps {
  lang: Language;
  onLoginSuccess: (user: { username: string; role: string }) => void;
  onCancel?: () => void;
}

export const StaffLoginView: React.FC<StaffLoginViewProps> = ({
  lang,
  onLoginSuccess,
  onCancel,
}) => {
  const [email, setEmail] = useState('sakhuwananrkattigaupalika@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');

  const t = translations[lang] || translations.ne;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMsg('कृपया आफ्नो इमेल र पासवर्ड दुवै प्रविष्ट गर्नुहोस्।');
      return;
    }

    setIsLoading(true);

    try {
      if (authMode === 'register') {
        const result = await signUpStaffWithSupabase(cleanEmail, cleanPass);
        setIsLoading(false);
        if (result.success) {
          if (result.user) {
            onLoginSuccess({
              username: result.user.username,
              role: result.user.role || 'admin',
            });
          } else {
            setSuccessMsg(result.message || 'तपाईंको Supabase पासवर्ड सुरक्षित रूपमा सेट भयो! अब लगइन गर्नुहोस्।');
            setAuthMode('signin');
          }
        } else {
          setErrorMsg(result.error || 'खाता सिर्जना गर्न सकिएन।');
        }
      } else {
        // Real Supabase Authentication
        const result = await loginStaffWithSupabase(cleanEmail, cleanPass);
        setIsLoading(false);

        if (result.success && result.user) {
          onLoginSuccess({
            username: result.user.username,
            role: result.user.role || 'admin',
          });
        } else {
          setErrorMsg(
            result.error || 'अमान्य इमेल वा पासवर्ड! कृपया आफ्नो सही Supabase पासवर्ड प्रविष्ट गर्नुहोस्।'
          );
        }
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg('प्रमाणीकरणमा समस्या आयो। कृपया इन्टरनेट र Supabase जडान जाँच गर्नुहोस्।');
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Top Municipal Crest Banner */}
        <div className="bg-[#163A63] p-6 text-white text-center relative overflow-hidden">
          <div className="w-20 h-20 mx-auto rounded-full bg-white p-1.5 shadow-lg mb-3 border-2 border-amber-400 overflow-hidden flex items-center justify-center">
            <img
              src={emblemSvg}
              alt="नेपालको आधिकारिक निशान छाप (Emblem of Nepal)"
              className="w-full h-full object-contain scale-95"
            />
          </div>

          <h2 className="text-lg font-black tracking-tight leading-tight">
            {t.municipalityTitle}
          </h2>
          <p className="text-xs text-blue-200 mt-0.5">
            {t.municipalitySub}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/80 border border-blue-700/60 text-[11px] font-bold text-teal-300">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Supabase Auth — सुरक्षित कर्मचारी लगइन</span>
          </div>
        </div>

        {/* Switcher Tab: Sign In vs First-time Set Password */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setAuthMode('signin'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              authMode === 'signin'
                ? 'bg-white text-[#163A63] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 text-teal-600" />
            <span>लगइन (Sign In)</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              authMode === 'register'
                ? 'bg-white text-[#163A63] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-600" />
            <span>नयाँ पासवर्ड सेट (Set Password)</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                आधिकारिक इमेल (Official Email)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sakhuwananrkattigaupalika@gmail.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63] focus:border-transparent font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {authMode === 'register' ? 'तपाईंको नयाँ गोप्य पासवर्ड (New Password)' : 'गोप्य पासवर्ड (Password)'}
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={authMode === 'register' ? 'कम्तिमा ६ अक्षरको पासवर्ड राख्नुहोस्' : 'तपाईंको वास्तविक पासवर्ड'}
                  required
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#163A63] focus:border-transparent font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {authMode === 'register' && (
                <p className="text-[11px] text-slate-500 mt-1">
                  * यो पासवर्ड सिधै तपाईंको Supabase Authentication डाटाबेसमा सुरक्षित रूपमा सेभ हुनेछ।
                </p>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="leading-snug">{errorMsg}</p>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-start gap-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-snug">{successMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#163A63] hover:bg-blue-900 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <CivicSpinner size="sm" color="border-amber-400" />
                  <span>{authMode === 'register' ? 'पासवर्ड सेभ हुँदैछ...' : 'प्रमाणीकरण हुँदैछ...'}</span>
                </>
              ) : (
                <>
                  <span>{authMode === 'register' ? 'Supabase मा नयाँ पासवर्ड सेट गर्नुहोस्' : 'वास्तविक इमेल/पासवर्डबाट लगइन'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Real Supabase Security Note */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-[#163A63]">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>वास्तविक Supabase सुरक्षा (Real Authentication):</span>
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              अब कुनै पनि पूर्वनिर्धारित वा डमी पासवर्ड छैन। तपाईंको आधिकारिक इमेल (<span className="font-mono font-bold text-slate-900">sakhuwananrkattigaupalika@gmail.com</span>) र तपाईंले रोज्नुभएको वास्तविक पासवर्डबाट मात्र लगइन हुनेछ।
            </p>
          </div>

          {onCancel && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition underline underline-offset-2"
              >
                ← सार्वजनिक पोर्टलमा फर्कनुहोस् (Back to Public Portal)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Staff Authentication Loading Animation */}
      <CivicActionLoader
        isOpen={isLoading}
        title={authMode === 'register' ? 'नयाँ पासवर्ड दर्ता हुँदैछ...' : 'Supabase प्रमाणीकरण हुँदैछ...'}
        stepMessage="सुरक्षित Supabase Authentication जाँच..."
      />
    </div>
  );
};
