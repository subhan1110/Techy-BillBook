import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, IndianRupee, MessageCircle, Plus, Search } from 'lucide-react';
import { UdharEntryModal } from '../components/UdharEntryModal';
import { useBillBook } from '../context/BillBookContext';
import { formatDateTime, formatINR } from '../i18n/translations';
import { billBookRepo } from '../repositories/sqliteRepository';
import { CustomerWithBalance, UdharTransaction } from '../types/models';
import { buildWhatsAppLedgerText, openWhatsAppShare } from '../utils/invoicePdf';

export const UdharPage: React.FC = () => {
  const { t, language, settings, refreshTick } = useBillBook();
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([]);
  const [transactions, setTransactions] = useState<UdharTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [search, setSearch] = useState('');

  const [modalState, setModalState] = useState<{
    open: boolean;
    mode: 'PAYMENT' | 'CREDIT';
    customer: CustomerWithBalance | null;
  }>({ open: false, mode: 'PAYMENT', customer: null });

  useEffect(() => {
    let active = true;
    (async () => {
      const [custs, txs] = await Promise.all([
        billBookRepo.listCustomersWithBalance(),
        billBookRepo.listUdharTransactions(),
      ]);
      if (!active) return;
      setCustomers(custs);
      setTransactions(txs);
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const pendingCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .filter((c) => c.outstandingBalance > 0)
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      )
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance);
  }, [customers, search]);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (tx) =>
        tx.customerName.toLowerCase().includes(q) ||
        tx.customerPhone.toLowerCase().includes(q) ||
        (tx.billNumber || '').toLowerCase().includes(q) ||
        tx.note.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  const totalPendingAmount = useMemo(
    () => customers.reduce((acc, c) => acc + c.outstandingBalance, 0),
    [customers]
  );

  const customersWithDueCount = useMemo(
    () => customers.filter((c) => c.outstandingBalance > 0).length,
    [customers]
  );

  const handleReminderWhatsApp = async (customer: CustomerWithBalance) => {
    const ledger = await billBookRepo.getCustomerLedger(customer.id);
    const text = buildWhatsAppLedgerText(customer, ledger, settings, language);
    openWhatsAppShare(text, customer.phone);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          {t.udhar.title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {t.udhar.subtitle}
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{t.udhar.totalPending}</span>
            <IndianRupee className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono-num text-red-600 dark:text-red-400 mt-2">
            {formatINR(totalPendingAmount)}
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{t.udhar.customersWithDue}</span>
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono-num text-slate-900 dark:text-white mt-2">
            {customersWithDueCount}
          </div>
        </div>
      </div>

      {/* Search + Segmented Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[38px] whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-[#111C2E] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.udhar.pendingTab} ({customersWithDueCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[38px] whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white dark:bg-[#111C2E] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.udhar.historyTab} ({transactions.length})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.udhar.searchPending}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2E] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 overflow-hidden">
        {activeTab === 'pending' ? (
          pendingCustomers.length === 0 ? (
            <div className="px-6 py-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t.udhar.noPending}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.udhar.noPendingHint}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendingCustomers.map((c) => (
                <div
                  key={c.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {c.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono-num">{c.phone}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {t.customers.totalPaid}: <span className="font-mono-num">{formatINR(c.totalPaid)}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                    <div className="text-left sm:text-right mr-1">
                      <div className="text-base font-bold font-mono-num text-red-600 dark:text-red-400">
                        {formatINR(c.outstandingBalance)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleReminderWhatsApp(c)}
                      className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 cursor-pointer"
                      aria-label={t.customers.shareLedgerWhatsapp}
                      title={t.customers.shareLedgerWhatsapp}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalState({ open: true, mode: 'CREDIT', customer: c })}
                      className="min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.billing.udhar}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalState({ open: true, mode: 'PAYMENT', customer: c })}
                      className="min-h-[42px] px-3.5 rounded-xl bg-[#0F294A] hover:bg-[#163864] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      {t.udhar.receivePayment}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredHistory.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.udhar.noHistory}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredHistory.map((tx) => {
              const isCredit = tx.type === 'CREDIT';
              return (
                <div
                  key={tx.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {tx.customerName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span>{isCredit ? t.customers.debit : t.customers.credit}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDateTime(tx.createdAt, language)}</span>
                      {tx.billNumber && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-num">{tx.billNumber}</span>
                        </>
                      )}
                      {tx.note && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate max-w-[200px]">{tx.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-bold font-mono-num ${
                        isCredit
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isCredit ? '+' : '-'}
                      {formatINR(tx.amount)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {tx.paymentMode}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <UdharEntryModal
        open={modalState.open}
        mode={modalState.mode}
        customer={modalState.customer}
        onClose={() => setModalState({ open: false, mode: 'PAYMENT', customer: null })}
      />
    </div>
  );
};
