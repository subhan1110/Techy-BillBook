import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { useBillBook } from '../context/BillBookContext';
import { formatINR, getUnitLabel, UNIT_LABELS } from '../i18n/translations';
import { billBookRepo } from '../repositories/sqliteRepository';
import { Product, UnitType } from '../types/models';

interface ProductCatalogModalProps {
  open: boolean;
  onClose: () => void;
}

const UNITS = Object.keys(UNIT_LABELS) as UnitType[];

export const ProductCatalogModal: React.FC<ProductCatalogModalProps> = ({ open, onClose }) => {
  const { t, language, triggerRefresh } = useBillBook();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [nameGu, setNameGu] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState('કિરાણા');
  const [unit, setUnit] = useState<UnitType>('kg');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const load = async (q = search) => {
    const list = await billBookRepo.listProducts(q);
    setProducts(list);
  };

  useEffect(() => {
    if (open) {
      load('');
      setShowForm(false);
      setEditing(null);
      setStatusMsg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) load(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  if (!open) return null;

  const startAdd = () => {
    setEditing(null);
    setNameGu('');
    setNameEn('');
    setCategory(language === 'gu' ? 'કિરાણા' : 'Grocery');
    setUnit('kg');
    setPrice('');
    setError(null);
    setShowForm(true);
  };

  const startEdit = (p: Product) => {
    setEditing(p);
    setNameGu(p.nameGu);
    setNameEn(p.nameEn);
    setCategory(p.category);
    setUnit(p.unit);
    setPrice(String(p.price));
    setError(null);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameGu.trim() && !nameEn.trim()) {
      setError(t.common.required);
      return;
    }
    const parsedPrice = parseFloat(price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setError(t.udhar.errorAmount);
      return;
    }

    if (editing) {
      await billBookRepo.updateProduct(editing.id, {
        nameGu: nameGu.trim() || nameEn.trim(),
        nameEn: nameEn.trim() || nameGu.trim(),
        category: category.trim() || 'કિરાણા',
        unit,
        price: parsedPrice,
      });
    } else {
      await billBookRepo.createProduct({
        nameGu: nameGu.trim() || nameEn.trim(),
        nameEn: nameEn.trim() || nameGu.trim(),
        category: category.trim() || 'કિરાણા',
        unit,
        price: parsedPrice,
      });
    }

    setShowForm(false);
    setEditing(null);
    triggerRefresh();
    await load();
  };

  const handleDelete = async (id: string) => {
    await billBookRepo.deleteProduct(id);
    triggerRefresh();
    await load();
  };

  const handleSeedStarter = async () => {
    await billBookRepo.seedStarterKiranaCatalog();
    triggerRefresh();
    await load();
    setStatusMsg(t.products.starterLoaded);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs sm:p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {t.products.title}
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

        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.products.search}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
            </div>
            <button
              type="button"
              onClick={startAdd}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163864] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-medium cursor-pointer min-h-[44px] whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{t.products.addProduct}</span>
            </button>
          </div>

          {statusMsg && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 px-3.5 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              {statusMsg}
            </div>
          )}

          {/* Add/Edit Form */}
          {showForm && (
            <form
              onSubmit={handleSave}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {editing ? t.products.editProduct : t.products.addProduct}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {t.common.cancel}
                </button>
              </div>
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {t.products.nameGu}
                  </label>
                  <input
                    type="text"
                    value={nameGu}
                    onChange={(e) => setNameGu(e.target.value)}
                    placeholder="દા.ત. તુવેર દાળ"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm min-h-[42px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {t.products.nameEn}
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Toor Dal"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm min-h-[42px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {t.products.unit}
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as UnitType)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm min-h-[42px]"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {getUnitLabel(u, language)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    {t.products.price}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="150"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono-num min-h-[42px]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer min-h-[40px]"
                >
                  {t.common.save}
                </button>
              </div>
            </form>
          )}

          {/* Product List */}
          {products.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t.billing.noProductsCatalog}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {t.billing.noProductsCatalogHint}
              </p>
              <button
                type="button"
                onClick={handleSeedStarter}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer min-h-[44px]"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t.products.loadStarter}</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-[#111C2E] hover:bg-slate-50 dark:hover:bg-slate-900/40"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {language === 'gu' ? p.nameGu : p.nameEn}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {language === 'gu' ? p.nameEn : p.nameGu} · {getUnitLabel(p.unit, language)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold font-mono-num text-slate-900 dark:text-white mr-1">
                      {formatINR(p.price)}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      aria-label={t.common.edit}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                      aria-label={t.common.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
