import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  fetchRemoteUserProfile,
  saveRemoteUserProfile,
  signInWithGooglePopup,
  signOutFromFirebase,
} from '../firebase/firebaseApp';
import { TRANSLATIONS, TranslationDict } from '../i18n/translations';
import { billBookRepo } from '../repositories/sqliteRepository';
import { Language, ShopSettings, ThemeMode, UserShopProfile } from '../types/models';

export type OnboardingStage = 'splash' | 'welcome' | 'setup' | 'app';

interface CompleteSetupInput {
  ownerName: string;
  shopName: string;
  shopPhone: string;
  shopAddress: string;
}

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

  // Onboarding & Firebase Auth
  firebaseUser: User | null;
  userProfile: UserShopProfile | null;
  onboardingStage: OnboardingStage;
  signInWithGoogle: () => Promise<void>;
  completeShopSetup: (input: CompleteSetupInput) => Promise<void>;
  logout: () => Promise<void>;
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
  const [dbReady, setDbReady] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [splashTimerDone, setSplashTimerDone] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserShopProfile | null>(null);
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

  // Splash screen minimum display duration (1.1s)
  useEffect(() => {
    const timer = window.setTimeout(() => setSplashTimerDone(true), 1100);
    return () => window.clearTimeout(timer);
  }, []);

  // Initialize SQLite + restore local settings/profile + subscribe to Firebase Auth
  useEffect(() => {
    let mounted = true;
    let unsubscribeAuth: (() => void) | null = null;

    (async () => {
      try {
        await billBookRepo.initialize();
        const [loadedSettings, localProfile] = await Promise.all([
          billBookRepo.getSettings(),
          billBookRepo.getUserProfile(),
        ]);

        if (!mounted) return;
        setSettings(loadedSettings);
        applyThemeDom(loadedSettings.theme);
        document.documentElement.lang = loadedSettings.language;
        if (localProfile) {
          setUserProfile(localProfile);
        }
        setDbReady(true);

        unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
          if (!mounted) return;
          setFirebaseUser(fbUser);

          if (fbUser) {
            try {
              const latestLocal = await billBookRepo.getUserProfile();
              if (latestLocal && latestLocal.uid === fbUser.uid && latestLocal.setupCompleted) {
                if (mounted) setUserProfile(latestLocal);
              } else if (typeof navigator === 'undefined' || navigator.onLine) {
                const remote = await fetchRemoteUserProfile(fbUser.uid);
                if (remote && remote.setupCompleted && mounted) {
                  await billBookRepo.saveUserProfile(remote);
                  const syncedSettings = await billBookRepo.updateSettings({
                    shopName: remote.shopName,
                    shopNameGu: remote.shopName,
                    phone: remote.shopPhone,
                    address: remote.shopAddress,
                  });
                  setUserProfile(remote);
                  setSettings(syncedSettings);
                }
              }
            } catch (err) {
              // If offline or transient fetch issue, rely on local SQLite profile if present
              console.warn('Profile sync check deferred:', err);
            }
          }

          if (mounted) setAuthResolved(true);
        });
      } catch (err) {
        if (!mounted) return;
        setInitError(err instanceof Error ? err.message : 'Database initialization failed');
        setAuthResolved(true);
      }
    })();

    return () => {
      mounted = false;
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [applyThemeDom]);

  const ready = dbReady && authResolved;

  // Determine exact onboarding stage
  let onboardingStage: OnboardingStage = 'splash';
  if (ready && splashTimerDone) {
    if (userProfile?.setupCompleted) {
      onboardingStage = 'app';
    } else if (firebaseUser) {
      onboardingStage = 'setup';
    } else {
      onboardingStage = 'welcome';
    }
  }

  const triggerRefresh = useCallback(() => {
    setRefreshTick((k) => k + 1);
  }, []);

  const updateSettings = useCallback(
    async (partial: Partial<ShopSettings>) => {
      const updated = await billBookRepo.updateSettings(partial);
      setSettings(updated);
      applyThemeDom(updated.theme);
      document.documentElement.lang = updated.language;

      // Keep local userProfile shop metadata aligned if profile exists
      const currentProf = await billBookRepo.getUserProfile();
      if (currentProf && currentProf.setupCompleted) {
        const nextShopName =
          updated.language === 'gu'
            ? updated.shopNameGu || updated.shopName
            : updated.shopName || updated.shopNameGu;
        const mergedProfile: UserShopProfile = {
          ...currentProf,
          shopName: nextShopName || currentProf.shopName,
          shopPhone: updated.phone ?? currentProf.shopPhone,
          shopAddress: updated.address ?? currentProf.shopAddress,
          language: updated.language,
          updatedAt: new Date().toISOString(),
        };
        await billBookRepo.saveUserProfile(mergedProfile);
        setUserProfile(mergedProfile);
        if (auth.currentUser && (typeof navigator === 'undefined' || navigator.onLine)) {
          saveRemoteUserProfile(mergedProfile).catch((err) =>
            console.warn('Background profile update skipped:', err)
          );
        }
      }

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

  const signInWithGoogle = useCallback(async () => {
    const user = await signInWithGooglePopup();
    setFirebaseUser(user);

    // Check if returning user already completed setup in Firestore
    const remote = await fetchRemoteUserProfile(user.uid);
    if (remote && remote.setupCompleted) {
      await billBookRepo.saveUserProfile(remote);
      const syncedSettings = await billBookRepo.updateSettings({
        shopName: remote.shopName,
        shopNameGu: remote.shopName,
        phone: remote.shopPhone,
        address: remote.shopAddress,
      });
      setUserProfile(remote);
      setSettings(syncedSettings);
      setRefreshTick((k) => k + 1);
    } else {
      setUserProfile(null);
    }
  }, []);

  const completeShopSetup = useCallback(
    async (input: CompleteSetupInput) => {
      const currentUser = auth.currentUser || firebaseUser;
      if (!currentUser) {
        throw new Error('Authenticated Google account is required.');
      }

      const cleanOwner = input.ownerName.trim();
      const cleanShop = input.shopName.trim();
      const cleanPhone = input.shopPhone.replace(/\D/g, '').slice(-10);
      const cleanAddress = input.shopAddress.trim();

      const savedRemote = await saveRemoteUserProfile({
        uid: currentUser.uid,
        email: currentUser.email || '',
        ownerName: cleanOwner,
        shopName: cleanShop,
        shopPhone: cleanPhone,
        shopAddress: cleanAddress,
        photoUrl: currentUser.photoURL || '',
        setupCompleted: true,
        language: settings.language,
      });

      await billBookRepo.saveUserProfile(savedRemote);
      const updatedSettings = await billBookRepo.updateSettings({
        shopName: cleanShop,
        shopNameGu: cleanShop,
        phone: cleanPhone,
        address: cleanAddress,
      });

      setUserProfile(savedRemote);
      setSettings(updatedSettings);
      setRefreshTick((k) => k + 1);
    },
    [firebaseUser, settings.language]
  );

  const logout = useCallback(async () => {
    await signOutFromFirebase();
    await billBookRepo.clearUserProfileSession();
    setFirebaseUser(null);
    setUserProfile(null);
  }, []);

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
        firebaseUser,
        userProfile,
        onboardingStage,
        signInWithGoogle,
        completeShopSetup,
        logout,
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
