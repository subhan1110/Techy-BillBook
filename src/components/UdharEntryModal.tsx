import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useBillBook } from '../context/BillBookContext';
import { formatINR, roundMoney } from '../i18n/translations';
import { billBookRepo } from '../repositories/sqliteRepository';
import { CustomerWithBalance } from '../types/models';

interface UdharEntryModalProps {
  open: boolean;
  mode: 'PAYMENT' | 'CREDIT';
  customer: CustomerWithBalance | null;
  onClose: () => void;
  onSaved?: () => void;
}

export const UdharEntryModal: React.FC<UdharEntryModalProps> = ({
  open,
  mode,
  customer,
  onClose,
  onSaved,
}) => {
  const { t, triggerRefresh } = useBillBook();
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(
        mode === 'PAYMENT' && customer && customer.outstandingBalance > 0
          ? String(customer.outstandingBalance)
          : ''
      );
      setPaymentMode('CASH');
      setNote('');
      setError(null);
    }
  }, [open, mode, customer]);

  if (!open || !customer) return null;

  const parsedAmount = roundMoney(parseFloat(amount) || 0);
  const remainingAfter =
    mode === 'PAYMENT'
      ? roundMoney(Math.max(0, customer.outstandingBalance - parsedAmount))
      : roundMoney(customer.outstandingBalance + parsedAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      setError(t.udhar.errorAmount);
      return;
    }
    if (mode === 'PAYMENT' && parsedAmount > customer.outstandingBalance + 0.01) {
      setError(t.udhar.errorExceedsBalance);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (mode === 'PAYMENT') {
        await billBookRepo.recordUdharPayment({
          customerId: customer.id,
          amount: parsedAmount,
          paymentMode,
          note: note.trim(),
        });
      } else {
        await billBookRepo.recordManualUdharCredit({
          customerId: customer.id,
          amount: parsedAmount,
          note: note.trim(),
        });
      }
      triggerRefresh();
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {mode === 'PAYMENT' ? t.udhar.receivePayment : t.udhar.addManualUdhar}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {customer.name} · <span className="font-mono-num">{customer.phone}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm">
            <span className="text-slate-600 dark:text-slate-300">{t.customers.outstanding}</span>
            <span className="font-bold font-mono-num text-red-600 dark:text-red-400">
              {formatINR(customer.outstandingBalance)}
            </span>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {mode === 'PAYMENT' ? t.udhar.paymentAmount : t.udhar.creditAmount} *
              </label>
              {mode === 'PAYMENT' && customer.outstandingBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(customer.outstandingBalance))}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {t.udhar.fullPayHint}
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-base font-bold font-mono-num text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              autoFocus
            />
          </div>

          {mode === 'PAYMENT' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.udhar.paymentMode}
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900">
                {(['CASH', 'UPI'] as const).map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMode(pm)}
                    className={`py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[40px] ${
                      paymentMode === pm
                        ? 'bg-white dark:bg-[#111C2E] text-[#0F294A] dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {pm === 'CASH' ? t.billing.cash : t.billing.upi}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t.common.notes} ({t.common.optional})
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.udhar.notePlaceholder}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>{t.udhar.remainingAfter}</span>
            <span className="font-bold font-mono-num text-slate-900 dark:text-white">
              {formatINR(remainingAfter)}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[44px]"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163864] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-medium cursor-pointer min-h-[44px] disabled:opacity-60"
            >
              {t.common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
