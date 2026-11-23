import { getLocalDateKey, roundMoney } from '../i18n/translations';
import {
  BackupSnapshot,
  Bill,
  BillItem,
  BillWithItems,
  CreateBillInput,
  Customer,
  CustomerInput,
  CustomerWithBalance,
  DashboardStats,
  LedgerEntry,
  Product,
  ProductInput,
  ReportChartBucket,
  ReportPeriod,
  SalesReport,
  ShopSettings,
  UdharPaymentMode,
  UdharTransaction,
  UserShopProfile,
} from '../types/models';
import { IBillBookRepository } from './billBookRepository';

const DEFAULT_DEMO_SETTINGS: ShopSettings = {
  shopName: 'Demo Kirana Store (Sample)',
  shopNameGu: 'નમૂના કિરાણા સ્ટોર (Demo)',
  address: 'મેઈન બજાર રોડ, અમદાવાદ (Sample Data)',
  phone: '9800000000',
  upiId: 'demokirana@upi',
  logoBase64: '',
  billPrefix: 'DEMO',
  invoiceFooterGu: 'આ નમૂના (Demo) બિલ છે — સાચું બિલ બનાવવા સાઇન ઇન કરો.',
  invoiceFooterEn: 'Sample Demo Invoice — Sign in to save real store bills.',
  showLogoOnInvoice: true,
  language: 'gu',
  theme: 'light',
};

function createDemoId(prefix: string): string {
  return `${prefix}_demo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function isoAtLocalOffset(
  daysAgo: number,
  hour: number,
  minute: number,
  fallbackMinutesAgo = 10
): string {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  if (daysAgo === 0 && d.getTime() > now.getTime()) {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 1, 0, 0);
    return new Date(
      Math.max(startOfToday.getTime(), now.getTime() - fallbackMinutesAgo * 60 * 1000)
    ).toISOString();
  }
  return d.toISOString();
}

interface DemoMemoryState {
  settings: ShopSettings;
  products: Product[];
  customers: Customer[];
  bills: Bill[];
  billItems: BillItem[];
  udharTransactions: UdharTransaction[];
}

function buildInitialDemoState(preferredSettings?: Partial<ShopSettings>): DemoMemoryState {
  const now = new Date().toISOString();
  const baseProducts: Array<ProductInput & { id: string }> = [
    { id: 'demo_prd_1', nameGu: 'તુવેર દાળ', nameEn: 'Toor Dal', category: 'દાળ અને કઠોળ', unit: 'kg', price: 155 },
    { id: 'demo_prd_2', nameGu: 'મગ દાળ', nameEn: 'Moong Dal', category: 'દાળ અને કઠોળ', unit: 'kg', price: 120 },
    { id: 'demo_prd_3', nameGu: 'બાસમતી ચોખા', nameEn: 'Basmati Rice', category: 'અનાજ અને લોટ', unit: 'kg', price: 110 },
    { id: 'demo_prd_4', nameGu: 'ઘઉંનો લોટ', nameEn: 'Wheat Flour (Atta)', category: 'અનાજ અને લોટ', unit: 'kg', price: 42 },
    { id: 'demo_prd_5', nameGu: 'ખાંડ', nameEn: 'Sugar', category: 'રોજિંદી વસ્તુ', unit: 'kg', price: 44 },
    { id: 'demo_prd_6', nameGu: 'દેશી ગોળ', nameEn: 'Jaggery (Gol)', category: 'રોજિંદી વસ્તુ', unit: 'kg', price: 65 },
    { id: 'demo_prd_7', nameGu: 'મીઠું (આયોડાઇઝ્ડ)', nameEn: 'Tata Salt', category: 'રોજિંદી વસ્તુ', unit: 'pkt', price: 28 },
    { id: 'demo_prd_8', nameGu: 'સીંગતેલ (૧ લિટર)', nameEn: 'Groundnut Oil', category: 'તેલ અને ઘી', unit: 'ltr', price: 185 },
    { id: 'demo_prd_9', nameGu: 'અમૂલ શુદ્ધ ઘી', nameEn: 'Amul Ghee', category: 'તેલ અને ઘી', unit: 'ltr', price: 620 },
    { id: 'demo_prd_10', nameGu: 'ચાની ભૂકી', nameEn: 'Tea Powder', category: 'પીણાં અને નાસ્તો', unit: 'pkt', price: 130 },
    { id: 'demo_prd_11', nameGu: 'હળદર પાવડર', nameEn: 'Turmeric Powder', category: 'મસાલા', unit: 'pkt', price: 45 },
    { id: 'demo_prd_12', nameGu: 'નાહવાનો સાબુ', nameEn: 'Bath Soap', category: 'સાફ-સફાઈ', unit: 'pcs', price: 36 },
    { id: 'demo_prd_13', nameGu: 'કપડાં ધોવાનો પાવડર', nameEn: 'Washing Powder', category: 'સાફ-સફાઈ', unit: 'kg', price: 85 },
    { id: 'demo_prd_14', nameGu: 'પારલે-જી બિસ્કિટ', nameEn: 'Parle-G Biscuit', category: 'પીણાં અને નાસ્તો', unit: 'pkt', price: 10 },
  ];

  const products: Product[] = baseProducts.map((p) => ({
    ...p,
    createdAt: now,
    updatedAt: now,
  }));

  const customers: Customer[] = [
    {
      id: 'demo_cust_1',
      name: 'રમેશભાઈ પટેલ (Demo)',
      phone: '9800000001',
      address: 'શિવમ સોસાયટી (Sample)',
      createdAt: isoAtLocalOffset(20, 10, 0),
      updatedAt: now,
    },
    {
      id: 'demo_cust_2',
      name: 'મહેશભાઈ શાહ (Demo)',
      phone: '9800000002',
      address: 'ગાંધી ચોક (Sample)',
      createdAt: isoAtLocalOffset(15, 11, 0),
      updatedAt: now,
    },
    {
      id: 'demo_cust_3',
      name: 'ગીતાબેન પ્રજાપતિ (Demo)',
      phone: '9800000003',
      address: 'નવા બજાર (Sample)',
      createdAt: isoAtLocalOffset(10, 12, 0),
      updatedAt: now,
    },
    {
      id: 'demo_cust_4',
      name: 'સુરેશભાઈ દેસાઈ (Demo)',
      phone: '9800000004',
      address: 'સ્ટેશન રોડ (Sample)',
      createdAt: isoAtLocalOffset(5, 16, 0),
      updatedAt: now,
    },
  ];

  const year = new Date().getFullYear();
  const bill1Time = isoAtLocalOffset(0, 8, 25, 45);
  const bill2Time = isoAtLocalOffset(0, 9, 40, 25);
  const bill3Time = isoAtLocalOffset(0, 10, 15, 10);
  const bill4Time = isoAtLocalOffset(2, 17, 10);
  const bill5Time = isoAtLocalOffset(6, 11, 30);

  const bills: Bill[] = [
    {
      id: 'demo_bill_1',
      billNumber: `DEMO-${year}-0001`,
      customerId: 'demo_cust_1',
      customerName: 'રમેશભાઈ પટેલ (Demo)',
      customerPhone: '9800000001',
      subtotal: 820,
      discountType: 'FLAT',
      discountValue: 20,
      discountAmount: 20,
      totalAmount: 800,
      paidAmount: 300,
      balanceAdded: 500,
      paymentMethod: 'UDHAR',
      notes: 'Sample Udhar Bill',
      createdAt: bill1Time,
    },
    {
      id: 'demo_bill_2',
      billNumber: `DEMO-${year}-0002`,
      customerId: 'demo_cust_2',
      customerName: 'મહેશભાઈ શાહ (Demo)',
      customerPhone: '9800000002',
      subtotal: 495,
      discountType: 'FLAT',
      discountValue: 0,
      discountAmount: 0,
      totalAmount: 495,
      paidAmount: 495,
      balanceAdded: 0,
      paymentMethod: 'UPI',
      notes: 'Sample UPI Bill',
      createdAt: bill2Time,
    },
    {
      id: 'demo_bill_3',
      billNumber: `DEMO-${year}-0003`,
      customerId: null,
      customerName: 'રોકડ ગ્રાહક (Sample)',
      customerPhone: '',
      subtotal: 264,
      discountType: 'FLAT',
      discountValue: 0,
      discountAmount: 0,
      totalAmount: 264,
      paidAmount: 264,
      balanceAdded: 0,
      paymentMethod: 'CASH',
      notes: 'Sample Walk-in Cash Bill',
      createdAt: bill3Time,
    },
    {
      id: 'demo_bill_4',
      billNumber: `DEMO-${year}-0004`,
      customerId: 'demo_cust_3',
      customerName: 'ગીતાબેન પ્રજાપતિ (Demo)',
      customerPhone: '9800000003',
      subtotal: 1240,
      discountType: 'FLAT',
      discountValue: 40,
      discountAmount: 40,
      totalAmount: 1200,
      paidAmount: 500,
      balanceAdded: 700,
      paymentMethod: 'UDHAR',
      notes: 'Sample Monthly Grocery',
      createdAt: bill4Time,
    },
    {
      id: 'demo_bill_5',
      billNumber: `DEMO-${year}-0005`,
      customerId: 'demo_cust_4',
      customerName: 'સુરેશભાઈ દેસાઈ (Demo)',
      customerPhone: '9800000004',
      subtotal: 620,
      discountType: 'FLAT',
      discountValue: 0,
      discountAmount: 0,
      totalAmount: 620,
      paidAmount: 620,
      balanceAdded: 0,
      paymentMethod: 'CASH',
      notes: 'Sample Ghee Purchase',
      createdAt: bill5Time,
    },
  ];

  const billItems: BillItem[] = [
    {
      id: 'demo_bi_1',
      billId: 'demo_bill_1',
      productId: 'demo_prd_1',
      name: 'તુવેર દાળ',
      unit: 'kg',
      quantity: 2,
      unitPrice: 155,
      lineTotal: 310,
    },
    {
      id: 'demo_bi_2',
      billId: 'demo_bill_1',
      productId: 'demo_prd_8',
      name: 'સીંગતેલ (૧ લિટર)',
      unit: 'ltr',
      quantity: 2,
      unitPrice: 185,
      lineTotal: 370,
    },
    {
      id: 'demo_bi_3',
      billId: 'demo_bill_1',
      productId: 'demo_prd_5',
      name: 'ખાંડ',
      unit: 'kg',
      quantity: 3,
      unitPrice: 44,
      lineTotal: 132,
    },
    {
      id: 'demo_bi_4',
      billId: 'demo_bill_1',
      productId: 'demo_prd_14',
      name: 'પારલે-જી બિસ્કિટ',
      unit: 'pkt',
      quantity: 1,
      unitPrice: 8,
      lineTotal: 8,
    },
    {
      id: 'demo_bi_5',
      billId: 'demo_bill_2',
      productId: 'demo_prd_3',
      name: 'બાસમતી ચોખા',
      unit: 'kg',
      quantity: 3,
      unitPrice: 110,
      lineTotal: 330,
    },
    {
      id: 'demo_bi_6',
      billId: 'demo_bill_2',
      productId: 'demo_prd_10',
      name: 'ચાની ભૂકી',
      unit: 'pkt',
      quantity: 1,
      unitPrice: 130,
      lineTotal: 130,
    },
    {
      id: 'demo_bi_7',
      billId: 'demo_bill_2',
      productId: 'demo_prd_7',
      name: 'મીઠું (આયોડાઇઝ્ડ)',
      unit: 'pkt',
      quantity: 1,
      unitPrice: 35,
      lineTotal: 35,
    },
    {
      id: 'demo_bi_8',
      billId: 'demo_bill_3',
      productId: 'demo_prd_4',
      name: 'ઘઉંનો લોટ',
      unit: 'kg',
      quantity: 4,
      unitPrice: 42,
      lineTotal: 168,
    },
    {
      id: 'demo_bi_9',
      billId: 'demo_bill_3',
      productId: 'demo_prd_12',
      name: 'નાહવાનો સાબુ',
      unit: 'pcs',
      quantity: 2,
      unitPrice: 36,
      lineTotal: 72,
    },
    {
      id: 'demo_bi_10',
      billId: 'demo_bill_3',
      productId: 'demo_prd_14',
      name: 'પારલે-જી બિસ્કિટ',
      unit: 'pkt',
      quantity: 2,
      unitPrice: 12,
      lineTotal: 24,
    },
    {
      id: 'demo_bi_11',
      billId: 'demo_bill_4',
      productId: 'demo_prd_9',
      name: 'અમૂલ શુદ્ધ ઘી',
      unit: 'ltr',
      quantity: 2,
      unitPrice: 620,
      lineTotal: 1240,
    },
    {
      id: 'demo_bi_12',
      billId: 'demo_bill_5',
      productId: 'demo_prd_9',
      name: 'અમૂલ શુદ્ધ ઘી',
      unit: 'ltr',
      quantity: 1,
      unitPrice: 620,
      lineTotal: 620,
    },
  ];

  const udharTransactions: UdharTransaction[] = [
    {
      id: 'demo_udh_1',
      customerId: 'demo_cust_2',
      customerName: 'મહેશભાઈ શાહ (Demo)',
      customerPhone: '9800000002',
      type: 'CREDIT',
      amount: 950,
      paymentMode: 'BILL',
      billId: null,
      billNumber: null,
      note: 'જૂનો ઉધાર હિસાબ (Sample)',
      createdAt: isoAtLocalOffset(7, 14, 20),
    },
    {
      id: 'demo_udh_2',
      customerId: 'demo_cust_2',
      customerName: 'મહેશભાઈ શાહ (Demo)',
      customerPhone: '9800000002',
      type: 'PAYMENT',
      amount: 500,
      paymentMode: 'UPI',
      billId: null,
      billNumber: null,
      note: 'આંશિક જમા (Sample)',
      createdAt: isoAtLocalOffset(3, 18, 5),
    },
    {
      id: 'demo_udh_3',
      customerId: 'demo_cust_3',
      customerName: 'ગીતાબેન પ્રજાપતિ (Demo)',
      customerPhone: '9800000003',
      type: 'CREDIT',
      amount: 700,
      paymentMode: 'BILL',
      billId: 'demo_bill_4',
      billNumber: `DEMO-${year}-0004`,
      note: `Bill DEMO-${year}-0004 (Paid ₹500)`,
      createdAt: bill4Time,
    },
    {
      id: 'demo_udh_4',
      customerId: 'demo_cust_1',
      customerName: 'રમેશભાઈ પટેલ (Demo)',
      customerPhone: '9800000001',
      type: 'CREDIT',
      amount: 500,
      paymentMode: 'BILL',
      billId: 'demo_bill_1',
      billNumber: `DEMO-${year}-0001`,
      note: `Bill DEMO-${year}-0001 (Paid ₹300)`,
      createdAt: bill1Time,
    },
  ];

  return {
    settings: {
      ...DEFAULT_DEMO_SETTINGS,
      ...(preferredSettings?.language ? { language: preferredSettings.language } : {}),
      ...(preferredSettings?.theme ? { theme: preferredSettings.theme } : {}),
    },
    products,
    customers,
    bills,
    billItems,
    udharTransactions,
  };
}

/**
 * Strictly isolated in-memory repository used only during Demo / Preview mode.
 * Never reads or modifies IndexedDB, localStorage, SQLite, or Firebase Firestore.
 */
export class DemoBillBookRepository implements IBillBookRepository {
  private state: DemoMemoryState = buildInitialDemoState();

  reset(preferredSettings?: Partial<ShopSettings>): void {
    this.state = buildInitialDemoState(preferredSettings);
  }

  async initialize(): Promise<void> {
    // Purely in-memory; no storage initialization required
  }

  async getUserProfile(): Promise<UserShopProfile | null> {
    return null;
  }

  async saveUserProfile(): Promise<UserShopProfile> {
    throw new Error('Demo Mode: Sign in with Google to save your shop profile.');
  }

  async clearUserProfileSession(): Promise<void> {
    // No-op in demo mode
  }

  async getSettings(): Promise<ShopSettings> {
    return { ...this.state.settings };
  }

  async updateSettings(partial: Partial<ShopSettings>): Promise<ShopSettings> {
    this.state.settings = {
      ...this.state.settings,
      ...partial,
      billPrefix: (partial.billPrefix ?? this.state.settings.billPrefix).trim().toUpperCase() || 'DEMO',
    };
    return { ...this.state.settings };
  }

  async listProducts(search?: string): Promise<Product[]> {
    const q = (search || '').trim().toLowerCase();
    const sorted = [...this.state.products].sort((a, b) => a.nameGu.localeCompare(b.nameGu));
    if (!q) return sorted;
    return sorted.filter(
      (p) =>
        p.nameGu.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  async createProduct(input: ProductInput): Promise<Product> {
    const now = new Date().toISOString();
    const product: Product = {
      id: createDemoId('prd'),
      nameGu: input.nameGu.trim() || input.nameEn.trim(),
      nameEn: input.nameEn.trim() || input.nameGu.trim(),
      category: input.category.trim() || 'કિરાણા',
      unit: input.unit,
      price: roundMoney(Math.max(0, Number(input.price))),
      createdAt: now,
      updatedAt: now,
    };
    this.state.products.push(product);
    return product;
  }

  async updateProduct(id: string, input: ProductInput): Promise<Product> {
    const idx = this.state.products.findIndex((p) => p.id === id);
    const now = new Date().toISOString();
    const updated: Product = {
      id,
      nameGu: input.nameGu.trim() || input.nameEn.trim(),
      nameEn: input.nameEn.trim() || input.nameGu.trim(),
      category: input.category.trim() || 'કિરાણા',
      unit: input.unit,
      price: roundMoney(Math.max(0, Number(input.price))),
      createdAt: idx >= 0 ? this.state.products[idx].createdAt : now,
      updatedAt: now,
    };
    if (idx >= 0) {
      this.state.products[idx] = updated;
    } else {
      this.state.products.push(updated);
    }
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    this.state.products = this.state.products.filter((p) => p.id !== id);
  }

  async seedStarterKiranaCatalog(): Promise<number> {
    return 0;
  }

  async listCustomersWithBalance(search?: string): Promise<CustomerWithBalance[]> {
    const result: CustomerWithBalance[] = this.state.customers
      .map((c) => {
        const custBills = this.state.bills.filter((b) => b.customerId === c.id);
        const custUdhar = this.state.udharTransactions.filter((u) => u.customerId === c.id);
        const totalBilled = roundMoney(custBills.reduce((acc, b) => acc + b.totalAmount, 0));
        const totalCreditAdded = roundMoney(
          custUdhar.filter((u) => u.type === 'CREDIT').reduce((acc, u) => acc + u.amount, 0)
        );
        const totalPaid = roundMoney(
          custUdhar.filter((u) => u.type === 'PAYMENT').reduce((acc, u) => acc + u.amount, 0)
        );
        const outstandingBalance = roundMoney(Math.max(0, totalCreditAdded - totalPaid));
        const dates = [
          ...custBills.map((b) => b.createdAt),
          ...custUdhar.map((u) => u.createdAt),
        ].sort();

        return {
          ...c,
          totalBilled,
          totalCreditAdded,
          totalPaid,
          outstandingBalance,
          billCount: custBills.length,
          lastTransactionAt: dates.length > 0 ? dates[dates.length - 1] : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const q = (search || '').trim().toLowerCase();
    if (!q) return result;
    return result.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
    );
  }

  async getCustomerWithBalance(id: string): Promise<CustomerWithBalance | null> {
    const all = await this.listCustomersWithBalance();
    return all.find((c) => c.id === id) ?? null;
  }

  async createCustomer(input: CustomerInput): Promise<Customer> {
    const name = input.name.trim();
    const phone = input.phone.replace(/\D/g, '').slice(-10);
    if (!name) throw new Error('Customer name is required.');
    if (phone.length !== 10) throw new Error('Valid 10-digit mobile number is required.');

    const now = new Date().toISOString();
    const customer: Customer = {
      id: createDemoId('cust'),
      name: name.includes('(Demo)') ? name : `${name} (Demo)`,
      phone,
      address: (input.address || '').trim(),
      createdAt: now,
      updatedAt: now,
    };
    this.state.customers.push(customer);
    return customer;
  }

  async updateCustomer(id: string, input: CustomerInput): Promise<Customer> {
    const name = input.name.trim();
    const phone = input.phone.replace(/\D/g, '').slice(-10);
    if (!name) throw new Error('Customer name is required.');
    if (phone.length !== 10) throw new Error('Valid 10-digit mobile number is required.');

    const now = new Date().toISOString();
    const existing = this.state.customers.find((c) => c.id === id);
    const updated: Customer = {
      id,
      name,
      phone,
      address: (input.address || '').trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.state.customers = this.state.customers.map((c) => (c.id === id ? updated : c));
    this.state.bills = this.state.bills.map((b) =>
      b.customerId === id ? { ...b, customerName: updated.name, customerPhone: updated.phone } : b
    );
    return updated;
  }

  async deleteCustomer(id: string): Promise<void> {
    this.state.bills = this.state.bills.map((b) =>
      b.customerId === id ? { ...b, customerId: null } : b
    );
    this.state.udharTransactions = this.state.udharTransactions.filter((u) => u.customerId !== id);
    this.state.customers = this.state.customers.filter((c) => c.id !== id);
  }

  async getCustomerBills(customerId: string): Promise<BillWithItems[]> {
    return this.state.bills
      .filter((b) => b.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((b) => ({
        ...b,
        items: this.state.billItems.filter((it) => it.billId === b.id),
      }));
  }

  async getCustomerLedger(customerId: string): Promise<LedgerEntry[]> {
    const rows = this.state.udharTransactions
      .filter((u) => u.customerId === customerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    let running = 0;
    const entries: LedgerEntry[] = rows.map((r) => {
      if (r.type === 'CREDIT') {
        running = roundMoney(running + r.amount);
      } else {
        running = roundMoney(Math.max(0, running - r.amount));
      }
      return {
        ...r,
        runningBalance: running,
      };
    });

    return entries.reverse();
  }

  async getNextBillNumber(): Promise<string> {
    const prefix = this.state.settings.billPrefix || 'DEMO';
    const year = new Date().getFullYear();
    const base = `${prefix}-${year}-`;
    let maxNum = 0;
    for (const b of this.state.bills) {
      if (b.billNumber.startsWith(base)) {
        const parsed = parseInt(b.billNumber.slice(base.length), 10);
        if (Number.isFinite(parsed) && parsed > maxNum) maxNum = parsed;
      }
    }
    return `${base}${String(maxNum + 1).padStart(4, '0')}`;
  }

  async createBill(input: CreateBillInput): Promise<BillWithItems> {
    if (!input.items || input.items.length === 0) {
      throw new Error('At least one item is required.');
    }

    const subtotal = roundMoney(
      input.items.reduce((acc, item) => acc + roundMoney(item.quantity * item.unitPrice), 0)
    );
    let discountAmount = 0;
    if (input.discountType === 'PERCENT') {
      const pct = Math.min(100, Math.max(0, input.discountValue));
      discountAmount = roundMoney((subtotal * pct) / 100);
    } else {
      discountAmount = roundMoney(Math.min(subtotal, Math.max(0, input.discountValue)));
    }
    const totalAmount = roundMoney(Math.max(0, subtotal - discountAmount));

    let paidAmount = totalAmount;
    let balanceAdded = 0;
    if (input.paymentMethod === 'UDHAR') {
      if (!input.customerId) {
        throw new Error('Customer is required for Udhar bills.');
      }
      const requestedPaid = roundMoney(Math.max(0, Number(input.paidAmount ?? 0)));
      if (requestedPaid > totalAmount) {
        throw new Error('Paid amount cannot exceed total bill amount.');
      }
      paidAmount = requestedPaid;
      balanceAdded = roundMoney(totalAmount - paidAmount);
    }

    let billNumber = (input.billNumber || '').trim();
    if (!billNumber || this.state.bills.some((b) => b.billNumber === billNumber)) {
      billNumber = await this.getNextBillNumber();
    }

    const now = new Date().toISOString();
    const billId = createDemoId('bill');
    const bill: Bill = {
      id: billId,
      billNumber,
      customerId: input.customerId,
      customerName: input.customerName.trim() || 'Walk-in Customer (Demo)',
      customerPhone: (input.customerPhone || '').trim(),
      subtotal,
      discountType: input.discountType,
      discountValue: roundMoney(input.discountValue),
      discountAmount,
      totalAmount,
      paidAmount,
      balanceAdded,
      paymentMethod: input.paymentMethod,
      notes: (input.notes || '').trim(),
      createdAt: now,
    };

    const items: BillItem[] = input.items.map((it) => ({
      id: createDemoId('bi'),
      billId,
      productId: it.productId,
      name: it.name.trim(),
      unit: it.unit,
      quantity: roundMoney(it.quantity),
      unitPrice: roundMoney(it.unitPrice),
      lineTotal: roundMoney(it.quantity * it.unitPrice),
    }));

    this.state.bills.unshift(bill);
    this.state.billItems.push(...items);

    if (bill.balanceAdded > 0 && bill.customerId) {
      this.state.udharTransactions.unshift({
        id: createDemoId('udh'),
        customerId: bill.customerId,
        customerName: bill.customerName,
        customerPhone: bill.customerPhone,
        type: 'CREDIT',
        amount: bill.balanceAdded,
        paymentMode: 'BILL',
        billId: bill.id,
        billNumber: bill.billNumber,
        note:
          bill.paidAmount > 0
            ? `Demo Bill ${bill.billNumber} (Paid ₹${bill.paidAmount})`
            : `Demo Bill ${bill.billNumber}`,
        createdAt: now,
      });
    }

    return { ...bill, items };
  }

  async listBills(limit = 100): Promise<Bill[]> {
    return [...this.state.bills]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async getBillById(billId: string): Promise<BillWithItems | null> {
    const bill = this.state.bills.find((b) => b.id === billId);
    if (!bill) return null;
    return {
      ...bill,
      items: this.state.billItems.filter((it) => it.billId === bill.id),
    };
  }

  async listUdharTransactions(search?: string): Promise<UdharTransaction[]> {
    const sorted = [...this.state.udharTransactions].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    const q = (search || '').trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (tx) =>
        tx.customerName.toLowerCase().includes(q) ||
        tx.customerPhone.toLowerCase().includes(q) ||
        (tx.billNumber || '').toLowerCase().includes(q) ||
        tx.note.toLowerCase().includes(q)
    );
  }

  async recordUdharPayment(input: {
    customerId: string;
    amount: number;
    paymentMode: Exclude<UdharPaymentMode, 'BILL'>;
    note?: string;
  }): Promise<UdharTransaction> {
    const amt = roundMoney(Number(input.amount));
    if (amt <= 0) throw new Error('Amount must be greater than zero.');
    const customer = await this.getCustomerWithBalance(input.customerId);
    if (!customer) throw new Error('Customer not found.');
    if (amt > customer.outstandingBalance + 0.01) {
      throw new Error('Payment amount exceeds outstanding balance.');
    }

    const tx: UdharTransaction = {
      id: createDemoId('udh'),
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      type: 'PAYMENT',
      amount: amt,
      paymentMode: input.paymentMode,
      billId: null,
      billNumber: null,
      note: (input.note || '').trim(),
      createdAt: new Date().toISOString(),
    };
    this.state.udharTransactions.unshift(tx);
    return tx;
  }

  async recordManualUdharCredit(input: {
    customerId: string;
    amount: number;
    note?: string;
  }): Promise<UdharTransaction> {
    const amt = roundMoney(Number(input.amount));
    if (amt <= 0) throw new Error('Amount must be greater than zero.');
    const customer = await this.getCustomerWithBalance(input.customerId);
    if (!customer) throw new Error('Customer not found.');

    const tx: UdharTransaction = {
      id: createDemoId('udh'),
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      type: 'CREDIT',
      amount: amt,
      paymentMode: 'BILL',
      billId: null,
      billNumber: null,
      note: (input.note || '').trim(),
      createdAt: new Date().toISOString(),
    };
    this.state.udharTransactions.unshift(tx);
    return tx;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const todayKey = getLocalDateKey(new Date());
    const bills = await this.listBills(5000);
    const customers = await this.listCustomersWithBalance();

    let todaySales = 0;
    let todayBills = 0;
    for (const bill of bills) {
      if (getLocalDateKey(new Date(bill.createdAt)) === todayKey) {
        todaySales = roundMoney(todaySales + bill.totalAmount);
        todayBills++;
      }
    }

    const totalOutstandingUdhar = roundMoney(
      customers.reduce((acc, c) => acc + c.outstandingBalance, 0)
    );

    return {
      todaySales,
      todayBills,
      totalOutstandingUdhar,
      totalCustomers: customers.length,
    };
  }

  async getSalesReport(period: ReportPeriod, referenceDate: string): Promise<SalesReport> {
    const bills = await this.listBills(10000);
    const udharTx = await this.listUdharTransactions();
    const customers = await this.listCustomersWithBalance();

    const totalOutstandingUdhar = roundMoney(
      customers.reduce((acc, c) => acc + c.outstandingBalance, 0)
    );

    const targetPrefix =
      period === 'daily'
        ? referenceDate.slice(0, 10)
        : period === 'monthly'
        ? referenceDate.slice(0, 7)
        : referenceDate.slice(0, 4);

    let totalSales = 0;
    let totalBills = 0;
    let cashSales = 0;
    let upiSales = 0;
    let udharSales = 0;
    let paymentsCollected = 0;

    const bucketMap = new Map<string, ReportChartBucket>();

    if (period === 'daily') {
      const slots = ['06-09', '09-12', '12-15', '15-18', '18-21', '21-24'];
      for (const s of slots) {
        bucketMap.set(s, {
          label: s,
          totalSales: 0,
          cashSales: 0,
          upiSales: 0,
          udharSales: 0,
          billCount: 0,
        });
      }
    } else if (period === 'monthly') {
      const [yStr, mStr] = targetPrefix.split('-');
      const year = parseInt(yStr || String(new Date().getFullYear()), 10);
      const month = parseInt(mStr || String(new Date().getMonth() + 1), 10);
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const key = String(d).padStart(2, '0');
        bucketMap.set(key, {
          label: String(d),
          totalSales: 0,
          cashSales: 0,
          upiSales: 0,
          udharSales: 0,
          billCount: 0,
        });
      }
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach((m, idx) => {
        const key = String(idx + 1).padStart(2, '0');
        bucketMap.set(key, {
          label: m,
          totalSales: 0,
          cashSales: 0,
          upiSales: 0,
          udharSales: 0,
          billCount: 0,
        });
      });
    }

    for (const bill of bills) {
      const d = new Date(bill.createdAt);
      const localKey = getLocalDateKey(d);
      const matches =
        period === 'daily'
          ? localKey === targetPrefix
          : period === 'monthly'
          ? localKey.slice(0, 7) === targetPrefix
          : localKey.slice(0, 4) === targetPrefix;

      if (!matches) continue;

      totalSales = roundMoney(totalSales + bill.totalAmount);
      totalBills++;

      const cashPart =
        bill.paymentMethod === 'CASH'
          ? bill.totalAmount
          : bill.paymentMethod === 'UDHAR'
          ? bill.paidAmount
          : 0;
      const upiPart = bill.paymentMethod === 'UPI' ? bill.totalAmount : 0;
      const udharPart = bill.paymentMethod === 'UDHAR' ? bill.balanceAdded : 0;

      cashSales = roundMoney(cashSales + cashPart);
      upiSales = roundMoney(upiSales + upiPart);
      udharSales = roundMoney(udharSales + udharPart);

      let bKey = '';
      if (period === 'daily') {
        const h = d.getHours();
        if (h < 9) bKey = '06-09';
        else if (h < 12) bKey = '09-12';
        else if (h < 15) bKey = '12-15';
        else if (h < 18) bKey = '15-18';
        else if (h < 21) bKey = '18-21';
        else bKey = '21-24';
      } else if (period === 'monthly') {
        bKey = localKey.slice(8, 10);
      } else {
        bKey = localKey.slice(5, 7);
      }

      const bucket = bucketMap.get(bKey);
      if (bucket) {
        bucket.totalSales = roundMoney(bucket.totalSales + bill.totalAmount);
        bucket.cashSales = roundMoney(bucket.cashSales + cashPart);
        bucket.upiSales = roundMoney(bucket.upiSales + upiPart);
        bucket.udharSales = roundMoney(bucket.udharSales + udharPart);
        bucket.billCount++;
      }
    }

    for (const tx of udharTx) {
      if (tx.type !== 'PAYMENT') continue;
      const localKey = getLocalDateKey(new Date(tx.createdAt));
      const matches =
        period === 'daily'
          ? localKey === targetPrefix
          : period === 'monthly'
          ? localKey.slice(0, 7) === targetPrefix
          : localKey.slice(0, 4) === targetPrefix;
      if (matches) {
        paymentsCollected = roundMoney(paymentsCollected + tx.amount);
      }
    }

    return {
      period,
      referenceDate,
      totalSales,
      totalBills,
      cashSales,
      upiSales,
      udharSales,
      totalOutstandingUdhar,
      paymentsCollected,
      buckets: Array.from(bucketMap.values()),
    };
  }

  async exportBackup(): Promise<BackupSnapshot> {
    throw new Error('Demo Mode: Sign in with Google to export business backups.');
  }

  async importBackup(): Promise<void> {
    throw new Error('Demo Mode: Sign in with Google to restore business backups.');
  }

  async exportSqliteBytes(): Promise<Uint8Array> {
    throw new Error('Demo Mode: Sign in with Google to export the SQLite database.');
  }
}

export const demoBillBookRepo = new DemoBillBookRepository();
