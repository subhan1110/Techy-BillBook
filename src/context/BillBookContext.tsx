import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS, TranslationDict } from '../i18n/translations';
import { billBookRepo } from '../repositories/sqliteRepository';
import { Language, ShopSettings, ThemeMode } from '../types/models';

interface BillBookContextValue {
  ready: boolean;
  initError: string | null;
  settings: ShopSettings;
  language: Language;
  theme: ThemeMode;
  t: TranslationDict;
  refreshTick: number;
  triggerRefresh: () => void;
  updateSettings: (partial: Partial<ShopSettings>) => Promise<ShopSettings>;
  setLanguage: (lang: Language) => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
}

const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'Shree Ganesh Kirana Store',
  shopNameGu: 'શ્રી ગણેશ કિરાણા સ્ટોર',
  address: 'મેઈન બજાર રોડ, ગુજરાત',
  phone: '',
  upiId: '',
  logoBase64: '',
  billPrefix: 'TB',
  invoiceFooterGu: 'ખરીદી બદલ આભાર! ફરી પધારજો.',
  invoiceFooterEn: 'Thank you for shopping with us! Visit again.',
  showLogoOnInvoice: true,
  language: 'gu',
  theme: 'light',
};

const BillBookContext = createContext<BillBookContextValue | null>(null);

export const BillBookProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const [refreshTick, setRefreshTick] = useState(0);

  const applyThemeDom = useCallback((theme: ThemeMode) => {
    try {
      localStorage.setItem('techy_billbook_theme', theme);
    } catch {
      // ignore
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await billBookRepo.initialize();
        const loaded = await billBookRepo.getSettings();
        if (!mounted) return;
        setSettings(loaded);
        applyThemeDom(loaded.theme);
        document.documentElement.lang = loaded.language;
        setReady(true);
      } catch (err) {
        if (!mounted) return;
        setInitError(err instanceof Error ? err.message : 'Database initialization failed');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [applyThemeDom]);

  const triggerRefresh = useCallback(() => {
    setRefreshTick((k) => k + 1);
  }, []);

  const updateSettings = useCallback(
    async (partial: Partial<ShopSettings>) => {
      const updated = await billBookRepo.updateSettings(partial);
      setSettings(updated);
      applyThemeDom(updated.theme);
      document.documentElement.lang = updated.language;
      setRefreshTick((k) => k + 1);
      return updated;
    },
    [applyThemeDom]
  );

  const setLanguage = useCallback(
    async (language: Language) => {
      await updateSettings({ language });
    },
    [updateSettings]
  );

  const setTheme = useCallback(
    async (theme: ThemeMode) => {
      await updateSettings({ theme });
    },
    [updateSettings]
  );

  const t = (settings.language === 'en' ? TRANSLATIONS.en : TRANSLATIONS.gu) as TranslationDict;

  return (
    <BillBookContext.Provider
      value={{
        ready,
        initError,
        settings,
        language: settings.language,
        theme: settings.theme,
        t,
        refreshTick,
        triggerRefresh,
        updateSettings,
        setLanguage,
        setTheme,
      }}
    >
      {children}
    </BillBookContext.Provider>
  );
};

export function useBillBook(): BillBookContextValue {
  const ctx = useContext(BillBookContext);
  if (!ctx) throw new Error('useBillBook must be used inside BillBookProvider');
  return ctx;
}
