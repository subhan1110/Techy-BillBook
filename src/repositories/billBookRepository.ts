import {
  BackupSnapshot,
  Bill,
  BillWithItems,
  CreateBillInput,
  Customer,
  CustomerInput,
  CustomerWithBalance,
  DashboardStats,
  LedgerEntry,
  Product,
  ProductInput,
  ReportPeriod,
  SalesReport,
  ShopSettings,
  UdharPaymentMode,
  UdharTransaction,
  UserShopProfile,
} from '../types/models';

export interface IBillBookRepository {
  initialize(): Promise<void>;

  // User Profile & Onboarding Session
  getUserProfile(): Promise<UserShopProfile | null>;
  saveUserProfile(profile: UserShopProfile): Promise<UserShopProfile>;
  clearUserProfileSession(): Promise<void>;

  // Settings
  getSettings(): Promise<ShopSettings>;
  updateSettings(settings: Partial<ShopSettings>): Promise<ShopSettings>;

  // Products
  listProducts(search?: string): Promise<Product[]>;
  createProduct(input: ProductInput): Promise<Product>;
  updateProduct(id: string, input: ProductInput): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  seedStarterKiranaCatalog(): Promise<number>;

  // Customers & Ledger
  listCustomersWithBalance(search?: string): Promise<CustomerWithBalance[]>;
  getCustomerWithBalance(id: string): Promise<CustomerWithBalance | null>;
  createCustomer(input: CustomerInput): Promise<Customer>;
  updateCustomer(id: string, input: CustomerInput): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
  getCustomerBills(customerId: string): Promise<BillWithItems[]>;
  getCustomerLedger(customerId: string): Promise<LedgerEntry[]>;

  // Billing
  getNextBillNumber(): Promise<string>;
  createBill(input: CreateBillInput): Promise<BillWithItems>;
  listBills(limit?: number): Promise<Bill[]>;
  getBillById(billId: string): Promise<BillWithItems | null>;

  // Udhar Khata
  listUdharTransactions(search?: string): Promise<UdharTransaction[]>;
  recordUdharPayment(input: {
    customerId: string;
    amount: number;
    paymentMode: Exclude<UdharPaymentMode, 'BILL'>;
    note?: string;
  }): Promise<UdharTransaction>;
  recordManualUdharCredit(input: {
    customerId: string;
    amount: number;
    note?: string;
  }): Promise<UdharTransaction>;

  // Dashboard & Reports
  getDashboardStats(): Promise<DashboardStats>;
  getSalesReport(period: ReportPeriod, referenceDate: string): Promise<SalesReport>;

  // Backup & Export
  exportBackup(): Promise<BackupSnapshot>;
  importBackup(snapshot: BackupSnapshot): Promise<void>;
  exportSqliteBytes(): Promise<Uint8Array>;
}
