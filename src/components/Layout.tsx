import React, { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Download,
  Eye,
  LayoutDashboard,
  LogIn,
  Plus,
  ReceiptText,
  Settings,
  Users,
  WifiOff,
} from 'lucide-react';
import { useBillBook } from '../context/BillBookContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AppRoute } from '../types/models';

interface LayoutProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activeRoute, onNavigate, children }) => {
  const { t, settings, language, isDemoMode, signInFromDemo, exitDemoMode } = useBillBook();
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [signingInDemo, setSigningInDemo] = useState(false);

  const navItems: Array<{ id: AppRoute; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: t.nav.dashboard, icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'billing', label: t.nav.billing, icon: <ReceiptText className="w-5 h-5" /> },
    { id: 'customers', label: t.nav.customers, icon: <Users className="w-5 h-5" /> },
    { id: 'udhar', label: t.nav.udhar, icon: <BookOpen className="w-5 h-5" /> },
    { id: 'reports', label: t.nav.reports, icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'settings', label: t.nav.settings, icon: <Settings className="w-5 h-5" /> },
  ];

  const mobileTabs = navItems.slice(0, 5);
  const currentTitle = navItems.find((n) => n.id === activeRoute)?.label ?? t.appName;
  const shopDisplayName =
    language === 'gu'
      ? settings.shopNameGu || settings.shopName
      : settings.shopName || settings.shopNameGu;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#09111E] text-slate-900 dark:text-slate-100">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0F294A] dark:bg-[#0B1526] text-white border-r border-slate-800/40 z-30">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-white/10">
          {settings.logoBase64 ? (
            <img
              src={settings.logoBase64}
              alt={shopDisplayName}
              className="w-9 h-9 rounded-lg object-cover bg-white shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">
              ₹
            </div>
          )}
          <span className="text-base font-bold tracking-tight whitespace-nowrap truncate">
            {t.appName}
          </span>
        </div>

        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-xs text-blue-200/80 truncate">{shopDisplayName}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main Navigation">
          {navItems.map((item) => {
            const active = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer min-h-[44px] ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-200/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="whitespace-nowrap truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {!isInstalled && (isInstallable || isIOS) && (
          <div className="p-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => (isInstallable ? install() : setShowIOSGuide(true))}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2.5 text-xs font-medium text-white transition-colors cursor-pointer min-h-[44px]"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{t.common.installApp}</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Desktop Top Bar (3-zone contract: Page Title — Spacer/Shop — Primary CTA) */}
        <header className="hidden lg:flex h-16 items-center justify-between gap-8 px-8 bg-white dark:bg-[#111C2E] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            {currentTitle}
          </h1>

          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400 truncate">
            <span>{shopDisplayName}</span>
            {!isOnline && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <WifiOff className="w-4 h-4" />
                  {language === 'gu' ? 'ઓફલાઇન' : 'Offline'}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('billing')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F294A] hover:bg-[#163864] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{t.dashboard.createBill}</span>
            </button>
          </div>
        </header>

        {/* Mobile Compact Top Bar (52px height) */}
        <header className="lg:hidden sticky top-0 z-30 h-[52px] px-4 flex items-center justify-between gap-3 bg-[#0F294A] dark:bg-[#0B1526] text-white border-b border-white/10">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer min-h-[44px]"
          >
            {settings.logoBase64 ? (
              <img
                src={settings.logoBase64}
                alt={shopDisplayName}
                className="w-7 h-7 rounded-md object-cover bg-white shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                ₹
              </div>
            )}
            <span className="text-sm font-semibold truncate">{currentTitle}</span>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {!isOnline && (
              <span
                className="p-2 text-amber-300"
                title={t.offlineReady}
                aria-label={t.offlineReady}
              >
                <WifiOff className="w-4 h-4" />
              </span>
            )}
            {!isInstalled && (isInstallable || isIOS) && (
              <button
                type="button"
                onClick={() => (isInstallable ? install() : setShowIOSGuide(true))}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                aria-label={t.common.installApp}
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                activeRoute === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-slate-200'
              }`}
              aria-label={t.nav.settings}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Demo / Preview Mode Banner */}
        {isDemoMode && (
          <div className="bg-blue-50 dark:bg-blue-950/50 border-b border-blue-200 dark:border-blue-900/60 px-4 py-2.5 lg:px-8">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-[#0F294A] dark:bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  <Eye className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#0F294A] dark:text-blue-200 truncate">
                    {t.onboarding.demoBannerTitle}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                    {t.onboarding.demoBannerSubtitle}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={signingInDemo}
                  onClick={() => void exitDemoMode()}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111C2E] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer min-h-[36px] disabled:opacity-60"
                >
                  {t.onboarding.exitDemo}
                </button>
                <button
                  type="button"
                  disabled={signingInDemo}
                  onClick={async () => {
                    setSigningInDemo(true);
                    try {
                      await signInFromDemo();
                    } finally {
                      setSigningInDemo(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F294A] hover:bg-[#163864] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold shadow-xs cursor-pointer min-h-[36px] disabled:opacity-60"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {signingInDemo ? t.onboarding.signingIn : t.onboarding.signInToContinue}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content Viewport */}
        <main className="flex-1 px-4 py-5 pb-24 lg:px-8 lg:py-7 lg:pb-10 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Fixed Bottom Navigation Bar (56px height, >=44px touch targets) */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#111C2E]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
          aria-label="Mobile Navigation"
        >
          <div className="grid grid-cols-5 h-14 items-center">
            {mobileTabs.map((tab) => {
              const active = activeRoute === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onNavigate(tab.id)}
                  className={`flex flex-col items-center justify-center min-h-[44px] px-1 transition-colors cursor-pointer ${
                    active
                      ? 'text-[#0F294A] dark:text-blue-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span className={active ? 'text-blue-600 dark:text-blue-400' : ''}>
                    {tab.icon}
                  </span>
                  <span className="text-[10px] leading-tight mt-0.5 truncate max-w-full">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* iOS PWA Install Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t.common.installApp}
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === 'gu'
                ? '૧. Safari બ્રાઉઝરમાં નીચે Share બટન પર ટેપ કરો.\n૨. નીચે સ્ક્રોલ કરીને "Add to Home Screen" પસંદ કરો.'
                : '1. Tap the Share button in your Safari toolbar.\n2. Scroll down and tap "Add to Home Screen".'}
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-[#0F294A] dark:bg-blue-600 py-2.5 text-sm font-medium text-white cursor-pointer min-h-[44px]"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
