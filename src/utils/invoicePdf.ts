import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatDateTime, formatINR } from '../i18n/translations';
import { CustomerWithBalance, Language, LedgerEntry, ShopSettings } from '../types/models';

const UNSUPPORTED_COLOR_FN_RE = /(?:oklch|oklab|color-mix|lch|lab)\s*\(/i;

function resolveCssColorToRgb(cssColor: string): string | null {
  if (!cssColor || !UNSUPPORTED_COLOR_FN_RE.test(cssColor)) {
    return null;
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#ffffff';
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 255) {
      return `rgb(${r}, ${g}, ${b})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  } catch {
    return '#ffffff';
  }
}

async function ensureInvoiceFontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await document.fonts.ready;
    await Promise.allSettled([
      document.fonts.load('400 14px "Noto Sans Gujarati"'),
      document.fonts.load('500 14px "Noto Sans Gujarati"'),
      document.fonts.load('600 14px "Noto Sans Gujarati"'),
      document.fonts.load('700 18px "Noto Sans Gujarati"'),
      document.fonts.load('400 14px "Plus Jakarta Sans"'),
      document.fonts.load('600 14px "Plus Jakarta Sans"'),
      document.fonts.load('700 18px "Plus Jakarta Sans"'),
      document.fonts.load('500 14px "JetBrains Mono"'),
    ]);
    await document.fonts.ready;
  } catch {
    // Proceed even if a font loader check is unavailable offline
  }
}

function sanitizeClonedInvoiceTree(clonedDoc: Document, clonedElement: HTMLElement, widthPx: number): void {
  const view = clonedDoc.defaultView;
  clonedDoc.documentElement.classList.remove('dark');
  clonedDoc.documentElement.style.backgroundColor = '#ffffff';
  clonedDoc.documentElement.style.color = '#0f172a';
  clonedDoc.body.style.backgroundColor = '#ffffff';
  clonedDoc.body.style.color = '#0f172a';

  // Neutralize dark/blur modal backdrop ancestors so Tailwind oklch colors don't reach html2canvas
  let ancestor: HTMLElement | null = clonedElement.parentElement;
  while (ancestor && ancestor !== clonedDoc.body) {
    ancestor.style.backgroundColor = '#ffffff';
    ancestor.style.backgroundImage = 'none';
    ancestor.style.color = '#0f172a';
    ancestor.style.borderColor = '#cbd5e1';
    ancestor.style.boxShadow = 'none';
    ancestor.style.backdropFilter = 'none';
    ancestor.style.filter = 'none';
    ancestor = ancestor.parentElement;
  }

  // Lock exact live rendered width & typography so the capture matches the preview pixel-for-pixel
  if (widthPx > 0) {
    clonedElement.style.width = `${widthPx}px`;
    clonedElement.style.maxWidth = 'none';
  }
  clonedElement.style.margin = '0';
  clonedElement.style.boxShadow = 'none';
  clonedElement.style.fontFamily = '"Plus Jakarta Sans", "Noto Sans Gujarati", sans-serif';

  // Normalize any Tailwind v4 oklch/oklab computed colors inside the invoice tree into rgb/rgba
  if (view) {
    const colorProps = [
      'color',
      'backgroundColor',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'outlineColor',
    ] as const;

    const allNodes = [clonedElement, ...Array.from(clonedElement.querySelectorAll<HTMLElement>('*'))];
    for (const node of allNodes) {
      const computed = view.getComputedStyle(node);
      for (const prop of colorProps) {
        const val = computed[prop];
        if (val && UNSUPPORTED_COLOR_FN_RE.test(val)) {
          const resolved = resolveCssColorToRgb(val);
          if (resolved) {
            node.style[prop] = resolved;
          }
        }
      }
      if (computed.boxShadow && UNSUPPORTED_COLOR_FN_RE.test(computed.boxShadow)) {
        node.style.boxShadow = 'none';
      }
    }
  }
}

export async function captureInvoiceCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  await ensureInvoiceFontsReady();

  const rect = element.getBoundingClientRect();
  const capturedWidth = Math.round(rect.width) || element.offsetWidth || 512;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2;
  const scale = Math.max(2.5, Math.min(3, dpr));

  return html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (clonedDoc, clonedElement) => {
      sanitizeClonedInvoiceTree(clonedDoc, clonedElement, capturedWidth);
    },
  });
}

export async function generateInvoiceImageBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await captureInvoiceCanvas(element);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode invoice image.'));
      },
      'image/png',
      1.0
    );
  });
}

export async function generateInvoicePdfBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await captureInvoiceCanvas(element);
  const imgData = canvas.toDataURL('image/png', 1.0);
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

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadInvoiceImage(element: HTMLElement, billNumber: string): Promise<void> {
  const blob = await generateInvoiceImageBlob(element);
  triggerBlobDownload(blob, `Invoice_${billNumber}.png`);
}

export async function downloadInvoicePdf(element: HTMLElement, billNumber: string): Promise<void> {
  const blob = await generateInvoicePdfBlob(element);
  triggerBlobDownload(blob, `Invoice_${billNumber}.pdf`);
}

export type InvoiceShareOutcome = 'shared_png' | 'shared_pdf' | 'cancelled' | 'unsupported';

/**
 * Shares the exact rendered website Bill Preview as a high-resolution PNG image (or PDF if only PDF sharing is supported)
 * via the device's native Web Share API, without generating any separate plain-text bill template.
 */
export async function shareExactInvoiceFile(
  element: HTMLElement,
  billNumber: string
): Promise<InvoiceShareOutcome> {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function'
  ) {
    return 'unsupported';
  }

  const probePng = new File([''], 'probe.png', { type: 'image/png' });
  const probePdf = new File([''], 'probe.pdf', { type: 'application/pdf' });
  const canSharePng = (() => {
    try {
      return navigator.canShare({ files: [probePng] });
    } catch {
      return false;
    }
  })();
  const canSharePdf = (() => {
    try {
      return navigator.canShare({ files: [probePdf] });
    } catch {
      return false;
    }
  })();

  if (!canSharePng && !canSharePdf) {
    return 'unsupported';
  }

  if (canSharePng) {
    const pngBlob = await generateInvoiceImageBlob(element);
    const pngFile = new File([pngBlob], `Invoice_${billNumber}.png`, { type: 'image/png' });
    if (navigator.canShare({ files: [pngFile] })) {
      try {
        await navigator.share({
          title: `Invoice ${billNumber}`,
          files: [pngFile],
        });
        return 'shared_png';
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return 'cancelled';
        }
      }
    }
  }

  if (canSharePdf) {
    const pdfBlob = await generateInvoicePdfBlob(element);
    const pdfFile = new File([pdfBlob], `Invoice_${billNumber}.pdf`, { type: 'application/pdf' });
    if (navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          title: `Invoice ${billNumber}`,
          files: [pdfFile],
        });
        return 'shared_pdf';
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return 'cancelled';
        }
      }
    }
  }

  return 'unsupported';
}

export function getDirectWhatsAppUrl(phone?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const waPhone = digits.length === 10 ? `91${digits}` : digits;
  return waPhone ? `https://wa.me/${waPhone}` : 'https://wa.me/';
}

export interface DirectWhatsAppResult {
  copiedToClipboard: boolean;
  whatsappUrl: string;
}

/**
 * Prepares the exact rendered bill preview as a high-resolution PNG image,
 * downloads it (and copies it to clipboard when supported), and opens WhatsApp
 * directly without invoking the OS Share Sheet (Outlook/Gmail/Teams) or generating
 * any separate plain-text bill template.
 */
export async function shareBillDirectlyToWhatsApp(
  element: HTMLElement,
  billNumber: string,
  customerPhone?: string
): Promise<DirectWhatsAppResult> {
  const pngBlob = await generateInvoiceImageBlob(element);

  let copiedToClipboard = false;
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === 'function' &&
    typeof ClipboardItem !== 'undefined'
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': pngBlob,
        }),
      ]);
      copiedToClipboard = true;
    } catch {
      copiedToClipboard = false;
    }
  }

  triggerBlobDownload(pngBlob, `Invoice_${billNumber}.png`);

  const whatsappUrl = getDirectWhatsAppUrl(customerPhone);
  const a = document.createElement('a');
  a.href = whatsappUrl;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  return {
    copiedToClipboard,
    whatsappUrl,
  };
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
