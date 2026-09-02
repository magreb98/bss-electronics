export interface Paginated<T> {
  data: T[];
  meta: { total: number; current_page: number; per_page: number; last_page: number };
}

export interface User {
  id: number;
  name: string;
  phone: string;
  role: "vendeur" | "gerant" | "proprietaire";
}

export interface Family {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  family: string;
  price: number;
  cost_price: number;
  stock: number;
  min_stock: number;
  has_serial: boolean;
  image_url?: string;
}

export interface SerialUnit {
  id: number;
  product_id: number;
  product_name: string;
  imei: string;
  status: "disponible" | "vendu" | "hs" | "reserve";
  entered_at: string;
  sale_id?: number;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  credit: number;
  total_spent: number;
  sales_count: number;
}

export interface CartLine {
  key: string;
  product: Product;
  qty: number;
  discount: number;
  serial?: SerialUnit;
}

export interface Sale {
  id: number;
  reference: string;
  customer?: string;
  total: number;
  status: "confirmee" | "annulee" | "en_cours";
  created_at: string;
  seller: string;
  items: number;
}

export interface PaymentMethod {
  id: number;
  code: string;
  label: string;
}

export interface CashRegister {
  id: number;
  name: string;
  point_of_sale: string;
}

export interface CashSession {
  id: number;
  cash_register: string;
  opening_float: number;
  opened_at: string;
  user: string;
}

export interface StockAlert {
  product_id: number;
  product: string;
  sku: string;
  stock: number;
  min_stock: number;
}

export interface StockMovement {
  id: number;
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
  id: number;
  imei: string;
  product: string;
  customer: string;
  starts_at: string;
  ends_at: string;
  status: "active" | "expiree";
}

export interface ServiceTicket {
  id: number;
  reference: string;
  customer: string;
  product: string;
  imei: string;
  status: "recu" | "diagnostic" | "reparation" | "pret" | "rendu";
  repair_cost: number;
  under_warranty: boolean;
  created_at: string;
}

export interface Installment {
  id: number;
  schedule_id: number;
  customer: string;
  due_date: string;
  amount: number;
  status: "payee" | "due" | "retard";
}

export interface PaymentSchedule {
  id: number;
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

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  city: string;
  balance: number;
}

export interface Invoice {
  id: number;
  number: string;
  customer: string;
  total: number;
  paid: number;
  status: "brouillon" | "envoyee" | "payee" | "partielle";
  issued_at: string;
}

export interface Promotion {
  id: number;
  name: string;
  type: "pourcentage" | "montant";
  value: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
}

export interface Transfer {
  id: number;
  reference: string;
  from: string;
  to: string;
  items: number;
  status: "cree" | "expedie" | "recu";
  created_at: string;
}
