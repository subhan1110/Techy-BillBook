import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
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
  DiscountType,
  LedgerEntry,
  PaymentMethod,
  Product,
  ProductInput,
  ReportChartBucket,
  ReportPeriod,
  SalesReport,
  ShopSettings,
  UdharEntryType,
  UdharPaymentMode,
  UdharTransaction,
  UnitType,
} from '../types/models';
import { IBillBookRepository } from './billBookRepository';

const IDB_NAME = 'techy_billbook_sqlite_store';
const IDB_STORE = 'snapshots';
const IDB_KEY = 'primary_db';
const LS_FALLBACK_KEY = 'techy_billbook_sqlite_b64';

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'Shree Ganesh Kirana Store',
  shopNameGu: 'શ્રી ગણેશ કિરાણા સ્ટોર',
  address: 'મેઈન બજાર રોડ, ગુજરાત',
  phone: '',
  upiId: '',
  logoBase64: '',
  billPrefix: 'TB',
  invoiceFooterGu: 'ખરીદી બદલ આભાર! ફરી પધારજો.',
  invoiceFooterEn: 'Thank you for shopping with us! Visit again.',
  showLogoOnInvoice: true,
  language: 'gu',
  theme: 'light',
};

const STARTER_KIRANA_ITEMS: ProductInput[] = [
  { nameGu: 'તુવેર દાળ', nameEn: 'Toor Dal', category: 'દાળ અને કઠોળ', unit: 'kg', price: 155 },
  { nameGu: 'મગ દાળ', nameEn: 'Moong Dal', category: 'દાળ અને કઠોળ', unit: 'kg', price: 120 },
  { nameGu: 'ચણા દાળ', nameEn: 'Chana Dal', category: 'દાળ અને કઠોળ', unit: 'kg', price: 90 },
  { nameGu: 'બાસમતી ચોખા', nameEn: 'Basmati Rice', category: 'અનાજ અને લોટ', unit: 'kg', price: 110 },
  { nameGu: 'ઘઉંનો લોટ', nameEn: 'Wheat Flour (Atta)', category: 'અનાજ અને લોટ', unit: 'kg', price: 42 },
  { nameGu: 'બેસન (ચણાનો લોટ)', nameEn: 'Besan', category: 'અનાજ અને લોટ', unit: 'kg', price: 95 },
  { nameGu: 'ખાંડ', nameEn: 'Sugar', category: 'રોજિંદી વસ્તુ', unit: 'kg', price: 44 },
  { nameGu: 'દેશી ગોળ', nameEn: 'Jaggery (Gol)', category: 'રોજિંદી વસ્તુ', unit: 'kg', price: 65 },
  { nameGu: 'મીઠું (આયોડાઇઝ્ડ)', nameEn: 'Tata Salt', category: 'રોજિંદી વસ્તુ', unit: 'pkt', price: 28 },
  { nameGu: 'સીંગતેલ (૧ લિટર)', nameEn: 'Groundnut Oil', category: 'તેલ અને ઘી', unit: 'ltr', price: 185 },
  { nameGu: 'સનફ્લાવર તેલ', nameEn: 'Sunflower Oil', category: 'તેલ અને ઘી', unit: 'ltr', price: 145 },
  { nameGu: 'અમૂલ શુદ્ધ ઘી', nameEn: 'Amul Ghee', category: 'તેલ અને ઘી', unit: 'ltr', price: 620 },
  { nameGu: 'ચાની ભૂકી', nameEn: 'Tea Powder', category: 'પીણાં અને નાસ્તો', unit: 'pkt', price: 130 },
  { nameGu: 'અમૂલ ગોલ્ડ દૂધ', nameEn: 'Amul Gold Milk', category: 'ડેરી', unit: 'pkt', price: 34 },
  { nameGu: 'હળદર પાવડર', nameEn: 'Turmeric Powder', category: 'મસાલા', unit: 'pkt', price: 45 },
  { nameGu: 'લાલ મરચું પાવડર', nameEn: 'Red Chilli Powder', category: 'મસાલા', unit: 'pkt', price: 65 },
  { nameGu: 'ધાણાજીરું પાવડર', nameEn: 'Coriander Cumin Powder', category: 'મસાલા', unit: 'pkt', price: 50 },
  { nameGu: 'નાહવાનો સાબુ', nameEn: 'Bath Soap', category: 'સાફ-સફાઈ', unit: 'pcs', price: 36 },
  { nameGu: 'કપડાં ધોવાનો પાવડર', nameEn: 'Washing Powder', category: 'સાફ-સફાઈ', unit: 'kg', price: 85 },
  { nameGu: 'પારલે-જી બિસ્કિટ', nameEn: 'Parle-G Biscuit', category: 'પીણાં અને નાસ્તો', unit: 'pkt', price: 10 },
];

async function readIndexedDbBytes(): Promise<Uint8Array | null> {
  if (typeof indexedDB === 'undefined') {
    const b64 = localStorage.getItem(LS_FALLBACK_KEY);
    if (!b64) return null;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const getReq = store.get(IDB_KEY);
        getReq.onsuccess = () => {
          const val = getReq.result;
          if (val instanceof Uint8Array) resolve(val);
          else if (val instanceof ArrayBuffer) resolve(new Uint8Array(val));
          else resolve(null);
        };
        getReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeIndexedDbBytes(bytes: Uint8Array): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    localStorage.setItem(LS_FALLBACK_KEY, btoa(bin));
    return;
  }

  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(bytes, IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export class SqliteBillBookRepository implements IBillBookRepository {
  private SQL: SqlJsStatic | null = null;
  private db: Database | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly wasmLocator: () => string;

  constructor(wasmLocator: () => string = () => '/sql-wasm.wasm') {
    this.wasmLocator = wasmLocator;
  }

  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.SQL = await initSqlJs({
        locateFile: this.wasmLocator,
        useOldExtensionFunctions: false,
      });
      const existingBytes = await readIndexedDbBytes();
      if (existingBytes && existingBytes.length > 0) {
        this.db = new this.SQL.Database(existingBytes);
      } else {
        this.db = new this.SQL.Database();
      }
      this.ensureSchema();
      await this.persist();
    })();

    return this.initPromise;
  }

  private getDb(): Database {
    if (!this.db) {
      throw new Error('SQLite database is not initialized.');
    }
    return this.db;
  }

  private async persist(): Promise<void> {
    const db = this.getDb();
    const bytes = db.export();
    await writeIndexedDbBytes(bytes);
  }

  private ensureSchema(): void {
    const db = this.getDb();
    db.run(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS shop_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        shop_name TEXT NOT NULL,
        shop_name_gu TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        upi_id TEXT NOT NULL,
        logo_base64 TEXT NOT NULL,
        bill_prefix TEXT NOT NULL,
        invoice_footer_gu TEXT NOT NULL,
        invoice_footer_en TEXT NOT NULL,
        show_logo_on_invoice INTEGER NOT NULL DEFAULT 1,
        language TEXT NOT NULL DEFAULT 'gu',
        theme TEXT NOT NULL DEFAULT 'light'
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name_gu TEXT NOT NULL,
        name_en TEXT NOT NULL,
        category TEXT NOT NULL,
        unit TEXT NOT NULL,
        price REAL NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        bill_number TEXT NOT NULL UNIQUE,
        customer_id TEXT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL DEFAULT '',
        subtotal REAL NOT NULL,
        discount_type TEXT NOT NULL,
        discount_value REAL NOT NULL,
        discount_amount REAL NOT NULL,
        total_amount REAL NOT NULL,
        paid_amount REAL NOT NULL,
        balance_added REAL NOT NULL,
        payment_method TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bill_items (
        id TEXT PRIMARY KEY,
        bill_id TEXT NOT NULL,
        product_id TEXT,
        name TEXT NOT NULL,
        unit TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        line_total REAL NOT NULL,
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS udhar_transactions (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_mode TEXT NOT NULL,
        bill_id TEXT,
        bill_number TEXT,
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);
      CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON bills(customer_id);
      CREATE INDEX IF NOT EXISTS idx_udhar_customer_id ON udhar_transactions(customer_id);
      CREATE INDEX IF NOT EXISTS idx_udhar_created_at ON udhar_transactions(created_at);
    `);

    const countRes = db.exec('SELECT COUNT(*) FROM shop_settings WHERE id = 1');
    const count = Number(countRes[0]?.values[0]?.[0] ?? 0);
    if (count === 0) {
      db.run(
        `INSERT INTO shop_settings (
          id, shop_name, shop_name_gu, address, phone, upi_id, logo_base64,
          bill_prefix, invoice_footer_gu, invoice_footer_en, show_logo_on_invoice, language, theme
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          DEFAULT_SETTINGS.shopName,
          DEFAULT_SETTINGS.shopNameGu,
          DEFAULT_SETTINGS.address,
          DEFAULT_SETTINGS.phone,
          DEFAULT_SETTINGS.upiId,
          DEFAULT_SETTINGS.logoBase64,
          DEFAULT_SETTINGS.billPrefix,
          DEFAULT_SETTINGS.invoiceFooterGu,
          DEFAULT_SETTINGS.invoiceFooterEn,
          DEFAULT_SETTINGS.showLogoOnInvoice ? 1 : 0,
          DEFAULT_SETTINGS.language,
          DEFAULT_SETTINGS.theme,
        ]
      );
    }
  }

  private queryRows<T>(sql: string, params: (string | number | null)[] = []): T[] {
    const db = this.getDb();
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return rows;
  }

  async getSettings(): Promise<ShopSettings> {
    await this.initialize();
    const rows = this.queryRows<{
      shop_name: string;
      shop_name_gu: string;
      address: string;
      phone: string;
      upi_id: string;
      logo_base64: string;
      bill_prefix: string;
      invoice_footer_gu: string;
      invoice_footer_en: string;
      show_logo_on_invoice: number;
      language: string;
      theme: string;
    }>('SELECT * FROM shop_settings WHERE id = 1');

    if (rows.length === 0) return { ...DEFAULT_SETTINGS };
    const r = rows[0];
    return {
      shopName: r.shop_name,
      shopNameGu: r.shop_name_gu,
      address: r.address,
      phone: r.phone,
      upiId: r.upi_id,
      logoBase64: r.logo_base64,
      billPrefix: r.bill_prefix || 'TB',
      invoiceFooterGu: r.invoice_footer_gu,
      invoiceFooterEn: r.invoice_footer_en,
      showLogoOnInvoice: Boolean(r.show_logo_on_invoice),
      language: r.language === 'en' ? 'en' : 'gu',
      theme: r.theme === 'dark' ? 'dark' : 'light',
    };
  }

  async updateSettings(partial: Partial<ShopSettings>): Promise<ShopSettings> {
    await this.initialize();
    const current = await this.getSettings();
    const next: ShopSettings = {
      ...current,
      ...partial,
      billPrefix: (partial.billPrefix ?? current.billPrefix).trim().toUpperCase() || 'TB',
    };

    const db = this.getDb();
    db.run(
      `UPDATE shop_settings SET
        shop_name = ?,
        shop_name_gu = ?,
        address = ?,
        phone = ?,
        upi_id = ?,
        logo_base64 = ?,
        bill_prefix = ?,
        invoice_footer_gu = ?,
        invoice_footer_en = ?,
        show_logo_on_invoice = ?,
        language = ?,
        theme = ?
      WHERE id = 1`,
      [
        next.shopName,
        next.shopNameGu,
        next.address,
        next.phone,
        next.upiId,
        next.logoBase64,
        next.billPrefix,
        next.invoiceFooterGu,
        next.invoiceFooterEn,
        next.showLogoOnInvoice ? 1 : 0,
        next.language,
        next.theme,
      ]
    );
    await this.persist();
    return next;
  }

  async listProducts(search?: string): Promise<Product[]> {
    await this.initialize();
    const q = (search || '').trim().toLowerCase();
    const rows = this.queryRows<{
      id: string;
      name_gu: string;
      name_en: string;
      category: string;
      unit: string;
      price: number;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM products ORDER BY name_gu ASC, name_en ASC');

    const mapped: Product[] = rows.map((r) => ({
      id: r.id,
      nameGu: r.name_gu,
      nameEn: r.name_en,
      category: r.category,
      unit: r.unit as UnitType,
      price: Number(r.price),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    if (!q) return mapped;
    return mapped.filter(
      (p) =>
        p.nameGu.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  async createProduct(input: ProductInput): Promise<Product> {
    await this.initialize();
    const now = new Date().toISOString();
    const product: Product = {
      id: createId('prd'),
      nameGu: input.nameGu.trim() || input.nameEn.trim(),
      nameEn: input.nameEn.trim() || input.nameGu.trim(),
      category: input.category.trim() || 'કિરાણા',
      unit: input.unit,
      price: roundMoney(Math.max(0, Number(input.price))),
      createdAt: now,
      updatedAt: now,
    };

    const db = this.getDb();
    db.run(
      `INSERT INTO products (id, name_gu, name_en, category, unit, price, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.id,
        product.nameGu,
        product.nameEn,
        product.category,
        product.unit,
        product.price,
        product.createdAt,
        product.updatedAt,
      ]
    );
    await this.persist();
    return product;
  }

  async updateProduct(id: string, input: ProductInput): Promise<Product> {
    await this.initialize();
    const now = new Date().toISOString();
    const db = this.getDb();
    const existing = this.queryRows<{ created_at: string }>('SELECT created_at FROM products WHERE id = ?', [id]);
    const createdAt = existing[0]?.created_at ?? now;
    const updated: Product = {
      id,
      nameGu: input.nameGu.trim() || input.nameEn.trim(),
      nameEn: input.nameEn.trim() || input.nameGu.trim(),
      category: input.category.trim() || 'કિરાણા',
      unit: input.unit,
      price: roundMoney(Math.max(0, Number(input.price))),
      createdAt,
      updatedAt: now,
    };

    db.run(
      `UPDATE products SET name_gu = ?, name_en = ?, category = ?, unit = ?, price = ?, updated_at = ?
       WHERE id = ?`,
      [updated.nameGu, updated.nameEn, updated.category, updated.unit, updated.price, updated.updatedAt, id]
    );
    await this.persist();
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.initialize();
    const db = this.getDb();
    db.run('DELETE FROM products WHERE id = ?', [id]);
    await this.persist();
  }

  async seedStarterKiranaCatalog(): Promise<number> {
    await this.initialize();
    const existing = await this.listProducts();
    const existingNames = new Set(existing.map((p) => p.nameEn.toLowerCase()));
    const db = this.getDb();
    let added = 0;
    const now = new Date().toISOString();

    db.run('BEGIN TRANSACTION');
    try {
      for (const item of STARTER_KIRANA_ITEMS) {
        if (!existingNames.has(item.nameEn.toLowerCase())) {
          db.run(
            `INSERT INTO products (id, name_gu, name_en, category, unit, price, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [createId('prd'), item.nameGu, item.nameEn, item.category, item.unit, item.price, now, now]
          );
          added++;
        }
      }
      db.run('COMMIT');
    } catch (err) {
      db.run('ROLLBACK');
      throw err;
    }

    await this.persist();
    return added;
  }

  async listCustomersWithBalance(search?: string): Promise<CustomerWithBalance[]> {
    await this.initialize();
    const customers = this.queryRows<{
      id: string;
      name: string;
      phone: string;
      address: string;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM customers ORDER BY name COLLATE NOCASE ASC');

    const billAgg = this.queryRows<{
      customer_id: string;
      total_billed: number;
      bill_count: number;
      last_bill_at: string | null;
    }>(`
      SELECT customer_id,
             COALESCE(SUM(total_amount), 0) as total_billed,
             COUNT(*) as bill_count,
             MAX(created_at) as last_bill_at
      FROM bills
      WHERE customer_id IS NOT NULL
      GROUP BY customer_id
    `);

    const udharAgg = this.queryRows<{
      customer_id: string;
      total_credit: number;
      total_paid: number;
      last_tx_at: string | null;
    }>(`
      SELECT customer_id,
             COALESCE(SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END), 0) as total_credit,
             COALESCE(SUM(CASE WHEN type = 'PAYMENT' THEN amount ELSE 0 END), 0) as total_paid,
             MAX(created_at) as last_tx_at
      FROM udhar_transactions
      GROUP BY customer_id
    `);

    const billMap = new Map(billAgg.map((b) => [b.customer_id, b]));
    const udharMap = new Map(udharAgg.map((u) => [u.customer_id, u]));

    const result: CustomerWithBalance[] = customers.map((c) => {
      const b = billMap.get(c.id);
      const u = udharMap.get(c.id);
      const totalCreditAdded = roundMoney(Number(u?.total_credit ?? 0));
      const totalPaid = roundMoney(Number(u?.total_paid ?? 0));
      const outstandingBalance = roundMoney(Math.max(0, totalCreditAdded - totalPaid));

      const dates = [b?.last_bill_at, u?.last_tx_at].filter(Boolean) as string[];
      dates.sort();

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        totalBilled: roundMoney(Number(b?.total_billed ?? 0)),
        totalCreditAdded,
        totalPaid,
        outstandingBalance,
        billCount: Number(b?.bill_count ?? 0),
        lastTransactionAt: dates.length > 0 ? dates[dates.length - 1] : null,
      };
    });

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
    await this.initialize();
    const name = input.name.trim();
    const phone = input.phone.replace(/\D/g, '').slice(-10);
    if (!name) throw new Error('Customer name is required.');
    if (phone.length !== 10) throw new Error('Valid 10-digit mobile number is required.');

    const now = new Date().toISOString();
    const customer: Customer = {
      id: createId('cust'),
      name,
      phone,
      address: (input.address || '').trim(),
      createdAt: now,
      updatedAt: now,
    };

    const db = this.getDb();
    db.run(
      `INSERT INTO customers (id, name, phone, address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customer.id, customer.name, customer.phone, customer.address, customer.createdAt, customer.updatedAt]
    );
    await this.persist();
    return customer;
  }

  async updateCustomer(id: string, input: CustomerInput): Promise<Customer> {
    await this.initialize();
    const name = input.name.trim();
    const phone = input.phone.replace(/\D/g, '').slice(-10);
    if (!name) throw new Error('Customer name is required.');
    if (phone.length !== 10) throw new Error('Valid 10-digit mobile number is required.');

    const now = new Date().toISOString();
    const existing = this.queryRows<{ created_at: string }>('SELECT created_at FROM customers WHERE id = ?', [id]);
    const createdAt = existing[0]?.created_at ?? now;
    const updated: Customer = {
      id,
      name,
      phone,
      address: (input.address || '').trim(),
      createdAt,
      updatedAt: now,
    };

    const db = this.getDb();
    db.run(
      `UPDATE customers SET name = ?, phone = ?, address = ?, updated_at = ? WHERE id = ?`,
      [updated.name, updated.phone, updated.address, updated.updatedAt, id]
    );
    // Keep historical bill snapshots consistent if customer name/phone updated
    db.run(
      `UPDATE bills SET customer_name = ?, customer_phone = ? WHERE customer_id = ?`,
      [updated.name, updated.phone, id]
    );
    await this.persist();
    return updated;
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.initialize();
    const db = this.getDb();
    db.run('BEGIN TRANSACTION');
    try {
      db.run('UPDATE bills SET customer_id = NULL WHERE customer_id = ?', [id]);
      db.run('DELETE FROM udhar_transactions WHERE customer_id = ?', [id]);
      db.run('DELETE FROM customers WHERE id = ?', [id]);
      db.run('COMMIT');
    } catch (err) {
      db.run('ROLLBACK');
      throw err;
    }
    await this.persist();
  }

  async getCustomerBills(customerId: string): Promise<BillWithItems[]> {
    await this.initialize();
    const bills = this.queryRows<{
      id: string;
      bill_number: string;
      customer_id: string | null;
      customer_name: string;
      customer_phone: string;
      subtotal: number;
      discount_type: string;
      discount_value: number;
      discount_amount: number;
      total_amount: number;
      paid_amount: number;
      balance_added: number;
      payment_method: string;
      notes: string;
      created_at: string;
    }>('SELECT * FROM bills WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);

    const result: BillWithItems[] = [];
    for (const b of bills) {
      const items = this.getBillItemsSync(b.id);
      result.push({
        id: b.id,
        billNumber: b.bill_number,
        customerId: b.customer_id,
        customerName: b.customer_name,
        customerPhone: b.customer_phone,
        subtotal: Number(b.subtotal),
        discountType: b.discount_type as DiscountType,
        discountValue: Number(b.discount_value),
        discountAmount: Number(b.discount_amount),
        totalAmount: Number(b.total_amount),
        paidAmount: Number(b.paid_amount),
        balanceAdded: Number(b.balance_added),
        paymentMethod: b.payment_method as PaymentMethod,
        notes: b.notes,
        createdAt: b.created_at,
        items,
      });
    }
    return result;
  }

  async getCustomerLedger(customerId: string): Promise<LedgerEntry[]> {
    await this.initialize();
    const rows = this.queryRows<{
      id: string;
      customer_id: string;
      type: string;
      amount: number;
      payment_mode: string;
      bill_id: string | null;
      bill_number: string | null;
      note: string;
      created_at: string;
      cust_name: string;
      cust_phone: string;
    }>(
      `SELECT u.*, c.name as cust_name, c.phone as cust_phone
       FROM udhar_transactions u
       JOIN customers c ON c.id = u.customer_id
       WHERE u.customer_id = ?
       ORDER BY u.created_at ASC, u.id ASC`,
      [customerId]
    );

    let running = 0;
    const entries: LedgerEntry[] = rows.map((r) => {
      const amt = roundMoney(Number(r.amount));
      if (r.type === 'CREDIT') {
        running = roundMoney(running + amt);
      } else {
        running = roundMoney(Math.max(0, running - amt));
      }
      return {
        id: r.id,
        customerId: r.customer_id,
        customerName: r.cust_name,
        customerPhone: r.cust_phone,
        type: r.type as UdharEntryType,
        amount: amt,
        paymentMode: r.payment_mode as UdharPaymentMode,
        billId: r.bill_id,
        billNumber: r.bill_number,
        note: r.note,
        createdAt: r.created_at,
        runningBalance: running,
      };
    });

    return entries.reverse();
  }

  async getNextBillNumber(): Promise<string> {
    await this.initialize();
    const settings = await this.getSettings();
    const prefix = settings.billPrefix || 'TB';
    const year = new Date().getFullYear();
    const base = `${prefix}-${year}-`;

    const existing = this.queryRows<{ bill_number: string }>(
      'SELECT bill_number FROM bills WHERE bill_number LIKE ?',
      [`${base}%`]
    );

    let maxNum = 0;
    for (const row of existing) {
      const suffix = row.bill_number.slice(base.length);
      const parsed = parseInt(suffix, 10);
      if (Number.isFinite(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }

    let candidateNum = maxNum + 1;
    let candidate = `${base}${String(candidateNum).padStart(4, '0')}`;
    while (this.billNumberExistsSync(candidate)) {
      candidateNum++;
      candidate = `${base}${String(candidateNum).padStart(4, '0')}`;
    }
    return candidate;
  }

  private billNumberExistsSync(billNumber: string): boolean {
    const res = this.queryRows<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM bills WHERE bill_number = ?',
      [billNumber]
    );
    return Number(res[0]?.cnt ?? 0) > 0;
  }

  private getBillItemsSync(billId: string): BillItem[] {
    const rows = this.queryRows<{
      id: string;
      bill_id: string;
      product_id: string | null;
      name: string;
      unit: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }>('SELECT * FROM bill_items WHERE bill_id = ?', [billId]);

    return rows.map((r) => ({
      id: r.id,
      billId: r.bill_id,
      productId: r.product_id,
      name: r.name,
      unit: r.unit as UnitType,
      quantity: Number(r.quantity),
      unitPrice: Number(r.unit_price),
      lineTotal: Number(r.line_total),
    }));
  }

  async createBill(input: CreateBillInput): Promise<BillWithItems> {
    await this.initialize();
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
    if (!billNumber || this.billNumberExistsSync(billNumber)) {
      billNumber = await this.getNextBillNumber();
    }

    const now = new Date().toISOString();
    const billId = createId('bill');

    const bill: Bill = {
      id: billId,
      billNumber,
      customerId: input.customerId,
      customerName: input.customerName.trim() || 'Walk-in Customer',
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

    const billItems: BillItem[] = input.items.map((it) => ({
      id: createId('bi'),
      billId,
      productId: it.productId,
      name: it.name.trim(),
      unit: it.unit,
      quantity: roundMoney(it.quantity),
      unitPrice: roundMoney(it.unitPrice),
      lineTotal: roundMoney(it.quantity * it.unitPrice),
    }));

    const db = this.getDb();
    db.run('BEGIN TRANSACTION');
    try {
      db.run(
        `INSERT INTO bills (
          id, bill_number, customer_id, customer_name, customer_phone,
          subtotal, discount_type, discount_value, discount_amount,
          total_amount, paid_amount, balance_added, payment_method, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bill.id,
          bill.billNumber,
          bill.customerId,
          bill.customerName,
          bill.customerPhone,
          bill.subtotal,
          bill.discountType,
          bill.discountValue,
          bill.discountAmount,
          bill.totalAmount,
          bill.paidAmount,
          bill.balanceAdded,
          bill.paymentMethod,
          bill.notes,
          bill.createdAt,
        ]
      );

      for (const item of billItems) {
        db.run(
          `INSERT INTO bill_items (id, bill_id, product_id, name, unit, quantity, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.billId,
            item.productId,
            item.name,
            item.unit,
            item.quantity,
            item.unitPrice,
            item.lineTotal,
          ]
        );
      }

      if (bill.balanceAdded > 0 && bill.customerId) {
        db.run(
          `INSERT INTO udhar_transactions (id, customer_id, type, amount, payment_mode, bill_id, bill_number, note, created_at)
           VALUES (?, ?, 'CREDIT', ?, 'BILL', ?, ?, ?, ?)`,
          [
            createId('udh'),
            bill.customerId,
            bill.balanceAdded,
            bill.id,
            bill.billNumber,
            bill.paidAmount > 0
              ? `Bill ${bill.billNumber} (Paid ₹${bill.paidAmount})`
              : `Bill ${bill.billNumber}`,
            bill.createdAt,
          ]
        );
      }

      db.run('COMMIT');
    } catch (err) {
      db.run('ROLLBACK');
      throw err;
    }

    await this.persist();
    return { ...bill, items: billItems };
  }

  async listBills(limit = 100): Promise<Bill[]> {
    await this.initialize();
    const rows = this.queryRows<{
      id: string;
      bill_number: string;
      customer_id: string | null;
      customer_name: string;
      customer_phone: string;
      subtotal: number;
      discount_type: string;
      discount_value: number;
      discount_amount: number;
      total_amount: number;
      paid_amount: number;
      balance_added: number;
      payment_method: string;
      notes: string;
      created_at: string;
    }>('SELECT * FROM bills ORDER BY created_at DESC LIMIT ?', [limit]);

    return rows.map((b) => ({
      id: b.id,
      billNumber: b.bill_number,
      customerId: b.customer_id,
      customerName: b.customer_name,
      customerPhone: b.customer_phone,
      subtotal: Number(b.subtotal),
      discountType: b.discount_type as DiscountType,
      discountValue: Number(b.discount_value),
      discountAmount: Number(b.discount_amount),
      totalAmount: Number(b.total_amount),
      paidAmount: Number(b.paid_amount),
      balanceAdded: Number(b.balance_added),
      paymentMethod: b.payment_method as PaymentMethod,
      notes: b.notes,
      createdAt: b.created_at,
    }));
  }

  async getBillById(billId: string): Promise<BillWithItems | null> {
    await this.initialize();
    const rows = this.queryRows<{
      id: string;
      bill_number: string;
      customer_id: string | null;
      customer_name: string;
      customer_phone: string;
      subtotal: number;
      discount_type: string;
      discount_value: number;
      discount_amount: number;
      total_amount: number;
      paid_amount: number;
      balance_added: number;
      payment_method: string;
      notes: string;
      created_at: string;
    }>('SELECT * FROM bills WHERE id = ?', [billId]);

    if (rows.length === 0) return null;
    const b = rows[0];
    return {
      id: b.id,
      billNumber: b.bill_number,
      customerId: b.customer_id,
      customerName: b.customer_name,
      customerPhone: b.customer_phone,
      subtotal: Number(b.subtotal),
      discountType: b.discount_type as DiscountType,
      discountValue: Number(b.discount_value),
      discountAmount: Number(b.discount_amount),
      totalAmount: Number(b.total_amount),
      paidAmount: Number(b.paid_amount),
      balanceAdded: Number(b.balance_added),
      paymentMethod: b.payment_method as PaymentMethod,
      notes: b.notes,
      createdAt: b.created_at,
      items: this.getBillItemsSync(b.id),
    };
  }

  async listUdharTransactions(search?: string): Promise<UdharTransaction[]> {
    await this.initialize();
    const rows = this.queryRows<{
      id: string;
      customer_id: string;
      type: string;
      amount: number;
      payment_mode: string;
      bill_id: string | null;
      bill_number: string | null;
      note: string;
      created_at: string;
      cust_name: string;
      cust_phone: string;
    }>(`
      SELECT u.*, c.name as cust_name, c.phone as cust_phone
      FROM udhar_transactions u
      JOIN customers c ON c.id = u.customer_id
      ORDER BY u.created_at DESC
    `);

    const mapped: UdharTransaction[] = rows.map((r) => ({
      id: r.id,
      customerId: r.customer_id,
      customerName: r.cust_name,
      customerPhone: r.cust_phone,
      type: r.type as UdharEntryType,
      amount: roundMoney(Number(r.amount)),
      paymentMode: r.payment_mode as UdharPaymentMode,
      billId: r.bill_id,
      billNumber: r.bill_number,
      note: r.note,
      createdAt: r.created_at,
    }));

    const q = (search || '').trim().toLowerCase();
    if (!q) return mapped;
    return mapped.filter(
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
    await this.initialize();
    const amt = roundMoney(Number(input.amount));
    if (amt <= 0) throw new Error('Amount must be greater than zero.');

    const customer = await this.getCustomerWithBalance(input.customerId);
    if (!customer) throw new Error('Customer not found.');
    if (amt > customer.outstandingBalance + 0.01) {
      throw new Error('Payment amount exceeds outstanding balance.');
    }

    const now = new Date().toISOString();
    const id = createId('udh');
    const note = (input.note || '').trim();

    const db = this.getDb();
    db.run(
      `INSERT INTO udhar_transactions (id, customer_id, type, amount, payment_mode, bill_id, bill_number, note, created_at)
       VALUES (?, ?, 'PAYMENT', ?, ?, NULL, NULL, ?, ?)`,
      [id, input.customerId, amt, input.paymentMode, note, now]
    );
    await this.persist();

    return {
      id,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      type: 'PAYMENT',
      amount: amt,
      paymentMode: input.paymentMode,
      billId: null,
      billNumber: null,
      note,
      createdAt: now,
    };
  }

  async recordManualUdharCredit(input: {
    customerId: string;
    amount: number;
    note?: string;
  }): Promise<UdharTransaction> {
    await this.initialize();
    const amt = roundMoney(Number(input.amount));
    if (amt <= 0) throw new Error('Amount must be greater than zero.');

    const customer = await this.getCustomerWithBalance(input.customerId);
    if (!customer) throw new Error('Customer not found.');

    const now = new Date().toISOString();
    const id = createId('udh');
    const note = (input.note || '').trim();

    const db = this.getDb();
    db.run(
      `INSERT INTO udhar_transactions (id, customer_id, type, amount, payment_mode, bill_id, bill_number, note, created_at)
       VALUES (?, ?, 'CREDIT', ?, 'BILL', NULL, NULL, ?, ?)`,
      [id, input.customerId, amt, note, now]
    );
    await this.persist();

    return {
      id,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      type: 'CREDIT',
      amount: amt,
      paymentMode: 'BILL',
      billId: null,
      billNumber: null,
      note,
      createdAt: now,
    };
  }

  async getDashboardStats(): Promise<DashboardStats> {
    await this.initialize();
    const todayKey = getLocalDateKey(new Date());
    const bills = await this.listBills(5000);
    const customers = await this.listCustomersWithBalance();

    let todaySales = 0;
    let todayBills = 0;

    for (const bill of bills) {
      const billDateKey = getLocalDateKey(new Date(bill.createdAt));
      if (billDateKey === todayKey) {
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
    await this.initialize();
    const bills = await this.listBills(10000);
    const udharTx = await this.listUdharTransactions();
    const customers = await this.listCustomersWithBalance();

    const totalOutstandingUdhar = roundMoney(
      customers.reduce((acc, c) => acc + c.outstandingBalance, 0)
    );

    // referenceDate format:
    // daily -> YYYY-MM-DD
    // monthly -> YYYY-MM
    // yearly -> YYYY
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
      // 4-hour blocks for cleaner chart visualization
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

      const cashPart = bill.paymentMethod === 'CASH' ? bill.totalAmount : bill.paymentMethod === 'UDHAR' ? bill.paidAmount : 0;
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
    await this.initialize();
    const settings = await this.getSettings();
    const products = await this.listProducts();
    const customerRows = this.queryRows<{
      id: string;
      name: string;
      phone: string;
      address: string;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM customers');
    const bills = await this.listBills(100000);
    const billItemRows = this.queryRows<{
      id: string;
      bill_id: string;
      product_id: string | null;
      name: string;
      unit: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }>('SELECT * FROM bill_items');
    const udharTransactions = await this.listUdharTransactions();

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      products,
      customers: customerRows.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
      bills,
      billItems: billItemRows.map((i) => ({
        id: i.id,
        billId: i.bill_id,
        productId: i.product_id,
        name: i.name,
        unit: i.unit as UnitType,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unit_price),
        lineTotal: Number(i.line_total),
      })),
      udharTransactions,
    };
  }

  async importBackup(snapshot: BackupSnapshot): Promise<void> {
    await this.initialize();
    if (!snapshot || typeof snapshot !== 'object' || !Array.isArray(snapshot.bills)) {
      throw new Error('Invalid backup snapshot');
    }

    const db = this.getDb();
    db.run('BEGIN TRANSACTION');
    try {
      db.run('DELETE FROM udhar_transactions');
      db.run('DELETE FROM bill_items');
      db.run('DELETE FROM bills');
      db.run('DELETE FROM customers');
      db.run('DELETE FROM products');

      for (const p of snapshot.products || []) {
        db.run(
          `INSERT INTO products (id, name_gu, name_en, category, unit, price, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.id, p.nameGu, p.nameEn, p.category, p.unit, p.price, p.createdAt, p.updatedAt]
        );
      }

      for (const c of snapshot.customers || []) {
        db.run(
          `INSERT INTO customers (id, name, phone, address, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [c.id, c.name, c.phone, c.address || '', c.createdAt, c.updatedAt]
        );
      }

      for (const b of snapshot.bills || []) {
        db.run(
          `INSERT INTO bills (
            id, bill_number, customer_id, customer_name, customer_phone,
            subtotal, discount_type, discount_value, discount_amount,
            total_amount, paid_amount, balance_added, payment_method, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            b.id,
            b.billNumber,
            b.customerId,
            b.customerName,
            b.customerPhone || '',
            b.subtotal,
            b.discountType,
            b.discountValue,
            b.discountAmount,
            b.totalAmount,
            b.paidAmount,
            b.balanceAdded,
            b.paymentMethod,
            b.notes || '',
            b.createdAt,
          ]
        );
      }

      for (const it of snapshot.billItems || []) {
        db.run(
          `INSERT INTO bill_items (id, bill_id, product_id, name, unit, quantity, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [it.id, it.billId, it.productId, it.name, it.unit, it.quantity, it.unitPrice, it.lineTotal]
        );
      }

      for (const u of snapshot.udharTransactions || []) {
        db.run(
          `INSERT INTO udhar_transactions (id, customer_id, type, amount, payment_mode, bill_id, bill_number, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [u.id, u.customerId, u.type, u.amount, u.paymentMode, u.billId, u.billNumber, u.note || '', u.createdAt]
        );
      }

      db.run('COMMIT');
    } catch (err) {
      db.run('ROLLBACK');
      throw err;
    }

    if (snapshot.settings) {
      await this.updateSettings(snapshot.settings);
    } else {
      await this.persist();
    }
  }

  async exportSqliteBytes(): Promise<Uint8Array> {
    await this.initialize();
    return this.getDb().export();
  }
}

export const billBookRepo: IBillBookRepository = new SqliteBillBookRepository();
