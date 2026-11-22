import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ExternalLink, Globe, RefreshCw, ShieldCheck, WifiOff } from 'lucide-react';
import { useBillBook } from '../../context/BillBookContext';
import { GoogleSignInErrorKind, GoogleSignInFailure } from '../../firebase/firebaseApp';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const GoogleGIcon: React.FC = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.44a5.51 5.51 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.57-5.15 3.57-8.65z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.96H1.28v3.1A12 12 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.28A7.22 7.22 0 0 1 4.9 12c0-.79.14-1.56.38-2.28v-3.1H1.28A12 12 0 0 0 0 12c0 1.93.46 3.76 1.28 5.38l4-3.1z"
    />
    <path
      fill="#EA4335"
      d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4 3.1c.95-2.85 3.6-4.96 6.72-4.96z"
    />
  </svg>
);

interface MappedAuthError {
  kind: GoogleSignInErrorKind;
  message: string;
  code?: string;
  detail?: string;
}

export const WelcomeScreen: React.FC = () => {
  const {
    t,
    language,
    setLanguage,
    signInWithGoogle,
    signInWithGoogleUsingRedirect,
    authRedirectError,
    clearAuthRedirectError,
  } = useBillBook();
  const isOnline = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [redirectLoading, setRedirectLoading] = useState(false);
  const [authError, setAuthError] = useState<MappedAuthError | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isInIframe = useMemo(() => {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  }, []);

  const mapSignInFailure = (err: unknown): MappedAuthError => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (err instanceof GoogleSignInFailure) {
      let message: string = t.onboarding.errorGeneric;
      if (err.kind === 'popup_closed') {
        message = t.onboarding.errorPopupClosed;
      } else if (err.kind === 'popup_blocked') {
        message = t.onboarding.errorPopupBlocked;
      } else if (err.kind === 'unauthorized_domain') {
        message = t.onboarding.errorUnauthorizedDomain.replace('{{host}}', host);
      } else if (err.kind === 'operation_not_allowed') {
        message = t.onboarding.errorOperationNotAllowed;
      } else if (err.kind === 'unsupported_env') {
        message = t.onboarding.errorUnsupportedEnv;
      } else if (err.kind === 'network') {
        message = t.onboarding.errorNetwork;
      }
      return {
        kind: err.kind,
        message,
        code: err.errorCode,
        detail: err.message,
      };
    }
    return {
      kind: 'generic',
      message: t.onboarding.errorGeneric,
      detail: err instanceof Error ? err.message : String(err),
    };
  };

  useEffect(() => {
    if (authRedirectError) {
      setAuthError(mapSignInFailure(authRedirectError));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authRedirectError, language]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    clearAuthRedirectError();
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (mountedRef.current) {
        setAuthError(mapSignInFailure(err));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleRedirectLogin = async () => {
    setAuthError(null);
    clearAuthRedirectError();
    setRedirectLoading(true);
    try {
      await signInWithGoogleUsingRedirect();
    } catch (err) {
      if (mountedRef.current) {
        setAuthError(mapSignInFailure(err));
        setRedirectLoading(false);
      }
    }
  };

  const showFallbackActions =
    authError !== null &&
    (authError.kind === 'popup_blocked' ||
      authError.kind === 'popup_closed' ||
      authError.kind === 'unsupported_env' ||
      authError.kind === 'generic');

  const highlights =
    language === 'gu'
      ? [
          'ઝડપી GST-તૈયાર PDF બિલ અને WhatsApp શેરિંગ',
          'ગ્રાહક મુજબ ઉધાર ખાતું અને આંશિક ચુકવણી',
          'દૈનિક, માસિક અને વાર્ષિક વેચાણ રિપોર્ટ',
        ]
      : [
          'Fast PDF invoices with WhatsApp sharing',
          'Customer Udhar Khata & partial payment ledger',
          'Daily, monthly & yearly store sales reports',
        ];

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-50 dark:bg-[#09111E] text-slate-900 dark:text-slate-100">
      {/* Top Language Bar */}
      <header className="w-full px-5 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <img
            src="/icon.svg"
            alt="Techy BillBook"
            className="w-8 h-8 rounded-lg"
            referrerPolicy="no-referrer"
          />
          <span className="text-base font-bold text-[#0F294A] dark:text-white">
            {t.appName}
          </span>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
          <button
            type="button"
            onClick={() => setLanguage('gu')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer min-h-[34px] ${
              language === 'gu'
                ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            ગુજરાતી
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer min-h-[34px] ${
              language === 'en'
                ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            English
          </button>
        </div>
      </header>

      {/* Main Responsive Split Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          {/* Left Navy Brand Panel */}
          <div className="lg:col-span-6 bg-[#0F294A] dark:bg-[#0B1526] text-white p-7 sm:p-10 flex flex-col justify-between gap-8">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white p-2 shadow-md">
                <img
                  src="/icon.svg"
                  alt="Techy BillBook Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {t.onboarding.welcomeTitle}
                </h1>
                {language === 'gu' && (
                  <p className="text-xs font-medium text-blue-200/80 mt-1">
                    {t.onboarding.welcomeTitleEn}
                  </p>
                )}
                <p className="mt-3 text-sm text-blue-100/90 leading-relaxed">
                  {t.onboarding.welcomeSubtitle}
                </p>
              </div>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-blue-100/90">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Google Sign-In Panel */}
          <div className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-center space-y-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {language === 'gu' ? 'તમારા એકાઉન્ટથી શરૂ કરો' : 'Get Started'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {t.onboarding.googleHint}
              </p>
            </div>

            {!isOnline && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <WifiOff className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{t.onboarding.offlineAuthWarning}</span>
              </div>
            )}

            {authError && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-4 py-3 text-xs text-red-700 dark:text-red-300 space-y-1.5">
                <p className="leading-relaxed">{authError.message}</p>
                {import.meta.env.DEV && (authError.code || authError.detail) && (
                  <p className="text-[11px] font-mono-num text-red-600/80 dark:text-red-400/80 break-all">
                    {authError.code ? `Code: ${authError.code}` : authError.detail}
                  </p>
                )}
              </div>
            )}

            {/* Official Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || redirectLoading}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300 px-5 py-3.5 text-sm font-semibold shadow-xs transition-all cursor-pointer min-h-[50px] disabled:opacity-60"
            >
              <GoogleGIcon />
              <span>{loading ? t.onboarding.signingIn : t.onboarding.continueWithGoogle}</span>
            </button>

            {/* Fallback options if popup is blocked / restricted in iframe or mobile browser */}
            {showFallbackActions && (
              <div className="space-y-2.5 pt-1">
                {!isInIframe && (
                  <button
                    type="button"
                    onClick={handleRedirectLogin}
                    disabled={loading || redirectLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 px-4 py-3 text-xs font-semibold transition-colors cursor-pointer min-h-[44px] disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${redirectLoading ? 'animate-spin' : ''}`} />
                    <span>{t.onboarding.tryRedirectSignIn}</span>
                  </button>
                )}

                {isInIframe && typeof window !== 'undefined' && (
                  <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3.5 space-y-2.5">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {t.onboarding.iframePopupHint}
                    </p>
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F294A] hover:bg-[#163864] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 py-2.5 text-xs font-semibold min-h-[40px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t.onboarding.openInNewTabHint}</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {isInIframe && !showFallbackActions && typeof window !== 'undefined' && (
              <div className="flex justify-end">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t.onboarding.openInNewTabHint}</span>
                </a>
              </div>
            )}

            <div className="pt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                {language === 'gu'
                  ? 'Firebase Authentication દ્વારા સુરક્ષિત · ઓફલાઇન બિલિંગ સપોર્ટ'
                  : 'Secured by Firebase Authentication · Offline-first billing'}
              </span>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};
