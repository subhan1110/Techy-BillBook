import React, { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { ShopSetupScreen } from './components/onboarding/ShopSetupScreen';
import { SplashScreen } from './components/onboarding/SplashScreen';
import { WelcomeScreen } from './components/onboarding/WelcomeScreen';
import { BillBookProvider, useBillBook } from './context/BillBookContext';
import { BillingPage } from './pages/BillingPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UdharPage } from './pages/UdharPage';
import { AppRoute } from './types/models';

const AppShell: React.FC = () => {
  const { initError, onboardingStage } = useBillBook();
  const [activeRoute, setActiveRoute] = useState<AppRoute>('dashboard');

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#09111E] p-6">
        <div className="max-w-md w-full rounded-2xl bg-white dark:bg-[#111C2E] border border-red-200 dark:border-red-900 p-6 text-center space-y-3">
          <h1 className="text-lg font-bold text-red-600 dark:text-red-400">
            Database Initialization Error
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{initError}</p>
        </div>
      </div>
    );
  }

  if (onboardingStage === 'splash') {
    return <SplashScreen />;
  }

  if (onboardingStage === 'welcome') {
    return <WelcomeScreen />;
  }

  if (onboardingStage === 'setup') {
    return <ShopSetupScreen />;
  }

  return (
    <Layout activeRoute={activeRoute} onNavigate={setActiveRoute}>
      {activeRoute === 'dashboard' && <DashboardPage onNavigate={setActiveRoute} />}
      {activeRoute === 'billing' && <BillingPage />}
      {activeRoute === 'customers' && <CustomersPage />}
      {activeRoute === 'udhar' && <UdharPage />}
      {activeRoute === 'reports' && <ReportsPage />}
      {activeRoute === 'settings' && <SettingsPage />}
    </Layout>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <BillBookProvider>
        <AppShell />
      </BillBookProvider>
    </ErrorBoundary>
  );
}
