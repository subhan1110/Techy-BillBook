import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useBillBook } from '../context/BillBookContext';
import { billBookRepo } from '../repositories/sqliteRepository';
import { Customer } from '../types/models';

interface CustomerModalProps {
  open: boolean;
  editingCustomer?: Customer | null;
  onClose: () => void;
  onSaved?: (customer: Customer) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  open,
  editingCustomer,
  onClose,
  onSaved,
}) => {
  const { t, triggerRefresh } = useBillBook();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editingCustomer?.name ?? '');
      setPhone(editingCustomer?.phone ?? '');
      setAddress(editingCustomer?.address ?? '');
      setError(null);
    }
  }, [open, editingCustomer]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanName) {
      setError(t.customers.invalidName);
      return;
    }
    if (cleanPhone.length !== 10) {
      setError(t.customers.invalidPhone);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = editingCustomer
        ? await billBookRepo.updateCustomer(editingCustomer.id, {
            name: cleanName,
            phone: cleanPhone,
            address: address.trim(),
          })
        : await billBookRepo.createCustomer({
            name: cleanName,
            phone: cleanPhone,
            address: address.trim(),
          });
      triggerRefresh();
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {editingCustomer ? t.customers.editCustomer : t.customers.addCustomer}
          </h2>
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
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t.customers.name} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="દા.ત. રમેશભાઈ પટેલ / Ramesh Patel"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t.customers.phone} *
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9876543210"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm font-mono-num text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t.customers.address} ({t.common.optional})
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="દા.ત. શિવમ સોસાયટી"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
            />
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
