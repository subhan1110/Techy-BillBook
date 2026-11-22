import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, LogOut, Store } from 'lucide-react';
import { useBillBook } from '../../context/BillBookContext';

export const ShopSetupScreen: React.FC = () => {
  const { t, language, firebaseUser, completeShopSetup, logout } = useBillBook();

  const [ownerName, setOwnerName] = useState(firebaseUser?.displayName || '');
  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (firebaseUser?.displayName && !ownerName) {
      setOwnerName(firebaseUser.displayName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.displayName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanOwner = ownerName.trim();
    const cleanShop = shopName.trim();
    const cleanDigits = shopPhone.replace(/\D/g, '');

    if (!cleanOwner) {
      setErrorMsg(t.onboarding.errorOwnerRequired);
      return;
    }
    if (!cleanShop) {
      setErrorMsg(t.onboarding.errorShopRequired);
      return;
    }
    if (shopPhone.trim().length > 0 && cleanDigits.length !== 10) {
      setErrorMsg(t.onboarding.errorPhoneInvalid);
      return;
    }

    setSaving(true);
    try {
      await completeShopSetup({
        ownerName: cleanOwner,
        shopName: cleanShop,
        shopPhone: cleanDigits,
        shopAddress: shopAddress.trim(),
      });
    } catch (err) {
      let displayMsg: string = t.onboarding.errorGeneric;
      if (err instanceof Error) {
        if (err.message.toLowerCase().includes('offline')) {
          displayMsg = t.onboarding.errorNetwork;
        } else if (err.message.startsWith('{')) {
          try {
            const parsed = JSON.parse(err.message) as { error?: string };
            displayMsg = parsed.error || t.onboarding.errorGeneric;
          } catch {
            displayMsg = err.message;
          }
        } else {
          displayMsg = err.message;
        }
      }
      setErrorMsg(displayMsg);
    } finally {
      setSaving(false);
    }
  };

  const initials = (firebaseUser?.displayName || firebaseUser?.email || 'TB')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#09111E] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        {/* Top Brand Banner */}
        <div className="bg-[#0F294A] dark:bg-[#0B1526] text-white px-6 py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Store className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{t.onboarding.setupTitle}</h1>
              <p className="text-xs text-blue-200/85 mt-0.5">{t.onboarding.setupSubtitle}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Authenticated Google User Strip */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {firebaseUser?.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || 'Google Account'}
                  className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#0F294A] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                  {t.onboarding.signedInAs}
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {firebaseUser?.displayName || firebaseUser?.email}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {firebaseUser?.email}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void logout()}
              className="min-h-[40px] px-3 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              title={t.onboarding.logout}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {language === 'gu' ? 'બદલો' : 'Switch'}
              </span>
            </button>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-4 py-3 text-xs text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Setup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.onboarding.ownerName} *
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder={t.onboarding.ownerNamePlaceholder}
                maxLength={120}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.onboarding.shopName} *
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder={t.onboarding.shopNamePlaceholder}
                maxLength={160}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.onboarding.shopPhone} ({t.common.optional})
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder={t.onboarding.shopPhonePlaceholder}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm font-mono-num text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.onboarding.shopAddress} ({t.common.optional})
              </label>
              <input
                type="text"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                placeholder={t.onboarding.shopAddressPlaceholder}
                maxLength={300}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#0F294A] hover:bg-[#163864] dark:bg-blue-600 dark:hover:bg-blue-500 text-white py-3.5 px-5 text-sm font-semibold shadow-sm transition-all active:scale-[0.99] cursor-pointer min-h-[48px] disabled:opacity-60"
            >
              <span>{saving ? t.onboarding.savingSetup : t.onboarding.completeSetup}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
