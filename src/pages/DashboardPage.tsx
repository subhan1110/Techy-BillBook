import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  FileText,
  IndianRupee,
  ReceiptText,
  UserPlus,
  Users,
} from 'lucide-react';
import { CustomerModal } from '../components/CustomerModal';
import { InvoiceModal } from '../components/InvoiceModal';
import { useBillBook } from '../context/BillBookContext';
import { formatDateTime, formatINR, getPaymentLabel } from '../i18n/translations';
import { billBookRepo } from '../repositories/sqliteRepository';
import { AppRoute, Bill, BillWithItems, DashboardStats } from '../types/models';

interface DashboardPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { t, language, refreshTick } = useBillBook();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayBills: 0,
    totalOutstandingUdhar: 0,
    totalCustomers: 0,
  });
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillWithItems | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [s, bills] = await Promise.all([
        billBookRepo.getDashboardStats(),
        billBookRepo.listBills(8),
      ]);
      if (!active) return;
      setStats(s);
      setRecentBills(bills);
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const handleOpenBill = async (billId: string) => {
    const full = await billBookRepo.getBillById(billId);
    if (full) setSelectedBill(full);
  };

  const kpis = [
    {
      label: t.dashboard.todaySales,
      value: formatINR(stats.todaySales),
      icon: <IndianRupee className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      tone: 'text-slate-900 dark:text-white',
    },
    {
      label: t.dashboard.todayBills,
      value: String(stats.todayBills),
      icon: <FileText className="w-5 h-5 text-slate-600 dark:text-slate-300" />,
      tone: 'text-slate-900 dark:text-white',
    },
    {
      label: t.dashboard.totalUdhar,
      value: formatINR(stats.totalOutstandingUdhar),
      icon: <BookOpen className="w-5 h-5 text-red-600 dark:text-red-400" />,
      tone: stats.totalOutstandingUdhar > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white',
    },
    {
      label: t.dashboard.totalCustomers,
      value: String(stats.totalCustomers),
      icon: <Users className="w-5 h-5 text-slate-600 dark:text-slate-300" />,
      tone: 'text-slate-900 dark:text-white',
    },
  ];

  const quickActions = [
    {
      label: t.dashboard.createBill,
      icon: <ReceiptText className="w-5 h-5" />,
      primary: true,
      onClick: () => onNavigate('billing'),
    },
    {
      label: t.dashboard.addCustomer,
      icon: <UserPlus className="w-5 h-5" />,
      primary: false,
      onClick: () => setShowAddCustomer(true),
    },
    {
      label: t.dashboard.manageUdhar,
      icon: <BookOpen className="w-5 h-5" />,
      primary: false,
      onClick: () => onNavigate('udhar'),
    },
    {
      label: t.dashboard.viewReports,
      icon: <BarChart3 className="w-5 h-5" />,
      primary: false,
      onClick: () => onNavigate('reports'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t.dashboard.title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t.dashboard.subtitle}
          </p>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {kpi.label}
              </span>
              {kpi.icon}
            </div>
            <div className={`text-xl sm:text-2xl font-bold font-mono-num ${kpi.tone}`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </section>

      {/* Quick Actions */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {t.dashboard.quickActions}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((act) => (
            <button
              key={act.label}
              type="button"
              onClick={act.onClick}
              className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-semibold transition-all cursor-pointer min-h-[56px] active:scale-[0.99] ${
                act.primary
                  ? 'bg-[#0F294A] hover:bg-[#163864] dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-sm'
                  : 'bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={act.primary ? 'text-blue-200 dark:text-blue-100' : 'text-blue-600 dark:text-blue-400'}>
                  {act.icon}
                </span>
                <span className="truncate">{act.label}</span>
              </div>
              <ArrowRight className="w-4 h-4 shrink-0 opacity-60" />
            </button>
          ))}
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {t.dashboard.recentTransactions}
          </h3>
          {recentBills.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {t.dashboard.viewReports}
            </button>
          )}
        </div>

        {recentBills.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {t.dashboard.noBillsYet}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {t.dashboard.noBillsHint}
            </p>
            <button
              type="button"
              onClick={() => onNavigate('billing')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F294A] dark:bg-blue-600 text-white text-xs font-semibold cursor-pointer min-h-[44px]"
            >
              <ReceiptText className="w-4 h-4" />
              <span>{t.dashboard.createBill}</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentBills.map((bill) => (
              <button
                key={bill.id}
                type="button"
                onClick={() => handleOpenBill(bill.id)}
                className="w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer min-h-[60px]"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {bill.customerName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className="font-mono-num">{bill.billNumber}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDateTime(bill.createdAt, language)}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        bill.paymentMethod === 'UDHAR'
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : 'text-emerald-700 dark:text-emerald-400 font-medium'
                      }
                    >
                      {getPaymentLabel(bill.paymentMethod, language)}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono-num text-slate-900 dark:text-white">
                    {formatINR(bill.totalAmount)}
                  </div>
                  {bill.balanceAdded > 0 && (
                    <div className="text-[11px] font-mono-num text-red-600 dark:text-red-400">
                      {language === 'gu' ? 'ઉધાર' : 'Due'}: {formatINR(bill.balanceAdded)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <CustomerModal open={showAddCustomer} onClose={() => setShowAddCustomer(false)} />
      <InvoiceModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
    </div>
  );
};
