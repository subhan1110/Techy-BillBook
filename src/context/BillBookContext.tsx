import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  GoogleSignInFailure,
  auth,
  fetchRemoteUserProfile,
  isOfflineFirestoreError,
  resolveGoogleRedirectResult,
  saveRemoteUserProfile,
  signInWithGooglePopup,
  signInWithGoogleRedirect,
  signOutFromFirebase,
} from '../firebase/firebaseApp';
import { TRANSLATIONS, TranslationDict } from '../i18n/translations';
import { demoBillBookRepo } from '../repositories/demoRepository';
import { realBillBookRepo, setDemoRepositoryActive } from '../repositories/sqliteRepository';
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

  // Demo / Preview Mode (no real record access or writes)
  isDemoMode: boolean;
  enterDemoMode: () => Promise<void>;
  exitDemoMode: () => Promise<void>;
  signInFromDemo: () => Promise<void>;

  // Onboarding & Firebase Auth
  firebaseUser: User | null;
  userProfile: UserShopProfile | null;
  onboardingStage: OnboardingStage;
  authRedirectError: GoogleSignInFailure | null;
  clearAuthRedirectError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleUsingRedirect: () => Promise<void>;
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
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authRedirectError, setAuthRedirectError] = useState<GoogleSignInFailure | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const isDemoModeRef = useRef(false);
  const popupSignInActiveRef = useRef(false);
  const syncedUidInFlightRef = useRef<string | null>(null);

  const applyThemeDom = useCallback((theme: ThemeMode, persistLocal = true) => {
    if (persistLocal) {
      try {
        localStorage.setItem('techy_billbook_theme', theme);
      } catch {
        // ignore
      }
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const syncProfileForFirebaseUser = useCallback(async (fbUser: User): Promise<void> => {
    if (syncedUidInFlightRef.current === fbUser.uid) {
      return;
    }
    syncedUidInFlightRef.current = fbUser.uid;
    try {
      const latestLocal = await realBillBookRepo.getUserProfile();
      if (latestLocal && latestLocal.uid === fbUser.uid && latestLocal.setupCompleted) {
        setUserProfile(latestLocal);
        return;
      }

      if (typeof navigator === 'undefined' || navigator.onLine) {
        const remote = await fetchRemoteUserProfile(fbUser.uid);
        if (remote && remote.setupCompleted) {
          await realBillBookRepo.saveUserProfile(remote);
          const syncedSettings = await realBillBookRepo.updateSettings({
            shopName: remote.shopName,
            shopNameGu: remote.shopName,
            phone: remote.shopPhone,
            address: remote.shopAddress,
          });
          setUserProfile(remote);
          setSettings(syncedSettings);
          setRefreshTick((k) => k + 1);
          return;
        }
      }
      setUserProfile(null);
    } catch (err) {
      // Never block authentication completion if Firestore profile lookup fails transiently
      console.warn('Profile sync check deferred; continuing onboarding:', err);
    } finally {
      if (syncedUidInFlightRef.current === fbUser.uid) {
        syncedUidInFlightRef.current = null;
      }
    }
  }, []);

  // Splash screen minimum display duration (1.1s)
  useEffect(() => {
    const timer = window.setTimeout(() => setSplashTimerDone(true), 1100);
    return () => window.clearTimeout(timer);
  }, []);

  // Initialize SQLite + restore local settings/profile + handle redirect result + subscribe to Firebase Auth
  useEffect(() => {
    let mounted = true;
    let unsubscribeAuth: (() => void) | null = null;

    (async () => {
      try {
        setDemoRepositoryActive(false);
        await realBillBookRepo.initialize();
        const [loadedSettings, localProfile] = await Promise.all([
          realBillBookRepo.getSettings(),
          realBillBookRepo.getUserProfile(),
        ]);

        if (!mounted) return;
        setSettings(loadedSettings);
        applyThemeDom(loadedSettings.theme);
        document.documentElement.lang = loadedSettings.language;
        if (localProfile) {
          setUserProfile(localProfile);
        }
        setDbReady(true);

        // Process any pending signInWithRedirect result before resolving auth state
        try {
          const redirectUser = await resolveGoogleRedirectResult();
          if (redirectUser && mounted) {
            isDemoModeRef.current = false;
            setIsDemoMode(false);
            setDemoRepositoryActive(false);
            setFirebaseUser(redirectUser);
            await syncProfileForFirebaseUser(redirectUser);
          }
        } catch (redirectErr) {
          if (mounted) {
            setAuthRedirectError(
              redirectErr instanceof GoogleSignInFailure
                ? redirectErr
                : new GoogleSignInFailure(
                    'generic',
                    redirectErr instanceof Error ? redirectErr.message : 'Redirect sign-in failed'
                  )
            );
          }
        }

        if (!mounted) return;

        unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
          if (!mounted) return;
          setFirebaseUser(fbUser);

          if (fbUser && !popupSignInActiveRef.current) {
            if (isDemoModeRef.current) {
              isDemoModeRef.current = false;
              setIsDemoMode(false);
              setDemoRepositoryActive(false);
              const realSettings = await realBillBookRepo.getSettings();
              if (mounted) {
                setSettings(realSettings);
                applyThemeDom(realSettings.theme);
                document.documentElement.lang = realSettings.language;
              }
            }
            await syncProfileForFirebaseUser(fbUser);
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
  }, [applyThemeDom, syncProfileForFirebaseUser]);

  const ready = dbReady && authResolved;

  // Determine exact onboarding stage
  let onboardingStage: OnboardingStage = 'splash';
  if (ready && splashTimerDone) {
    if (userProfile?.setupCompleted || isDemoMode) {
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

  const clearAuthRedirectError = useCallback(() => {
    setAuthRedirectError(null);
  }, []);

  const updateSettings = useCallback(
    async (partial: Partial<ShopSettings>) => {
      if (isDemoModeRef.current) {
        const updatedDemo = await demoBillBookRepo.updateSettings(partial);
        setSettings(updatedDemo);
        applyThemeDom(updatedDemo.theme, false);
        document.documentElement.lang = updatedDemo.language;
        setRefreshTick((k) => k + 1);
        return updatedDemo;
      }

      const updated = await realBillBookRepo.updateSettings(partial);
      setSettings(updated);
      applyThemeDom(updated.theme);
      document.documentElement.lang = updated.language;

      // Keep local userProfile shop metadata aligned if profile exists
      const currentProf = await realBillBookRepo.getUserProfile();
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
        await realBillBookRepo.saveUserProfile(mergedProfile);
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

  const enterDemoMode = useCallback(async () => {
    setAuthRedirectError(null);
    demoBillBookRepo.reset({
      language: settings.language,
      theme: settings.theme,
    });
    setDemoRepositoryActive(true);
    isDemoModeRef.current = true;
    setIsDemoMode(true);
    const demoSettings = await demoBillBookRepo.getSettings();
    setSettings(demoSettings);
    applyThemeDom(demoSettings.theme, false);
    document.documentElement.lang = demoSettings.language;
    setRefreshTick((k) => k + 1);
  }, [applyThemeDom, settings.language, settings.theme]);

  const exitDemoMode = useCallback(async () => {
    isDemoModeRef.current = false;
    setIsDemoMode(false);
    setDemoRepositoryActive(false);
    await realBillBookRepo.initialize();
    const realSettings = await realBillBookRepo.getSettings();
    setSettings(realSettings);
    applyThemeDom(realSettings.theme);
    document.documentElement.lang = realSettings.language;
    setRefreshTick((k) => k + 1);
  }, [applyThemeDom]);

  const signInWithGoogle = useCallback(async () => {
    setAuthRedirectError(null);
    popupSignInActiveRef.current = true;
    try {
      const user = await signInWithGooglePopup();
      isDemoModeRef.current = false;
      setIsDemoMode(false);
      setDemoRepositoryActive(false);
      await syncProfileForFirebaseUser(user);
      setFirebaseUser(user);
    } finally {
      popupSignInActiveRef.current = false;
    }
  }, [syncProfileForFirebaseUser]);

  const signInFromDemo = useCallback(async () => {
    setAuthRedirectError(null);
    popupSignInActiveRef.current = true;
    try {
      const user = await signInWithGooglePopup();
      isDemoModeRef.current = false;
      setIsDemoMode(false);
      setDemoRepositoryActive(false);
      await realBillBookRepo.initialize();
      const realSettings = await realBillBookRepo.getSettings();
      setSettings(realSettings);
      applyThemeDom(realSettings.theme);
      document.documentElement.lang = realSettings.language;
      await syncProfileForFirebaseUser(user);
      setFirebaseUser(user);
      setRefreshTick((k) => k + 1);
    } catch (err) {
      await exitDemoMode();
      const failure =
        err instanceof GoogleSignInFailure
          ? err
          : new GoogleSignInFailure(
              'generic',
              err instanceof Error ? err.message : 'Google Sign-In failed'
            );
      setAuthRedirectError(failure);
    } finally {
      popupSignInActiveRef.current = false;
    }
  }, [applyThemeDom, exitDemoMode, syncProfileForFirebaseUser]);

  const signInWithGoogleUsingRedirect = useCallback(async () => {
    setAuthRedirectError(null);
    await signInWithGoogleRedirect();
  }, []);

  const completeShopSetup = useCallback(
    async (input: CompleteSetupInput) => {
      const currentUser = auth.currentUser || firebaseUser;
      if (!currentUser) {
        throw new Error('Authenticated Google account is required.');
      }

      const cleanOwner = input.ownerName.trim() || 'Shop Owner';
      const cleanShop = input.shopName.trim() || 'Kirana Store';
      const cleanPhone = input.shopPhone.replace(/\D/g, '').slice(-10);
      const cleanAddress = input.shopAddress.trim();
      const userEmail =
        currentUser.email ||
        currentUser.providerData?.find((p) => p.email)?.email ||
        '';
      const nowIso = new Date().toISOString();

      let savedProfile: UserShopProfile;
      try {
        savedProfile = await saveRemoteUserProfile({
          uid: currentUser.uid,
          email: userEmail,
          ownerName: cleanOwner,
          shopName: cleanShop,
          shopPhone: cleanPhone,
          shopAddress: cleanAddress,
          photoUrl: currentUser.photoURL || '',
          setupCompleted: true,
          language: settings.language,
        });
      } catch (err) {
        if (isOfflineFirestoreError(err) || (typeof navigator !== 'undefined' && !navigator.onLine)) {
          savedProfile = {
            uid: currentUser.uid,
            email: userEmail,
            ownerName: cleanOwner,
            shopName: cleanShop,
            shopPhone: cleanPhone,
            shopAddress: cleanAddress,
            photoUrl: currentUser.photoURL || '',
            setupCompleted: true,
            language: settings.language,
            createdAt: nowIso,
            updatedAt: nowIso,
          };
        } else {
          throw err;
        }
      }

      await realBillBookRepo.saveUserProfile(savedProfile);
      const updatedSettings = await realBillBookRepo.updateSettings({
        shopName: cleanShop,
        shopNameGu: cleanShop,
        phone: cleanPhone,
        address: cleanAddress,
      });

      setUserProfile(savedProfile);
      setSettings(updatedSettings);
      setRefreshTick((k) => k + 1);
    },
    [firebaseUser, settings.language]
  );

  const logout = useCallback(async () => {
    isDemoModeRef.current = false;
    setIsDemoMode(false);
    setDemoRepositoryActive(false);
    await signOutFromFirebase();
    await realBillBookRepo.clearUserProfileSession();
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
        isDemoMode,
        enterDemoMode,
        exitDemoMode,
        signInFromDemo,
        firebaseUser,
        userProfile,
        onboardingStage,
        authRedirectError,
        clearAuthRedirectError,
        signInWithGoogle,
        signInWithGoogleUsingRedirect,
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
