import type {
  CashRegister,
  Customer,
  DashboardData,
  Installment,
  Invoice,
  PaymentMethod,
  PaymentSchedule,
  Product,
  Promotion,
  Sale,
  SerialUnit,
  ServiceTicket,
  StockMovement,
  Supplier,
  Transfer,
  Warranty,
} from "./types";

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();
const daysAhead = (n: number) => new Date(now + n * 86_400_000).toISOString();

export const demoProducts: Product[] = [
  { id: "1", name: "iPhone 15 Pro 256 Go", sku: "APL-15P-256", family: "Smartphones", family_id: "fam-1", price: 785000, stock: 6, min_stock: 3, has_serial: true },
  { id: "2", name: "Samsung Galaxy S24 128 Go", sku: "SAM-S24-128", family: "Smartphones", family_id: "fam-1", price: 545000, stock: 2, min_stock: 4, has_serial: true },
  { id: "3", name: "Tecno Camon 30", sku: "TEC-C30", family: "Smartphones", family_id: "fam-1", price: 145000, stock: 14, min_stock: 5, has_serial: true },
  { id: "4", name: "iPad Air 11\" 128 Go", sku: "APL-IPA-128", family: "Tablettes", family_id: "fam-2", price: 495000, stock: 4, min_stock: 2, has_serial: true },
  { id: "5", name: "AirPods Pro 2", sku: "APL-APP2", family: "Audio", family_id: "fam-3", price: 165000, stock: 11, min_stock: 4, has_serial: false },
  { id: "6", name: "Chargeur USB-C 45W", sku: "ACC-CHG-45", family: "Accessoires", family_id: "fam-4", price: 12000, stock: 48, min_stock: 15, has_serial: false },
  { id: "7", name: "Coque silicone iPhone 15", sku: "ACC-CQ-15", family: "Accessoires", family_id: "fam-4", price: 6500, stock: 0, min_stock: 10, has_serial: false },
  { id: "8", name: "Verre trempé universel", sku: "ACC-VT-UNI", family: "Accessoires", family_id: "fam-4", price: 3500, stock: 92, min_stock: 20, has_serial: false },
  { id: "9", name: "Powerbank 20 000 mAh", sku: "ACC-PB-20K", family: "Accessoires", family_id: "fam-4", price: 22000, stock: 7, min_stock: 8, has_serial: false },
  { id: "10", name: "Montre Galaxy Watch 6", sku: "SAM-GW6", family: "Objets connectés", family_id: "fam-5", price: 195000, stock: 3, min_stock: 2, has_serial: true },
  { id: "11", name: "Écouteurs JBL Tune 520", sku: "JBL-T520", family: "Audio", family_id: "fam-3", price: 34000, stock: 18, min_stock: 6, has_serial: false },
  { id: "12", name: "Câble Lightning 1m", sku: "ACC-CBL-LT", family: "Accessoires", family_id: "fam-4", price: 4500, stock: 65, min_stock: 20, has_serial: false },
];

export const demoFamilies = [
  "Smartphones",
  "Tablettes",
  "Audio",
  "Accessoires",
  "Objets connectés",
];

export const demoCustomers: Customer[] = [
  { id: "1", name: "Ngono Marie", phone: "+237 677 12 34 56", credit: 15000, total_spent: 1245000, sales_count: 9 },
  { id: "2", name: "Fotso Éric", phone: "+237 691 88 20 11", credit: 0, total_spent: 785000, sales_count: 3 },
  { id: "3", name: "Boutique Nkolbisson", phone: "+237 655 40 09 87", credit: 42000, total_spent: 3120000, sales_count: 21 },
  { id: "4", name: "Tchoua Alain", phone: "+237 699 71 45 02", credit: 0, total_spent: 342000, sales_count: 5 },
  { id: "5", name: "Mbarga Josiane", phone: "+237 678 30 55 41", credit: 5000, total_spent: 167500, sales_count: 4 },
];

export const demoSales: Sale[] = [
  { id: "1042", reference: "VTE-1042", customer: "Ngono Marie", total: 795500, status: "confirmee", created_at: daysAgo(0), seller: "Alice", items: 3 },
  { id: "1041", reference: "VTE-1041", customer: "Client comptoir", total: 22000, status: "confirmee", created_at: daysAgo(0), seller: "Alice", items: 1 },
  { id: "1040", reference: "VTE-1040", customer: "Fotso Éric", total: 545000, status: "confirmee", created_at: daysAgo(0), seller: "Boris", items: 2 },
  { id: "1039", reference: "VTE-1039", customer: "Client comptoir", total: 10000, status: "annulee", created_at: daysAgo(1), seller: "Alice", items: 2 },
  { id: "1038", reference: "VTE-1038", customer: "Boutique Nkolbisson", total: 358000, status: "confirmee", created_at: daysAgo(1), seller: "Boris", items: 12 },
  { id: "1037", reference: "VTE-1037", customer: "Tchoua Alain", total: 165000, status: "confirmee", created_at: daysAgo(2), seller: "Alice", items: 1 },
];

export const demoDashboard: DashboardData = {
  revenue_today: 1362500,
  sales_count: 14,
  average_basket: 97321,
  customers_today: 11,
  revenue_series: Array.from({ length: 30 }, (_, i) => ({
    date: daysAgo(29 - i),
    value: 350000 + Math.round(Math.sin(i / 2.4) * 240000) + i * 14000,
  })),
  recent_sales: demoSales.slice(0, 5),
};

export const demoPaymentMethods: PaymentMethod[] = [
  { id: "1", code: "especes", label: "Espèces" },
  { id: "2", code: "mobile_money", label: "Mobile Money" },
  { id: "3", code: "carte", label: "Carte bancaire" },
  { id: "4", code: "avoir", label: "Avoir client" },
];

export const demoSerialUnits: SerialUnit[] = [
  { id: "1", product_id: "1", product_name: "iPhone 15 Pro 256 Go", imei: "356938035643809", status: "disponible", entered_at: daysAgo(12) },
  { id: "2", product_id: "1", product_name: "iPhone 15 Pro 256 Go", imei: "356938035643810", status: "disponible", entered_at: daysAgo(12) },
  { id: "3", product_id: "1", product_name: "iPhone 15 Pro 256 Go", imei: "356938035643811", status: "vendu", entered_at: daysAgo(30), sale_id: "1042" },
  { id: "4", product_id: "2", product_name: "Samsung Galaxy S24 128 Go", imei: "351756051523999", status: "disponible", entered_at: daysAgo(8) },
  { id: "5", product_id: "3", product_name: "Tecno Camon 30", imei: "868201045612345", status: "disponible", entered_at: daysAgo(5) },
  { id: "6", product_id: "4", product_name: "iPad Air 11\" 128 Go", imei: "352099001761481", status: "reserve", entered_at: daysAgo(20) },
  { id: "7", product_id: "10", product_name: "Montre Galaxy Watch 6", imei: "353012110987654", status: "hs", entered_at: daysAgo(60) },
];

export const demoStockMovements: StockMovement[] = [
  { id: "1", product: "iPhone 15 Pro 256 Go", type: "sortie", qty: -1, reason: "Vente VTE-1042", created_at: daysAgo(0) },
  { id: "2", product: "Chargeur USB-C 45W", type: "entree", qty: 40, reason: "Réception CMD-221", created_at: daysAgo(1) },
  { id: "3", product: "Coque silicone iPhone 15", type: "sortie", qty: -4, reason: "Vente VTE-1038", created_at: daysAgo(1) },
  { id: "4", product: "Powerbank 20 000 mAh", type: "ajustement", qty: -2, reason: "Inventaire mensuel", created_at: daysAgo(3) },
  { id: "5", product: "Tecno Camon 30", type: "transfert", qty: -3, reason: "Transfert TRF-018", created_at: daysAgo(4) },
];

export const demoCashRegisters: CashRegister[] = [
  { id: "cr-1", name: "Caisse 1 — Comptoir", point_of_sale: "Boutique Centre" },
  { id: "cr-2", name: "Caisse 2 — Étage", point_of_sale: "Boutique Centre" },
  { id: "cr-3", name: "Caisse mobile", point_of_sale: "Boutique Bonapriso" },
];

export const demoWarranties: Warranty[] = [
  { id: "1", imei: "356938035643811", product: "iPhone 15 Pro 256 Go", customer: "Ngono Marie", starts_at: daysAgo(30), ends_at: daysAhead(335), status: "active" },
  { id: "2", imei: "351756051523777", product: "Samsung Galaxy S24 128 Go", customer: "Fotso Éric", starts_at: daysAgo(340), ends_at: daysAhead(25), status: "active" },
  { id: "3", imei: "868201045699111", product: "Tecno Camon 30", customer: "Tchoua Alain", starts_at: daysAgo(400), ends_at: daysAgo(35), status: "expiree" },
];

export const demoTickets: ServiceTicket[] = [
  { id: "1", reference: "SAV-0091", customer: "Ngono Marie", product: "iPhone 15 Pro 256 Go", imei: "356938035643811", status: "diagnostic", repair_cost: 0, under_warranty: true, created_at: daysAgo(2) },
  { id: "2", reference: "SAV-0090", customer: "Tchoua Alain", product: "Tecno Camon 30", imei: "868201045699111", status: "reparation", repair_cost: 25000, under_warranty: false, created_at: daysAgo(5) },
  { id: "3", reference: "SAV-0089", customer: "Mbarga Josiane", product: "AirPods Pro 2", imei: "—", status: "pret", repair_cost: 12000, under_warranty: false, created_at: daysAgo(9) },
];

export const demoSchedules: PaymentSchedule[] = [
  { id: "1", reference: "ECH-0031", customer: "Fotso Éric", product: "Samsung Galaxy S24 128 Go", total: 545000, paid: 218000, installments_total: 5, installments_paid: 2, next_due: daysAhead(6), status: "en_cours" },
  { id: "2", reference: "ECH-0030", customer: "Tchoua Alain", product: "iPad Air 11\" 128 Go", total: 495000, paid: 99000, installments_total: 5, installments_paid: 1, next_due: daysAgo(4), status: "retard" },
  { id: "3", reference: "ECH-0029", customer: "Ngono Marie", product: "AirPods Pro 2", total: 165000, paid: 165000, installments_total: 3, installments_paid: 3, next_due: daysAgo(20), status: "solde" },
];

export const demoInstallments: Installment[] = [
  { id: "1", schedule_id: "2", customer: "Tchoua Alain", due_date: daysAgo(4), amount: 99000, status: "retard" },
  { id: "2", schedule_id: "1", customer: "Fotso Éric", due_date: daysAhead(6), amount: 109000, status: "due" },
  { id: "3", schedule_id: "1", customer: "Fotso Éric", due_date: daysAhead(36), amount: 109000, status: "due" },
  { id: "4", schedule_id: "2", customer: "Tchoua Alain", due_date: daysAhead(26), amount: 99000, status: "due" },
];

export const demoSuppliers: Supplier[] = [
  { id: "1", name: "Tech Import Douala", active: true },
  { id: "2", name: "Global Mobile SARL", active: true },
  { id: "3", name: "Accessoires Plus", active: true },
];

export const demoInvoices: Invoice[] = [
  {
    id: "1", number: "FAC-2026-0042",
    customer: "Boutique Nkolbisson", customer_id: "3", customer_phone: "+237 655 40 09 87",
    total: 3120000, total_ht: 2616946, total_vat: 503054,
    paid: 1500000, outstanding: 1620000, status: "partielle",
    issued_at: daysAgo(12), due_date: daysAhead(18), notes: null,
    sale_number: "V-2026-0001", lines: [
      { id: "l1", designation: "iPhone 15 Pro 256 Go", quantity: 2, unit_price: 1308473, vat_rate: 19.25, discount_percent: 0, total: 3120000 },
    ],
    payments: [
      { id: "p1", amount: 1000000, date: daysAgo(10), method: "Virement", reference: "VIR-001" },
      { id: "p2", amount: 500000, date: daysAgo(3), method: "Espèces", reference: null },
    ],
    setting: { company_name: "BSS Électronique SARL", niu: "M021912345678A", rccm: "RC/DLA/2019/B/1234", address: "Akwa, Douala", phone: "+237 233 42 00 00" },
  },
  {
    id: "2", number: "FAC-2026-0041",
    customer: "Ngono Marie", customer_id: "1", customer_phone: "+237 677 12 34 56",
    total: 795500, total_ht: 667143, total_vat: 128357,
    paid: 795500, outstanding: 0, status: "payee",
    issued_at: daysAgo(20), due_date: daysAgo(5), notes: null,
    sale_number: null, lines: [],
    payments: [{ id: "p3", amount: 795500, date: daysAgo(5), method: "Mobile Money", reference: null }],
    setting: { company_name: "BSS Électronique SARL", niu: "M021912345678A", rccm: "RC/DLA/2019/B/1234", address: "Akwa, Douala", phone: "+237 233 42 00 00" },
  },
  {
    id: "3", number: "FAC-2026-0040",
    customer: "Global Mobile SARL", customer_id: "2", customer_phone: "+237 677 09 11 22",
    total: 460000, total_ht: 385671, total_vat: 74329,
    paid: 0, outstanding: 460000, status: "envoyee",
    issued_at: daysAgo(26), due_date: daysAhead(4), notes: "Paiement à 30 jours",
    sale_number: null, lines: [],
    payments: [],
    setting: null,
  },
];

export const demoPromotions: Promotion[] = [
  { id: "1", name: "Rentrée accessoires -15%", type: "percent", type_label: "%", scope: "product", value: 15, starts_at: daysAgo(10), ends_at: daysAhead(20), active: true, cumulative: false },
  { id: "2", name: "Bon d'achat 10 000 XAF", type: "fixed_amount", type_label: "XAF", scope: "product", value: 10000, starts_at: daysAgo(40), ends_at: daysAgo(5), active: false, cumulative: false },
];

export const demoTransfers: Transfer[] = [
  { id: "18", reference: "TRF-018", from: "Boutique Centre", to: "Boutique Bonapriso", source_pos_id: "pos-1", destination_pos_id: "pos-2", items: 3, status: "in_transit", status_label: "En transit", notes: null, created_at: daysAgo(4) },
  { id: "17", reference: "TRF-017", from: "Entrepôt", to: "Boutique Centre", source_pos_id: "pos-0", destination_pos_id: "pos-1", items: 24, status: "received", status_label: "Reçu", notes: null, created_at: daysAgo(11) },
  { id: "16", reference: "TRF-016", from: "Boutique Bonapriso", to: "Entrepôt", source_pos_id: "pos-2", destination_pos_id: "pos-0", items: 2, status: "pending", status_label: "Créé", notes: null, created_at: daysAgo(1) },
];
