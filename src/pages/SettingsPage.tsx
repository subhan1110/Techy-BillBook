import React, { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  Database,
  Download,
  Eye,
  LogIn,
  LogOut,
  Moon,
  Package,
  Save,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ProductCatalogModal } from '../components/ProductCatalogModal';
import { useBillBook } from '../context/BillBookContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { firebaseSyncAdapter } from '../repositories/firebaseAdapter';
import { billBookRepo } from '../repositories/sqliteRepository';
import { BackupSnapshot, ShopSettings } from '../types/models';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    setLanguage,
    setTheme,
    language,
    theme,
    t,
    triggerRefresh,
    userProfile,
    firebaseUser,
    logout,
    isDemoMode,
    signInFromDemo,
    exitDemoMode,
  } = useBillBook();
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const [form, setForm] = useState<ShopSettings>(settings);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showApkGuide, setShowApkGuide] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [signingInDemo, setSigningInDemo] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSaveShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    await updateSettings({
      shopName: form.shopName.trim() || 'Techy BillBook Store',
      shopNameGu: form.shopNameGu.trim() || form.shopName.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      upiId: form.upiId.trim(),
      logoBase64: form.logoBase64,
      billPrefix: form.billPrefix.trim().toUpperCase() || 'TB',
      invoiceFooterGu: form.invoiceFooterGu.trim(),
      invoiceFooterEn: form.invoiceFooterEn.trim(),
      showLogoOnInvoice: form.showLogoOnInvoice,
    });
    setSavedToast(t.settings.savedSuccess);
    setTimeout(() => setSavedToast(null), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 220;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png', 0.9);
        setForm((prev) => ({ ...prev, logoBase64: dataUrl }));
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportJson = async () => {
    if (isDemoMode) {
      setErrorMsg(t.onboarding.demoBackupBlocked);
      return;
    }
    const snapshot = await billBookRepo.exportBackup();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TechyBillBook_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportSqlite = async () => {
    if (isDemoMode) {
      setErrorMsg(t.onboarding.demoBackupBlocked);
      return;
    }
    const bytes = await billBookRepo.exportSqliteBytes();
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    const blob = new Blob([copy.buffer], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TechyBillBook_${new Date().toISOString().slice(0, 10)}.db`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestoreJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDemoMode) {
      setErrorMsg(t.onboarding.demoBackupBlocked);
      e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as BackupSnapshot;
        await billBookRepo.importBackup(parsed);
        triggerRefresh();
        const refreshed = await billBookRepo.getSettings();
        setForm(refreshed);
        setSavedToast(t.settings.restoreSuccess);
        setTimeout(() => setSavedToast(null), 3500);
      } catch {
        setErrorMsg(t.settings.restoreError);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const syncStatus = firebaseSyncAdapter.getSyncStatus();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          {t.settings.title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {t.settings.subtitle}
        </p>
      </div>

      {savedToast && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 px-4 py-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          {savedToast}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-4 py-3 text-xs font-medium text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Demo Mode Sign-In Card */}
      {isDemoMode && (
        <section className="rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F294A] dark:bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t.onboarding.demoSettingsTitle}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {t.onboarding.demoSettingsDesc}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163864] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer min-h-[42px] disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{signingInDemo ? t.onboarding.signingIn : t.onboarding.signInToContinue}</span>
            </button>

            <button
              type="button"
              disabled={signingInDemo}
              onClick={() => void exitDemoMode()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111C2E] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer min-h-[42px] disabled:opacity-60"
            >
              <span>{t.onboarding.exitDemo}</span>
            </button>
          </div>
        </section>
      )}

      {/* Google Account & Session Management */}
      {!isDemoMode && userProfile && (
        <section className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t.onboarding.accountSection}
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>{t.onboarding.syncedWithFirebase}</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-3.5 min-w-0">
              {userProfile.photoUrl || firebaseUser?.photoURL ? (
                <img
                  src={userProfile.photoUrl || firebaseUser?.photoURL || ''}
                  alt={userProfile.ownerName}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#0F294A] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {userProfile.ownerName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {userProfile.ownerName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {userProfile.email}
                </div>
                <div className="text-[11px] font-mono-num text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {t.onboarding.userIdLabel}: {userProfile.uid}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 text-xs font-semibold text-red-600 dark:text-red-400 cursor-pointer min-h-[42px] shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.onboarding.logout}</span>
            </button>
          </div>
        </section>
      )}

      {/* Language & Theme */}
      <section className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {t.settings.appearanceLanguage}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
              {t.settings.language}
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setLanguage('gu')}
                className={`py-2.5 rounded-lg text-xs font-semibold cursor-pointer min-h-[40px] ${
                  language === 'gu'
                    ? 'bg-[#0F294A] dark:bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                ગુજરાતી (Default)
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`py-2.5 rounded-lg text-xs font-semibold cursor-pointer min-h-[40px] ${
                  language === 'en'
                    ? 'bg-[#0F294A] dark:bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
              {t.settings.theme}
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>{t.settings.lightMode}</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] ${
                  theme === 'dark'
                    ? 'bg-[#0F294A] dark:bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>{t.settings.darkMode}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Shop Profile & Invoice Settings Form */}
      <form
        onSubmit={handleSaveShopSettings}
        className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-5 space-y-5"
      >
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {t.settings.shopProfile}
        </h3>

        <div className="flex flex-wrap items-center gap-4">
          {form.logoBase64 ? (
            <img
              src={form.logoBase64}
              alt="Shop Logo"
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 bg-white"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#0F294A] text-white flex items-center justify-center font-bold text-xl">
              ₹
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t.settings.uploadLogo}</span>
            </button>
            {form.logoBase64 && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, logoBase64: '' }))}
                className="px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center gap-1 cursor-pointer min-h-[40px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.settings.removeLogo}</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              {t.settings.shopNameGu}
            </label>
            <input
              type="text"
              value={form.shopNameGu}
              onChange={(e) => setForm((p) => ({ ...p, shopNameGu: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              {t.settings.shopNameEn}
            </label>
            <input
              type="text"
              value={form.shopName}
              onChange={(e) => setForm((p) => ({ ...p, shopName: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              {t.settings.phone}
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="9876543210"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm font-mono-num min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              {t.settings.upiId}
            </label>
            <input
              type="text"
              value={form.upiId}
              onChange={(e) => setForm((p) => ({ ...p, upiId: e.target.value }))}
              placeholder="shopname@upi"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm font-mono-num min-h-[44px]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              {t.settings.address}
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm min-h-[44px]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t.settings.invoiceSettings}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                {t.settings.billPrefix}
              </label>
              <input
                type="text"
                maxLength={6}
                value={form.billPrefix}
                onChange={(e) => setForm((p) => ({ ...p, billPrefix: e.target.value.toUpperCase() }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm font-mono-num min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                {t.settings.footerGu}
              </label>
              <input
                type="text"
                value={form.invoiceFooterGu}
                onChange={(e) => setForm((p) => ({ ...p, invoiceFooterGu: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                {t.settings.footerEn}
              </label>
              <input
                type="text"
                value={form.invoiceFooterEn}
                onChange={(e) => setForm((p) => ({ ...p, invoiceFooterEn: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm min-h-[44px]"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.showLogoOnInvoice}
              onChange={(e) => setForm((p) => ({ ...p, showLogoOnInvoice: e.target.checked }))}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 w-4 h-4"
            />
            <span>{t.settings.showLogo}</span>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163864] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold cursor-pointer min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>{t.common.save}</span>
          </button>
        </div>
      </form>

      {/* Catalog Manager Shortcut */}
      <section className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t.settings.catalogSection}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.settings.catalogDesc}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCatalogModal(true)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer min-h-[42px] whitespace-nowrap"
        >
          {t.settings.openCatalog}
        </button>
      </section>

      {/* Backup & Future Firebase Integration */}
      <section className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {t.settings.backupSection}
          </h3>
        </div>

        {isDemoMode && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-300">
            {t.onboarding.demoBackupBlocked}
          </div>
        )}

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={isDemoMode}
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer min-h-[42px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>{t.settings.exportJson}</span>
          </button>

          <button
            type="button"
            disabled={isDemoMode}
            onClick={handleExportSqlite}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer min-h-[42px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Database className="w-4 h-4" />
            <span>{t.settings.exportSqlite}</span>
          </button>

          <input
            ref={restoreInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleRestoreJson}
            className="hidden"
          />
          <button
            type="button"
            disabled={isDemoMode}
            onClick={() => restoreInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[42px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            <span>{t.settings.restoreJson}</span>
          </button>
        </div>

        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4 flex items-start gap-3">
          <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <div className="font-semibold text-slate-900 dark:text-white">
              {t.settings.firebasePlaceholderTitle}
            </div>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.settings.firebasePlaceholderDesc}
            </p>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono-num">
              Adapter: FutureFirebaseSyncAdapter · Cloud Sync: {syncStatus.enabled ? 'Enabled' : 'Offline Local'}
            </div>
          </div>
        </div>
      </section>

      {/* App Info & Android Install / APK Guide */}
      <section className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t.settings.appInfo}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Techy BillBook · Offline SQLite + PWA + Android Capacitor Ready
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer min-h-[42px]"
            >
              {t.common.installApp}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowApkGuide(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer min-h-[42px]"
          >
            {t.settings.apkGuideBtn}
          </button>
        </div>
      </section>

      <ProductCatalogModal open={showCatalogModal} onClose={() => setShowCatalogModal(false)} />

      {showApkGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t.settings.apkGuideBtn}
              </h3>
              <button
                type="button"
                onClick={() => setShowApkGuide(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>
                {language === 'gu'
                  ? '૧. ઓફલાઇન Android એપ તરીકે સીધું વાપરવા માટે Chrome માં "Install App" દબાવો (PWA મોડમાં ઇન્ટરનેટ વગર ચાલે છે).'
                  : '1. For instant Android home-screen installation, tap "Install App" in Chrome (runs offline via Service Worker & SQLite).'}
              </p>
              <p>
                {language === 'gu'
                  ? '૨. Google Play અથવા સીધી .APK ફાઇલ બનાવવા માટે Capacitor વડે Android પ્રોજેક્ટ બિલ્ડ કરો:'
                  : '2. To package a standalone signed Android .APK via Capacitor:'}
              </p>
              <pre className="rounded-xl bg-slate-900 text-slate-100 p-3 font-mono text-[11px] overflow-x-auto">
{`npm install
npm run build
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Techy BillBook" com.techy.billbook --web-dir=dist
npx cap add android
npx cap sync android
cd android && ./gradlew assembleRelease`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t.onboarding.logoutConfirmTitle}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.onboarding.logoutConfirmDesc}
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer min-h-[40px]"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={async () => {
                  setLoggingOut(true);
                  try {
                    await logout();
                  } finally {
                    setLoggingOut(false);
                    setShowLogoutConfirm(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer min-h-[40px] disabled:opacity-60"
              >
                {t.onboarding.logout}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
