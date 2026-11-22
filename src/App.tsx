import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { BillBookProvider, useBillBook } from './context/BillBookContext';
import { BillingPage } from './pages/BillingPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UdharPage } from './pages/UdharPage';
import { AppRoute } from './types/models';

const AppShell: React.FC = () => {
  const { ready, initError, t } = useBillBook();
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

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#09111E] p-6 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#0F294A] text-white flex items-center justify-center font-bold text-xl">
          ₹
        </div>
        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {t.common.loading}
        </div>
      </div>
    );
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
    <BillBookProvider>
      <AppShell />
    </BillBookProvider>
  );
}
