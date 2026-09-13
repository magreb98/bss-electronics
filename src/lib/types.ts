// ─── Types frontend (interface utilisateur) ───────────────────────────────────
// Ces types représentent la forme des données telle que le frontend les manipule.
// Les adapters dans lib/adapters.ts transforment les réponses backend vers ces types.

export interface Paginated<T> {
  data: T[];
  meta: { total: number; current_page: number; per_page: number; last_page: number };
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: "vendeur" | "gerant" | "proprietaire";
  last_connected_at?: string | null;
  must_change_password?: boolean;
}

export interface Family {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;       // backend: label
  sku: string;        // backend: reference
  family: string;     // backend: family.name
  family_id: string;
  price: number;      // backend: selling_price
  stock: number;      // toujours 0 depuis /commerce/products; réel depuis /commerce/stock
  min_stock: number;  // toujours 0 depuis /commerce/products; réel depuis StockLevel
  has_serial: boolean; // backend: granularity === 'serial'
  image_url?: string;
  images?: Array<{ id: string; url: string; position: number }>;
  granularity?: "quantity" | "variant" | "serial" | "batch" | "service";
  vat_rate?: number;
  active?: boolean;
}

export interface BackendProductVariant {
  id: string;
  product_id: string;
  label: string;
  reference: string;
  active: boolean;
}

export interface SerialUnit {
  id: string;
  product_id: string;
  product_name: string;
  imei: string;
  status: "disponible" | "vendu" | "hs" | "reserve";
  entered_at: string;
  sale_id?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  credit: number;       // backend: outstanding_balance
  total_spent: number;
  sales_count: number;
}

export interface CartLine {
  key: string;
  product: Product;
  qty: number;
  discount: number;
  serial?: SerialUnit | undefined;
}

export interface Sale {
  id: string;
  reference: string;
  customer?: string;
  total: number;
  status: "confirmee" | "annulee" | "en_cours";
  created_at: string;
  seller: string;
  items: number;
}

export interface PaymentMethod {
  id: string;
  key: string;
  label: string;
}

export interface CashRegisterFull {
  id: string;
  name: string;
  point_of_sale_id: string;
  active: boolean;
}

export interface PointOfSaleFull {
  id: string;
  name: string;
  active: boolean;
  cash_registers: CashRegisterFull[];
}

export interface CashRegister {
  id: string;
  name: string;
  point_of_sale: string;
}

export interface CashSession {
  id: string;
  cash_register_id: string;  // backend field (uuid)
  cash_register: string;     // nom affiché (issu de cash_register.name)
  opening_balance: number;   // backend field (renommé de opening_float)
  opened_at: string;
  opened_by: string;         // backend field (renommé de user)
}

export interface StockAlert {
  product_id: string;
  product: string;
  sku: string;
  stock: number;
  min_stock: number;
}

export interface StockMovement {
  id: string;
  product: string;
  type: "entree" | "sortie" | "ajustement" | "transfert";
  qty: number;
  reason: string;
  created_at: string;
}

export interface DashboardData {
  revenue_today: number;
  sales_count: number;
  average_basket: number;
  customers_today: number;
  revenue_series: { date: string; value: number }[];
  recent_sales: Sale[];
}

export interface Warranty {
  id: string;
  imei: string;
  product: string;
  customer: string;
  starts_at: string;
  ends_at: string;
  status: "active" | "expiree";
}

export interface ServiceTicket {
  id: string;
  reference: string;
  customer: string;
  product: string;
  imei: string;
  status: "open" | "in_repair" | "closed";
  repair_cost: number;
  under_warranty: boolean;
  created_at: string;
}

export interface Installment {
  id: string;
  schedule_id: string;
  customer: string;
  due_date: string;
  amount: number;
  status: "payee" | "due" | "retard";
}

export interface PaymentSchedule {
  id: string;
  reference: string;
  customer: string;
  product: string;
  total: number;
  paid: number;
  installments_total: number;
  installments_paid: number;
  next_due: string;
  status: "en_cours" | "solde" | "retard";
}

// Supplier: colonnes réelles en BD = id, name, active uniquement.
// phone/city/balance nécessitent une migration backend pour exister.
export interface Supplier {
  id: string;
  name: string;
  active: boolean;
}

export interface InvoiceSetting {
  company_name: string;
  niu: string | null;
  rccm: string | null;
  address: string | null;
  phone: string | null;
}

export interface InvoiceLine {
  id: string;
  designation: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  discount_percent: number;
  total: number;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  date: string;          // backend: payment_date
  method: string;
  reference: string | null;
}

export interface Invoice {
  id: string;
  number: string;
  customer: string;             // backend: customer.name
  customer_id: string;
  customer_phone: string | null;
  total: number;                // backend: total_ttc
  total_ht: number;
  total_vat: number;
  paid: number;                 // backend: paid_amount
  outstanding: number;          // backend: outstanding_amount
  status: "brouillon" | "envoyee" | "partielle" | "payee" | "en_retard";
  issued_at: string;            // backend: issue_date
  due_date: string | null;
  notes: string | null;
  sale_number: string | null;   // backend: sale.number
  lines: InvoiceLine[];         // backend: sale.lines
  payments: InvoicePayment[];
  setting: InvoiceSetting | null;
}

// ── Types bruts backend ────────────────────────────────────────────────────────

export interface BackendInvoicePayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference: string | null;
}

export interface BackendSaleLine {
  id: string;
  designation: string;
  quantity: number;
  unit_price: number;
  vat_rate: string | number;
  discount_percent: number;
  line_total_including_tax: number;
  product?: { label: string; reference: string } | null;
}

export interface BackendInvoice {
  id: string;
  number: string;
  status: "draft" | "sent" | "partially_paid" | "paid" | "overdue";
  client_id: string;
  sale_id: string | null;
  issue_date: string;
  due_date: string | null;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  paid_amount: number;
  outstanding_amount: number;
  notes: string | null;
  customer?: { id: string; name: string; phone?: string } | null;
  sale?: { id: string; number: string | null; lines?: BackendSaleLine[] } | null;
  payments?: BackendInvoicePayment[];
  setting?: InvoiceSetting | null;
}

export interface Promotion {
  id: string;
  name: string;
  type: "percent" | "fixed_amount";          // valeurs backend réelles
  type_label: "%" | "XAF";                   // pour l'affichage
  scope: "product" | "family";
  value: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
  cumulative: boolean;
}

export interface BackendPromotion {
  id: string;
  name: string;
  type: "percent" | "fixed_amount";
  scope: "product" | "family";
  scope_id: string | null;
  value: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  cumulative: boolean;
}

export interface TransferLine {
  id: string;
  product_id: string;
  product?: { label: string; reference: string } | null;
  quantity: number;
}

export interface Transfer {
  id: string;
  reference: string;
  from: string;                              // sourcePos.name
  to: string;                                // destinationPos.name
  source_pos_id: string;
  destination_pos_id: string;
  items: number;                             // nb lignes
  status: "pending" | "in_transit" | "received" | "cancelled";
  status_label: "Créé" | "En transit" | "Reçu" | "Annulé";
  notes: string | null;
  created_at: string;
  lines?: TransferLine[];
}

export interface BackendTransfer {
  id: string;
  status: "pending" | "in_transit" | "received" | "cancelled";
  notes: string | null;
  source_pos_id: string;
  destination_pos_id: string;
  created_at: string;
  source_pos?: { id: string; name: string } | null;
  destination_pos?: { id: string; name: string } | null;
  lines?: TransferLine[];
}

// ─── Types bruts backend (shapes réelles des réponses API) ───────────────────

export interface BackendProduct {
  id: string;
  reference: string;
  label: string;
  family_id: string;
  family?: { id: string; name: string };
  selling_price: number;
  vat_rate: string | number;
  granularity: "quantity" | "variant" | "serial" | "batch" | "service";
  active: boolean;
  images?: Array<{ id: string; url: string; position: number }>;
  attributes?: Record<string, unknown> | null;
}

// Réponse de /commerce/stock et /commerce/stock/alerts
export interface BackendStockLevel {
  id: string;
  point_of_sale_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  quantity: number;
  minimum_quantity: number;
  point_of_sale?: { id: string; name: string };
  product?: { id: string; reference: string; label: string };
}

// Type frontend pour la page stock
export interface StockLevel {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  pos_id: string;
  pos_name: string;
  quantity: number;
  minimum_quantity: number;
}

export interface BackendCashSession {
  id: string;
  cash_register_id: string;
  state: "open" | "closed";
  opened_at: string;
  closed_at?: string;
  opening_balance: number;
  closing_balance?: number;
  opened_by: string;
  closed_by?: string;
  cash_register?: { id: string; name: string; point_of_sale?: { name: string } };
}

export interface BackendCustomer {
  id: string;
  name: string;
  phone: string;
  outstanding_balance: number;
  credit_limit: number;
  active: boolean;
  total_spent?: number;
  sales_count?: number;
}

export interface BackendQuote {
  id: string;
  number: string | null;
  state: "quote" | "draft" | "confirmed" | "abandoned";
  total_including_tax: number;
  valid_until: string | null;
  created_at: string;
  lines_count?: number;
  customer?: { id: string; name: string } | null;
}

export interface BackendSale {
  id: string;
  number: string;               // ex: "V-2026-0003"
  state: "draft" | "confirmed" | "abandoned" | "quote";
  total_including_tax: number;
  total_excluding_tax: number;
  total_tax: number;
  created_at: string;
  confirmed_at: string | null;
  lines_count?: number;
  customer?: { id: string; name: string } | null;
  cash_session?: {
    id: string;
    opened_by?: {
      id: string;
      first_name: string;
      last_name: string;
    } | null;
  } | null;
}

export interface BackendSerialUnit {
  id: string;
  product_id: string;
  product?: { id: string; label: string };
  serial_number: string;   // le backend appelle le champ "serial_number", pas "imei"
  status: "disponible" | "vendu" | "hs" | "reserve";
  entered_at: string;
  sale_id?: string;
}
