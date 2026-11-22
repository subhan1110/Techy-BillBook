import React, { useEffect, useMemo, useState } from 'react';
import {
  Minus,
  PackagePlus,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { CustomerModal } from '../components/CustomerModal';
import { InvoiceModal } from '../components/InvoiceModal';
import { ProductCatalogModal } from '../components/ProductCatalogModal';
import { useBillBook } from '../context/BillBookContext';
import { formatINR, getUnitLabel, roundMoney, UNIT_LABELS } from '../i18n/translations';
import { billBookRepo } from '../repositories/sqliteRepository';
import {
  BillWithItems,
  CartItem,
  CustomerWithBalance,
  DiscountType,
  PaymentMethod,
  Product,
  UnitType,
} from '../types/models';

const UNITS = Object.keys(UNIT_LABELS) as UnitType[];

export const BillingPage: React.FC = () => {
  const { t, language, refreshTick, triggerRefresh } = useBillBook();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([]);
  const [nextBillNo, setNextBillNo] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Quick custom item form
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [customUnit, setCustomUnit] = useState<UnitType>('pcs');
  const [customPrice, setCustomPrice] = useState('');
  const [saveCustomToCatalog, setSaveCustomToCatalog] = useState(false);

  // Cart & billing state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [discountType, setDiscountType] = useState<DiscountType>('FLAT');
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidNow, setPaidNow] = useState<string>('0');
  const [notes, setNotes] = useState('');

  // UI feedback & modals
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedBill, setSavedBill] = useState<BillWithItems | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [prodList, custList, billNo] = await Promise.all([
        billBookRepo.listProducts(),
        billBookRepo.listCustomersWithBalance(),
        billBookRepo.getNextBillNumber(),
      ]);
      if (!active) return;
      setProducts(prodList);
      setCustomers(custList);
      setNextBillNo(billNo);
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.nameGu.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const subtotal = useMemo(
    () => roundMoney(cart.reduce((sum, item) => sum + roundMoney(item.quantity * item.unitPrice), 0)),
    [cart]
  );

  const parsedDiscountVal = Math.max(0, parseFloat(discountValue) || 0);
  const discountAmount = useMemo(() => {
    if (discountType === 'PERCENT') {
      const pct = Math.min(100, parsedDiscountVal);
      return roundMoney((subtotal * pct) / 100);
    }
    return roundMoney(Math.min(subtotal, parsedDiscountVal));
  }, [subtotal, discountType, parsedDiscountVal]);

  const grandTotal = useMemo(() => roundMoney(Math.max(0, subtotal - discountAmount)), [subtotal, discountAmount]);

  const parsedPaidNow = paymentMethod === 'UDHAR' ? roundMoney(Math.max(0, parseFloat(paidNow) || 0)) : grandTotal;
  const udharBalanceAdded = paymentMethod === 'UDHAR' ? roundMoney(Math.max(0, grandTotal - parsedPaidNow)) : 0;

  const addProductToCart = (product: Product) => {
    setError(null);
    const displayName = language === 'gu' ? product.nameGu : product.nameEn;
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        return prev.map((c) =>
          c.productId === product.id ? { ...c, quantity: roundMoney(c.quantity + 1) } : c
        );
      }
      return [
        ...prev,
        {
          tempId: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          productId: product.id,
          name: displayName,
          unit: product.unit,
          quantity: 1,
          unitPrice: product.price,
        },
      ];
    });
  };

  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = customName.trim();
    const qty = Math.max(0.01, parseFloat(customQty) || 0);
    const price = Math.max(0, parseFloat(customPrice) || 0);
    if (!cleanName || customPrice === '') {
      setError(t.common.required);
      return;
    }

    setError(null);
    let createdProductId: string | null = null;
    if (saveCustomToCatalog) {
      const created = await billBookRepo.createProduct({
        nameGu: cleanName,
        nameEn: cleanName,
        category: language === 'gu' ? 'કિરાણા' : 'Grocery',
        unit: customUnit,
        price,
      });
      createdProductId = created.id;
      triggerRefresh();
    }

    setCart((prev) => [
      ...prev,
      {
        tempId: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        productId: createdProductId,
        name: cleanName,
        unit: customUnit,
        quantity: roundMoney(qty),
        unitPrice: roundMoney(price),
      },
    ]);

    setCustomName('');
    setCustomQty('1');
    setCustomPrice('');
    setSaveCustomToCatalog(false);
  };

  const updateCartItem = (tempId: string, patch: Partial<CartItem>) => {
    setCart((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item))
    );
  };

  const removeCartItem = (tempId: string) => {
    setCart((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handleSeedStarter = async () => {
    await billBookRepo.seedStarterKiranaCatalog();
    triggerRefresh();
  };

  const handleGenerateBill = async () => {
    setError(null);
    if (cart.length === 0) {
      setError(t.billing.errorEmptyCart);
      return;
    }
    const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null;
    if (paymentMethod === 'UDHAR' && !selectedCustomer) {
      setError(t.billing.errorCustomerRequiredForUdhar);
      return;
    }
    if (paymentMethod === 'UDHAR' && parsedPaidNow > grandTotal) {
      setError(t.billing.errorInvalidPaid);
      return;
    }

    setSaving(true);
    try {
      const created = await billBookRepo.createBill({
        billNumber: nextBillNo,
        customerId: selectedCustomer ? selectedCustomer.id : null,
        customerName: selectedCustomer ? selectedCustomer.name : t.dashboard.walkInCustomer,
        customerPhone: selectedCustomer ? selectedCustomer.phone : '',
        items: cart.map((c) => ({
          productId: c.productId,
          name: c.name,
          unit: c.unit,
          quantity: Math.max(0.01, c.quantity),
          unitPrice: Math.max(0, c.unitPrice),
        })),
        discountType,
        discountValue: parsedDiscountVal,
        paymentMethod,
        paidAmount: paymentMethod === 'UDHAR' ? parsedPaidNow : grandTotal,
        notes: notes.trim(),
      });

      setSavedBill(created);
      setCart([]);
      setDiscountValue('0');
      setPaidNow('0');
      setNotes('');
      setPaymentMethod('CASH');
      setSelectedCustomerId('');
      triggerRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t.billing.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-num mt-0.5">
            {t.billing.billNo}: <span className="font-semibold text-slate-800 dark:text-slate-200">{nextBillNo}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCatalogModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C2E] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-[42px]"
        >
          <PackagePlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{t.billing.manageProducts}</span>
        </button>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Product Search & Quick Custom Entry */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Custom Item Bar */}
          <form
            onSubmit={handleAddCustomItem}
            className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-4 space-y-3"
          >
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t.billing.quickCustomItem}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={t.billing.itemNamePlaceholder}
                className="sm:col-span-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
                placeholder={t.billing.qty}
                aria-label={t.billing.qty}
                className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm font-mono-num min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <select
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value as UnitType)}
                aria-label={t.billing.unit}
                className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {getUnitLabel(u, language)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder={t.billing.rate}
                aria-label={t.billing.rate}
                className="sm:col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm font-mono-num min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveCustomToCatalog}
                  onChange={(e) => setSaveCustomToCatalog(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 w-4 h-4"
                />
                <span>{t.billing.saveToCatalog}</span>
              </label>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>{t.billing.addToCart}</span>
              </button>
            </div>
          </form>

          {/* Product Search & Tap Grid */}
          <div className="rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 p-4 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder={t.billing.searchProducts}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
            </div>

            {products.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t.billing.noProductsCatalog}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
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
            ) : filteredProducts.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                {t.billing.noProductsFound}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProductToCart(p)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 p-3 text-left transition-colors cursor-pointer flex flex-col justify-between min-h-[82px] active:scale-[0.98]"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">
                      {language === 'gu' ? p.nameGu : p.nameEn}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        {getUnitLabel(p.unit, language)}
                      </span>
                      <span className="font-bold font-mono-num text-[#0F294A] dark:text-blue-400">
                        {formatINR(p.price)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bill Cart & Checkout */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t.billing.cartTitle} ({cart.length})
              </h3>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer"
              >
                {t.billing.clearCart}
              </button>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Cart Items */}
            {cart.length === 0 ? (
              <div className="py-8 text-center space-y-1.5">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {t.billing.emptyCart}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {t.billing.emptyCartHint}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[300px] overflow-y-auto pr-1">
                {cart.map((item) => {
                  const lineTotal = roundMoney(item.quantity * item.unitPrice);
                  return (
                    <div key={item.tempId} className="py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {item.name}
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                            ({getUnitLabel(item.unit, language)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.tempId)}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                          aria-label={t.common.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {/* Qty stepper */}
                        <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              updateCartItem(item.tempId, {
                                quantity: Math.max(0.25, roundMoney(item.quantity - 1)),
                              })
                            }
                            className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateCartItem(item.tempId, {
                                quantity: Math.max(0.01, parseFloat(e.target.value) || 0.01),
                              })
                            }
                            className="w-12 text-center bg-transparent text-xs font-mono-num font-semibold text-slate-900 dark:text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateCartItem(item.tempId, {
                                quantity: roundMoney(item.quantity + 1),
                              })
                            }
                            className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Editable Rate */}
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <span>₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateCartItem(item.tempId, {
                                unitPrice: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                            className="w-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-1.5 text-right text-xs font-mono-num font-medium text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>

                        {/* Line Total */}
                        <div className="text-sm font-bold font-mono-num text-slate-900 dark:text-white min-w-[68px] text-right">
                          {formatINR(lineTotal)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Customer Selection */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t.billing.customerLabel}
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t.billing.newCustomerQuick}</span>
                </button>
              </div>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setError(null);
                }}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              >
                <option value="">{t.billing.walkIn}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                    {c.outstandingBalance > 0 ? ` — ${formatINR(c.outstandingBalance)}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Discount */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t.billing.discount}
                </label>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900">
                  {(['FLAT', 'PERCENT'] as const).map((dt) => (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => setDiscountType(dt)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                        discountType === dt
                          ? 'bg-white dark:bg-[#111C2E] text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {dt === 'FLAT' ? '₹' : '%'}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-sm font-mono-num text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[42px]"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                {t.billing.paymentMethod}
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900">
                {(['CASH', 'UPI', 'UDHAR'] as const).map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(pm);
                      setError(null);
                    }}
                    className={`py-2.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[40px] whitespace-nowrap ${
                      paymentMethod === pm
                        ? pm === 'UDHAR'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-[#0F294A] dark:bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {pm === 'CASH' ? t.billing.cash : pm === 'UPI' ? t.billing.upi : t.billing.udhar}
                  </button>
                ))}
              </div>

              {paymentMethod === 'UDHAR' && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs text-slate-600 dark:text-slate-300">
                      {t.billing.paidNow}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paidNow}
                      onChange={(e) => setPaidNow(e.target.value)}
                      className="w-28 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-right text-sm font-mono-num font-semibold"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">{t.billing.udharAdded}</span>
                    <span className="font-bold font-mono-num text-red-600 dark:text-red-400">
                      {formatINR(udharBalanceAdded)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Totals Summary */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>{t.billing.subtotal}</span>
                <span className="font-mono-num">{formatINR(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>{t.billing.discount}</span>
                  <span className="font-mono-num">-{formatINR(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1.5 text-lg font-bold text-slate-900 dark:text-white">
                <span>{t.billing.grandTotal}</span>
                <span className="font-mono-num text-[#0F294A] dark:text-blue-400">
                  {formatINR(grandTotal)}
                </span>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerateBill}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0F294A] hover:bg-[#163864] dark:bg-blue-600 dark:hover:bg-blue-500 text-white py-3.5 px-4 text-sm font-semibold shadow-sm transition-all active:scale-[0.99] cursor-pointer min-h-[48px] disabled:opacity-60"
            >
              <ReceiptText className="w-4 h-4 shrink-0" />
              <span>{t.billing.generateBill}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CustomerModal
        open={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onSaved={(c) => setSelectedCustomerId(c.id)}
      />
      <ProductCatalogModal open={showCatalogModal} onClose={() => setShowCatalogModal(false)} />
      <InvoiceModal bill={savedBill} onClose={() => setSavedBill(null)} />
    </div>
  );
};
