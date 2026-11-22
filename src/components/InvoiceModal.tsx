import React, { useRef, useState } from 'react';
import { Download, MessageCircle, Printer, Share2, X } from 'lucide-react';
import { useBillBook } from '../context/BillBookContext';
import { formatDateTime, formatINR, getPaymentLabel, getUnitLabel } from '../i18n/translations';
import { BillWithItems } from '../types/models';
import {
  buildWhatsAppBillText,
  downloadInvoicePdf,
  openWhatsAppShare,
  shareInvoiceNativeOrFallback,
} from '../utils/invoicePdf';

interface InvoiceModalProps {
  bill: BillWithItems | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ bill, onClose }) => {
  const { settings, language, t } = useBillBook();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!bill) return null;

  const shopDisplayName =
    language === 'gu'
      ? settings.shopNameGu || settings.shopName
      : settings.shopName || settings.shopNameGu;
  const footerText = language === 'gu' ? settings.invoiceFooterGu : settings.invoiceFooterEn;

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      await downloadInvoicePdf(invoiceRef.current, bill.billNumber);
    } catch {
      setFeedback(language === 'gu' ? 'PDF બનાવવામાં ભૂલ આવી.' : 'Failed to generate PDF.');
    } finally {
      setBusy(false);
    }
  };

  const handleWhatsApp = () => {
    const text = buildWhatsAppBillText(bill, settings, language);
    openWhatsAppShare(text, bill.customerPhone);
  };

  const handleNativeShare = async () => {
    if (!invoiceRef.current || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      await shareInvoiceNativeOrFallback(invoiceRef.current, bill, settings, language);
    } catch {
      setFeedback(language === 'gu' ? 'શેર કરવામાં ભૂલ આવી.' : 'Failed to share invoice.');
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs sm:p-4">
      <div className="w-full max-w-2xl max-h-[94vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {t.invoice.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-num">
              {bill.billNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Invoice Preview (Uses strict hex colors so html2canvas renders cleanly without oklch issues) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-900/60">
          <div
            id="printable-invoice"
            ref={invoiceRef}
            style={{
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderColor: '#cbd5e1',
              fontFamily: '"Plus Jakarta Sans", "Noto Sans Gujarati", sans-serif',
            }}
            className="mx-auto max-w-lg rounded-xl border p-5 sm:p-7 shadow-sm"
          >
            {/* Shop Header */}
            <div
              className="flex items-start justify-between gap-4 pb-4"
              style={{ borderBottom: '1.5px solid #0f294a' }}
            >
              <div className="flex items-center gap-3">
                {settings.showLogoOnInvoice && settings.logoBase64 && (
                  <img
                    src={settings.logoBase64}
                    alt={shopDisplayName}
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                    style={{ border: '1px solid #e2e8f0' }}
                    referrerPolicy="no-referrer"
                  />
                )}
                <div>
                  <h3 className="text-lg font-bold leading-snug" style={{ color: '#0f294a' }}>
                    {shopDisplayName}
                  </h3>
                  {settings.address && (
                    <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                      {settings.address}
                    </p>
                  )}
                  {settings.phone && (
                    <p className="text-xs mt-0.5 font-mono-num" style={{ color: '#475569' }}>
                      {t.invoice.mobile}: {settings.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded"
                  style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}
                >
                  {t.invoice.taxInvoice}
                </div>
              </div>
            </div>

            {/* Bill & Customer Metadata */}
            <div
              className="grid grid-cols-2 gap-3 py-3.5 text-xs"
              style={{ borderBottom: '1px solid #e2e8f0' }}
            >
              <div>
                <div style={{ color: '#64748b' }}>{t.invoice.customerName}</div>
                <div className="font-semibold text-sm mt-0.5" style={{ color: '#0f172a' }}>
                  {bill.customerName}
                </div>
                {bill.customerPhone && (
                  <div className="font-mono-num mt-0.5" style={{ color: '#475569' }}>
                    {bill.customerPhone}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div style={{ color: '#64748b' }}>{t.invoice.billNumber}</div>
                <div className="font-bold font-mono-num text-sm mt-0.5" style={{ color: '#0f294a' }}>
                  {bill.billNumber}
                </div>
                <div className="mt-0.5" style={{ color: '#475569' }}>
                  {formatDateTime(bill.createdAt, language)}
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <table className="w-full text-xs mt-3 border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                  <th className="py-2 text-left font-semibold">{t.invoice.item}</th>
                  <th className="py-2 text-right font-semibold">{t.invoice.qty}</th>
                  <th className="py-2 text-right font-semibold">{t.invoice.rate}</th>
                  <th className="py-2 text-right font-semibold">{t.invoice.amount}</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="py-2 pr-2 font-medium" style={{ color: '#0f172a' }}>
                      {item.name}
                    </td>
                    <td className="py-2 text-right font-mono-num whitespace-nowrap" style={{ color: '#334155' }}>
                      {item.quantity} {getUnitLabel(item.unit, language)}
                    </td>
                    <td className="py-2 text-right font-mono-num whitespace-nowrap" style={{ color: '#334155' }}>
                      {formatINR(item.unitPrice)}
                    </td>
                    <td className="py-2 text-right font-semibold font-mono-num whitespace-nowrap" style={{ color: '#0f172a' }}>
                      {formatINR(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Block */}
            <div className="mt-4 pt-3 space-y-1.5 text-xs" style={{ borderTop: '1px solid #cbd5e1' }}>
              <div className="flex justify-between" style={{ color: '#475569' }}>
                <span>{t.invoice.subtotal}</span>
                <span className="font-mono-num font-medium">{formatINR(bill.subtotal)}</span>
              </div>
              {bill.discountAmount > 0 && (
                <div className="flex justify-between" style={{ color: '#15803d' }}>
                  <span>
                    {t.invoice.discount}
                    {bill.discountType === 'PERCENT' ? ` (${bill.discountValue}%)` : ''}
                  </span>
                  <span className="font-mono-num font-medium">-{formatINR(bill.discountAmount)}</span>
                </div>
              )}
              <div
                className="flex justify-between items-center pt-2 text-base font-bold"
                style={{ borderTop: '1.5px solid #0f294a', color: '#0f294a' }}
              >
                <span>{t.invoice.total}</span>
                <span className="font-mono-num">{formatINR(bill.totalAmount)}</span>
              </div>

              <div className="flex justify-between pt-1.5" style={{ color: '#475569' }}>
                <span>{t.invoice.paymentMode}</span>
                <span className="font-semibold" style={{ color: '#0f172a' }}>
                  {getPaymentLabel(bill.paymentMethod, language)}
                </span>
              </div>

              {bill.balanceAdded > 0 && (
                <>
                  <div className="flex justify-between" style={{ color: '#475569' }}>
                    <span>{t.invoice.paidAmount}</span>
                    <span className="font-mono-num">{formatINR(bill.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold" style={{ color: '#b91c1c' }}>
                    <span>{t.invoice.udharBalance}</span>
                    <span className="font-mono-num">{formatINR(bill.balanceAdded)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div
              className="mt-5 pt-3 text-center text-[11px] space-y-1"
              style={{ borderTop: '1px dashed #cbd5e1', color: '#64748b' }}
            >
              {settings.upiId && (
                <div className="font-mono-num font-medium" style={{ color: '#1e3a8a' }}>
                  {t.invoice.upiPayNote}: {settings.upiId}
                </div>
              )}
              <div>{footerText}</div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2E] shrink-0">
          {feedback && (
            <p className="text-xs text-red-600 dark:text-red-400 mb-2 text-center">{feedback}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#0F294A] hover:bg-[#163864] dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer min-h-[44px] disabled:opacity-60"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap truncate">
                {busy ? t.invoice.generatingPdf : t.common.downloadPdf}
              </span>
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap truncate">{t.common.shareWhatsapp}</span>
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer min-h-[44px] disabled:opacity-60"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap truncate">{t.common.shareOther}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer min-h-[44px]"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap truncate">{t.common.print}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
