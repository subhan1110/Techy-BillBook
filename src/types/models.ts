export type Language = 'gu' | 'en';
export type ThemeMode = 'light' | 'dark';
export type PaymentMethod = 'CASH' | 'UPI' | 'UDHAR';
export type DiscountType = 'FLAT' | 'PERCENT';
export type UnitType = 'kg' | 'gm' | 'ltr' | 'ml' | 'pkt' | 'pcs' | 'box' | 'doz';

export interface Product {
  id: string;
  nameGu: string;
  nameEn: string;
  category: string;
  unit: UnitType;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  nameGu: string;
  nameEn: string;
  category: string;
  unit: UnitType;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInput {
  name: string;
  phone: string;
  address?: string;
}

export interface CustomerWithBalance extends Customer {
  totalBilled: number;
  totalCreditAdded: number;
  totalPaid: number;
  outstandingBalance: number;
  billCount: number;
  lastTransactionAt: string | null;
}

export interface CartItem {
  tempId: string;
  productId: string | null;
  name: string;
  unit: UnitType;
  quantity: number;
  unitPrice: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAdded: number;
  paymentMethod: PaymentMethod;
  notes: string;
  createdAt: string;
}

export interface BillItem {
  id: string;
  billId: string;
  productId: string | null;
  name: string;
  unit: UnitType;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BillWithItems extends Bill {
  items: BillItem[];
}

export interface CreateBillInput {
  billNumber?: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  items: Array<{
    productId: string | null;
    name: string;
    unit: UnitType;
    quantity: number;
    unitPrice: number;
  }>;
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: PaymentMethod;
  paidAmount?: number;
  notes?: string;
}

export type UdharEntryType = 'CREDIT' | 'PAYMENT';
export type UdharPaymentMode = 'CASH' | 'UPI' | 'BILL';

export interface UdharTransaction {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  type: UdharEntryType;
  amount: number;
  paymentMode: UdharPaymentMode;
  billId: string | null;
  billNumber: string | null;
  note: string;
  createdAt: string;
}

export interface LedgerEntry extends UdharTransaction {
  runningBalance: number;
}

export interface ShopSettings {
  shopName: string;
  shopNameGu: string;
  address: string;
  phone: string;
  upiId: string;
  logoBase64: string;
  billPrefix: string;
  invoiceFooterGu: string;
  invoiceFooterEn: string;
  showLogoOnInvoice: boolean;
  language: Language;
  theme: ThemeMode;
}

export interface DashboardStats {
  todaySales: number;
  todayBills: number;
  totalOutstandingUdhar: number;
  totalCustomers: number;
}

export type ReportPeriod = 'daily' | 'monthly' | 'yearly';

export interface ReportChartBucket {
  label: string;
  totalSales: number;
  cashSales: number;
  upiSales: number;
  udharSales: number;
  billCount: number;
}

export interface SalesReport {
  period: ReportPeriod;
  referenceDate: string;
  totalSales: number;
  totalBills: number;
  cashSales: number;
  upiSales: number;
  udharSales: number;
  totalOutstandingUdhar: number;
  paymentsCollected: number;
  buckets: ReportChartBucket[];
}

export interface BackupSnapshot {
  version: number;
  exportedAt: string;
  settings: ShopSettings;
  products: Product[];
  customers: Customer[];
  bills: Bill[];
  billItems: BillItem[];
  udharTransactions: UdharTransaction[];
}

export type AppRoute = 'dashboard' | 'billing' | 'customers' | 'udhar' | 'reports' | 'settings';
