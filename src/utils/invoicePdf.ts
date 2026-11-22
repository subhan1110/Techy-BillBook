import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatDateTime, formatINR, getPaymentLabel, getUnitLabel } from '../i18n/translations';
import { BillWithItems, CustomerWithBalance, Language, LedgerEntry, ShopSettings } from '../types/models';

export async function generateInvoicePdfBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 2.2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * usableWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  return pdf.output('blob');
}

export async function downloadInvoicePdf(element: HTMLElement, billNumber: string): Promise<void> {
  const blob = await generateInvoicePdfBlob(element);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice_${billNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildWhatsAppBillText(
  bill: BillWithItems,
  settings: ShopSettings,
  lang: Language
): string {
  const shopTitle = lang === 'gu' ? settings.shopNameGu || settings.shopName : settings.shopName || settings.shopNameGu;
  const lines: string[] = [];
  lines.push(`*${shopTitle}*`);
  if (settings.address) lines.push(settings.address);
  if (settings.phone) lines.push(`📞 ${settings.phone}`);
  lines.push('------------------------');
  lines.push(
    lang === 'gu'
      ? `બિલ નં.: *${bill.billNumber}*`
      : `Bill No: *${bill.billNumber}*`
  );
  lines.push(
    lang === 'gu'
      ? `તારીખ: ${formatDateTime(bill.createdAt, lang)}`
      : `Date: ${formatDateTime(bill.createdAt, lang)}`
  );
  lines.push(
    lang === 'gu'
      ? `ગ્રાહક: ${bill.customerName}`
      : `Customer: ${bill.customerName}`
  );
  lines.push('------------------------');

  bill.items.forEach((it, idx) => {
    const uLabel = getUnitLabel(it.unit, lang);
    lines.push(
      `${idx + 1}. ${it.name} (${it.quantity} ${uLabel} x ${formatINR(it.unitPrice)}) = *${formatINR(it.lineTotal)}*`
    );
  });

  lines.push('------------------------');
  if (bill.discountAmount > 0) {
    lines.push(
      lang === 'gu'
        ? `પેટા કુલ: ${formatINR(bill.subtotal)}`
        : `Subtotal: ${formatINR(bill.subtotal)}`
    );
    lines.push(
      lang === 'gu'
        ? `ડિસ્કાઉન્ટ: -${formatINR(bill.discountAmount)}`
        : `Discount: -${formatINR(bill.discountAmount)}`
    );
  }
  lines.push(
    lang === 'gu'
      ? `*કુલ રકમ: ${formatINR(bill.totalAmount)}*`
      : `*Grand Total: ${formatINR(bill.totalAmount)}*`
  );
  lines.push(
    lang === 'gu'
      ? `ચુકવણી: ${getPaymentLabel(bill.paymentMethod, lang)}`
      : `Payment: ${getPaymentLabel(bill.paymentMethod, lang)}`
  );
  if (bill.balanceAdded > 0) {
    lines.push(
      lang === 'gu'
        ? `જમા: ${formatINR(bill.paidAmount)} | ઉધાર બાકી: *${formatINR(bill.balanceAdded)}*`
        : `Paid: ${formatINR(bill.paidAmount)} | Udhar Added: *${formatINR(bill.balanceAdded)}*`
    );
  }
  if (settings.upiId) {
    lines.push(`UPI: ${settings.upiId}`);
  }
  lines.push('');
  lines.push(lang === 'gu' ? settings.invoiceFooterGu : settings.invoiceFooterEn);

  return lines.join('\n');
}

export function openWhatsAppShare(text: string, phone?: string): void {
  const digits = (phone || '').replace(/\D/g, '');
  const waPhone = digits.length === 10 ? `91${digits}` : digits;
  const url = waPhone
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function shareInvoiceNativeOrFallback(
  element: HTMLElement,
  bill: BillWithItems,
  settings: ShopSettings,
  lang: Language
): Promise<'shared_file' | 'shared_text' | 'downloaded'> {
  const text = buildWhatsAppBillText(bill, settings, lang);
  try {
    const blob = await generateInvoicePdfBlob(element);
    const file = new File([blob], `Invoice_${bill.billNumber}.pdf`, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `Invoice ${bill.billNumber}`,
        text,
        files: [file],
      });
      return 'shared_file';
    }
    if (navigator.share) {
      await navigator.share({
        title: `Invoice ${bill.billNumber}`,
        text,
      });
      return 'shared_text';
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return 'shared_text';
    }
  }
  await downloadInvoicePdf(element, bill.billNumber);
  return 'downloaded';
}

export function buildWhatsAppLedgerText(
  customer: CustomerWithBalance,
  entries: LedgerEntry[],
  settings: ShopSettings,
  lang: Language
): string {
  const shopTitle = lang === 'gu' ? settings.shopNameGu || settings.shopName : settings.shopName || settings.shopNameGu;
  const lines: string[] = [];
  lines.push(`*${shopTitle}*`);
  if (settings.phone) lines.push(`📞 ${settings.phone}`);
  lines.push('------------------------');
  lines.push(
    lang === 'gu'
      ? `ગ્રાહક ખાતાવહી: *${customer.name}*`
      : `Customer Ledger: *${customer.name}*`
  );
  lines.push(
    lang === 'gu'
      ? `કુલ બાકી ઉધાર: *${formatINR(customer.outstandingBalance)}*`
      : `Outstanding Udhar: *${formatINR(customer.outstandingBalance)}*`
  );
  if (entries.length > 0) {
    lines.push('------------------------');
    const recent = entries.slice(0, 8);
    for (const e of recent) {
      const sign = e.type === 'CREDIT' ? '+' : '-';
      const label = e.type === 'CREDIT' ? (lang === 'gu' ? 'ઉધાર' : 'Udhar') : (lang === 'gu' ? 'જમા' : 'Paid');
      lines.push(`${formatDateTime(e.createdAt, lang)} · ${label} ${sign}${formatINR(e.amount)} (${lang === 'gu' ? 'બાકી' : 'Bal'}: ${formatINR(e.runningBalance)})`);
    }
  }
  if (settings.upiId && customer.outstandingBalance > 0) {
    lines.push('------------------------');
    lines.push(`UPI: ${settings.upiId}`);
  }
  return lines.join('\n');
}
