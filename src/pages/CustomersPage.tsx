import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { CustomerModal } from '../components/CustomerModal';
import { InvoiceModal } from '../components/InvoiceModal';
import { UdharEntryModal } from '../components/UdharEntryModal';
import { useBillBook } from '../context/BillBookContext';
import { formatDateTime, formatINR, getPaymentLabel } from '../i18n/translations';
import { billBookRepo } from '../repositories/sqliteRepository';
import { BillWithItems, CustomerWithBalance, LedgerEntry } from '../types/models';
import { buildWhatsAppLedgerText, openWhatsAppShare } from '../utils/invoicePdf';

export const CustomersPage: React.FC = () => {
  const { t, language, settings, refreshTick, triggerRefresh } = useBillBook();
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([]);
  const [search, setSearch] = useState('');

  // Selected customer detail state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'ledger' | 'bills'>('ledger');
  const [customerBills, setCustomerBills] = useState<BillWithItems[]>([]);
  const [customerLedger, setCustomerLedger] = useState<LedgerEntry[]>([]);

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithBalance | null>(null);
  const [udharModal, setUdharModal] = useState<{
    open: boolean;
    mode: 'PAYMENT' | 'CREDIT';
    customer: CustomerWithBalance | null;
  }>({ open: false, mode: 'PAYMENT', customer: null });
  const [deleteTarget, setDeleteTarget] = useState<CustomerWithBalance | null>(null);
  const [invoiceBill, setInvoiceBill] = useState<BillWithItems | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const list = await billBookRepo.listCustomersWithBalance(search);
      if (!active) return;
      setCustomers(list);
    })();
    return () => {
      active = false;
    };
  }, [search, refreshTick]);

  const selectedCustomer = customers.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    (async () => {
      const [bills, ledger] = await Promise.all([
        billBookRepo.getCustomerBills(selectedId),
        billBookRepo.getCustomerLedger(selectedId),
      ]);
      if (!active) return;
      setCustomerBills(bills);
      setCustomerLedger(ledger);
    })();
    return () => {
      active = false;
    };
  }, [selectedId, refreshTick]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await billBookRepo.deleteCustomer(deleteTarget.id);
    if (selectedId === deleteTarget.id) setSelectedId(null);
    setDeleteTarget(null);
    triggerRefresh();
  };

  // Customer Detail / Ledger View
  if (selectedCustomer) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.common.back}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingCustomer(selectedCustomer);
                setShowCustomerModal(true);
              }}
              className="min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C2E] text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{t.common.edit}</span>
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(selectedCustomer)}
              className="min-h-[42px] px-3 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-xs font-medium text-red-600 dark:text-red-400 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.common.delete}</span>
            </button>
          </div>
        </div>

        {/* Customer Summary Card */}
        <div className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {selectedCustomer.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="inline-flex items-center gap-1 font-mono-num">
                  <Phone className="w-3.5 h-3.5" />
                  {selectedCustomer.phone}
                </span>
                {selectedCustomer.address && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{selectedCustomer.address}</span>
                  </>
                )}
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t.customers.outstanding}
              </div>
              <div
                className={`text-2xl font-bold font-mono-num mt-0.5 ${
                  selectedCustomer.outstandingBalance > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatINR(selectedCustomer.outstandingBalance)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <div className="text-slate-500 dark:text-slate-400">{t.customers.totalPurchases}</div>
              <div className="font-bold font-mono-num text-sm text-slate-900 dark:text-white mt-0.5">
                {formatINR(selectedCustomer.totalBilled)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">{t.customers.totalPaid}</div>
              <div className="font-bold font-mono-num text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatINR(selectedCustomer.totalPaid)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">{t.customers.billsCount}</div>
              <div className="font-bold font-mono-num text-sm text-slate-900 dark:text-white mt-0.5">
                {selectedCustomer.billCount}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {selectedCustomer.outstandingBalance > 0 && (
              <button
                type="button"
                onClick={() =>
                  setUdharModal({ open: true, mode: 'PAYMENT', customer: selectedCustomer })
                }
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163864] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer min-h-[44px]"
              >
                <span>{t.customers.recordPayment}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setUdharModal({ open: true, mode: 'CREDIT', customer: selectedCustomer })
              }
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>{t.customers.addCredit}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const msg = buildWhatsAppLedgerText(
                  selectedCustomer,
                  customerLedger,
                  settings,
                  language
                );
                openWhatsAppShare(msg, selectedCustomer.phone);
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t.customers.shareLedgerWhatsapp}</span>
            </button>
          </div>
        </div>

        {/* Ledger vs Purchase History Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 w-fit">
          <button
            type="button"
            onClick={() => setDetailTab('ledger')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[38px] ${
              detailTab === 'ledger'
                ? 'bg-white dark:bg-[#111C2E] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.customers.ledgerHistory} ({customerLedger.length})
          </button>
          <button
            type="button"
            onClick={() => setDetailTab('bills')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[38px] ${
              detailTab === 'bills'
                ? 'bg-white dark:bg-[#111C2E] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.customers.purchaseHistory} ({customerBills.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 overflow-hidden">
          {detailTab === 'ledger' ? (
            customerLedger.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                {t.udhar.noHistory}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {customerLedger.map((entry) => {
                  const isCredit = entry.type === 'CREDIT';
                  return (
                    <div
                      key={entry.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {isCredit ? t.customers.debit : t.customers.credit}
                          {entry.billNumber ? ` · ${entry.billNumber}` : ''}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {formatDateTime(entry.createdAt, language)}
                          {entry.note ? ` · ${entry.note}` : ''}
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
                          {formatINR(entry.amount)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-num">
                          {t.customers.runningBal}: {formatINR(entry.runningBalance)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : customerBills.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              {t.common.noData}
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {customerBills.map((bill) => (
                <button
                  key={bill.id}
                  type="button"
                  onClick={() => setInvoiceBill(bill)}
                  className="w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer"
                >
                  <div>
                    <div className="text-sm font-semibold font-mono-num text-slate-900 dark:text-white">
                      {bill.billNumber}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatDateTime(bill.createdAt, language)} ·{' '}
                      {getPaymentLabel(bill.paymentMethod, language)} · {bill.items.length}{' '}
                      {t.dashboard.itemsCount}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono-num text-slate-900 dark:text-white">
                      {formatINR(bill.totalAmount)}
                    </div>
                    {bill.balanceAdded > 0 && (
                      <div className="text-[11px] font-mono-num text-red-600 dark:text-red-400">
                        {formatINR(bill.balanceAdded)}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <CustomerModal
          open={showCustomerModal}
          editingCustomer={editingCustomer}
          onClose={() => {
            setShowCustomerModal(false);
            setEditingCustomer(null);
          }}
        />
        <UdharEntryModal
          open={udharModal.open}
          mode={udharModal.mode}
          customer={udharModal.customer}
          onClose={() => setUdharModal({ open: false, mode: 'PAYMENT', customer: null })}
        />
        <InvoiceModal bill={invoiceBill} onClose={() => setInvoiceBill(null)} />

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xl">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t.customers.deleteConfirm}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.customers.deleteHasBalanceWarn}
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer min-h-[40px]"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer min-h-[40px]"
                >
                  {t.common.delete}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Customers Directory View
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t.customers.title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t.customers.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingCustomer(null);
            setShowCustomerModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163864] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-medium cursor-pointer min-h-[44px] whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t.customers.addCustomer}</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.customers.searchPlaceholder}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2E] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
        />
      </div>

      {/* Customers List */}
      <div className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 overflow-hidden">
        {customers.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {t.customers.noCustomers}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {t.customers.noCustomersHint}
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingCustomer(null);
                setShowCustomerModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F294A] dark:bg-blue-600 text-white text-xs font-semibold cursor-pointer min-h-[44px]"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t.customers.addCustomer}</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {customers.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedId(c.id);
                }}
                className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer min-h-[68px]"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {c.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="font-mono-num">{c.phone}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {c.billCount} {t.customers.billsCount}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">{formatINR(c.totalBilled)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-sm font-bold font-mono-num ${
                        c.outstandingBalance > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatINR(c.outstandingBalance)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {c.outstandingBalance > 0 ? t.customers.outstanding : t.customers.settled}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CustomerModal
        open={showCustomerModal}
        editingCustomer={editingCustomer}
        onClose={() => {
          setShowCustomerModal(false);
          setEditingCustomer(null);
        }}
      />
    </div>
  );
};
