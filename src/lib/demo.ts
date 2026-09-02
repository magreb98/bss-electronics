import type {
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

/**
 * Données de démonstration servies lorsque l'API backend n'est pas joignable
 * (VITE_API_URL non configurée ou serveur hors-ligne).
 */

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();
const daysAhead = (n: number) => new Date(now + n * 86_400_000).toISOString();

export const demoProducts: Product[] = [
  { id: 1, name: "iPhone 15 Pro 256 Go", sku: "APL-15P-256", family: "Smartphones", price: 785000, cost_price: 690000, stock: 6, min_stock: 3, has_serial: true },
  { id: 2, name: "Samsung Galaxy S24 128 Go", sku: "SAM-S24-128", family: "Smartphones", price: 545000, cost_price: 470000, stock: 2, min_stock: 4, has_serial: true },
  { id: 3, name: "Tecno Camon 30", sku: "TEC-C30", family: "Smartphones", price: 145000, cost_price: 118000, stock: 14, min_stock: 5, has_serial: true },
  { id: 4, name: "iPad Air 11\" 128 Go", sku: "APL-IPA-128", family: "Tablettes", price: 495000, cost_price: 430000, stock: 4, min_stock: 2, has_serial: true },
  { id: 5, name: "AirPods Pro 2", sku: "APL-APP2", family: "Audio", price: 165000, cost_price: 132000, stock: 11, min_stock: 4, has_serial: false },
  { id: 6, name: "Chargeur USB-C 45W", sku: "ACC-CHG-45", family: "Accessoires", price: 12000, cost_price: 7000, stock: 48, min_stock: 15, has_serial: false },
  { id: 7, name: "Coque silicone iPhone 15", sku: "ACC-CQ-15", family: "Accessoires", price: 6500, cost_price: 3000, stock: 0, min_stock: 10, has_serial: false },
  { id: 8, name: "Verre trempé universel", sku: "ACC-VT-UNI", family: "Accessoires", price: 3500, cost_price: 1200, stock: 92, min_stock: 20, has_serial: false },
  { id: 9, name: "Powerbank 20 000 mAh", sku: "ACC-PB-20K", family: "Accessoires", price: 22000, cost_price: 14000, stock: 7, min_stock: 8, has_serial: false },
  { id: 10, name: "Montre Galaxy Watch 6", sku: "SAM-GW6", family: "Objets connectés", price: 195000, cost_price: 160000, stock: 3, min_stock: 2, has_serial: true },
  { id: 11, name: "Écouteurs JBL Tune 520", sku: "JBL-T520", family: "Audio", price: 34000, cost_price: 24000, stock: 18, min_stock: 6, has_serial: false },
  { id: 12, name: "Câble Lightning 1m", sku: "ACC-CBL-LT", family: "Accessoires", price: 4500, cost_price: 1800, stock: 65, min_stock: 20, has_serial: false },
];

export const demoFamilies = [
  "Smartphones",
  "Tablettes",
  "Audio",
  "Accessoires",
  "Objets connectés",
];

export const demoCustomers: Customer[] = [
  { id: 1, name: "Ngono Marie", phone: "+237 677 12 34 56", credit: 15000, total_spent: 1245000, sales_count: 9 },
  { id: 2, name: "Fotso Éric", phone: "+237 691 88 20 11", credit: 0, total_spent: 785000, sales_count: 3 },
  { id: 3, name: "Boutique Nkolbisson", phone: "+237 655 40 09 87", credit: 42000, total_spent: 3120000, sales_count: 21 },
  { id: 4, name: "Tchoua Alain", phone: "+237 699 71 45 02", credit: 0, total_spent: 342000, sales_count: 5 },
  { id: 5, name: "Mbarga Josiane", phone: "+237 678 30 55 41", credit: 5000, total_spent: 167500, sales_count: 4 },
];

export const demoSales: Sale[] = [
  { id: 1042, reference: "VTE-1042", customer: "Ngono Marie", total: 795500, status: "confirmee", created_at: daysAgo(0), seller: "Alice", items: 3 },
  { id: 1041, reference: "VTE-1041", customer: "Client comptoir", total: 22000, status: "confirmee", created_at: daysAgo(0), seller: "Alice", items: 1 },
  { id: 1040, reference: "VTE-1040", customer: "Fotso Éric", total: 545000, status: "confirmee", created_at: daysAgo(0), seller: "Boris", items: 2 },
  { id: 1039, reference: "VTE-1039", customer: "Client comptoir", total: 10000, status: "annulee", created_at: daysAgo(1), seller: "Alice", items: 2 },
  { id: 1038, reference: "VTE-1038", customer: "Boutique Nkolbisson", total: 358000, status: "confirmee", created_at: daysAgo(1), seller: "Boris", items: 12 },
  { id: 1037, reference: "VTE-1037", customer: "Tchoua Alain", total: 165000, status: "confirmee", created_at: daysAgo(2), seller: "Alice", items: 1 },
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
  { id: 1, code: "especes", label: "Espèces" },
  { id: 2, code: "mobile_money", label: "Mobile Money" },
  { id: 3, code: "carte", label: "Carte bancaire" },
  { id: 4, code: "avoir", label: "Avoir client" },
];

export const demoSerialUnits: SerialUnit[] = [
  { id: 1, product_id: 1, product_name: "iPhone 15 Pro 256 Go", imei: "356938035643809", status: "disponible", entered_at: daysAgo(12) },
  { id: 2, product_id: 1, product_name: "iPhone 15 Pro 256 Go", imei: "356938035643810", status: "disponible", entered_at: daysAgo(12) },
  { id: 3, product_id: 1, product_name: "iPhone 15 Pro 256 Go", imei: "356938035643811", status: "vendu", entered_at: daysAgo(30), sale_id: 1042 },
  { id: 4, product_id: 2, product_name: "Samsung Galaxy S24 128 Go", imei: "351756051523999", status: "disponible", entered_at: daysAgo(8) },
  { id: 5, product_id: 3, product_name: "Tecno Camon 30", imei: "868201045612345", status: "disponible", entered_at: daysAgo(5) },
  { id: 6, product_id: 4, product_name: "iPad Air 11\" 128 Go", imei: "352099001761481", status: "reserve", entered_at: daysAgo(20) },
  { id: 7, product_id: 10, product_name: "Montre Galaxy Watch 6", imei: "353012110987654", status: "hs", entered_at: daysAgo(60) },
];

export const demoStockMovements: StockMovement[] = [
  { id: 1, product: "iPhone 15 Pro 256 Go", type: "sortie", qty: -1, reason: "Vente VTE-1042", created_at: daysAgo(0) },
  { id: 2, product: "Chargeur USB-C 45W", type: "entree", qty: 40, reason: "Réception CMD-221", created_at: daysAgo(1) },
  { id: 3, product: "Coque silicone iPhone 15", type: "sortie", qty: -4, reason: "Vente VTE-1038", created_at: daysAgo(1) },
  { id: 4, product: "Powerbank 20 000 mAh", type: "ajustement", qty: -2, reason: "Inventaire mensuel", created_at: daysAgo(3) },
  { id: 5, product: "Tecno Camon 30", type: "transfert", qty: -3, reason: "Transfert TRF-018", created_at: daysAgo(4) },
];

export const demoWarranties: Warranty[] = [
  { id: 1, imei: "356938035643811", product: "iPhone 15 Pro 256 Go", customer: "Ngono Marie", starts_at: daysAgo(30), ends_at: daysAhead(335), status: "active" },
  { id: 2, imei: "351756051523777", product: "Samsung Galaxy S24 128 Go", customer: "Fotso Éric", starts_at: daysAgo(340), ends_at: daysAhead(25), status: "active" },
  { id: 3, imei: "868201045699111", product: "Tecno Camon 30", customer: "Tchoua Alain", starts_at: daysAgo(400), ends_at: daysAgo(35), status: "expiree" },
];

export const demoTickets: ServiceTicket[] = [
  { id: 1, reference: "SAV-0091", customer: "Ngono Marie", product: "iPhone 15 Pro 256 Go", imei: "356938035643811", status: "diagnostic", repair_cost: 0, under_warranty: true, created_at: daysAgo(2) },
  { id: 2, reference: "SAV-0090", customer: "Tchoua Alain", product: "Tecno Camon 30", imei: "868201045699111", status: "reparation", repair_cost: 25000, under_warranty: false, created_at: daysAgo(5) },
  { id: 3, reference: "SAV-0089", customer: "Mbarga Josiane", product: "AirPods Pro 2", imei: "—", status: "pret", repair_cost: 12000, under_warranty: false, created_at: daysAgo(9) },
];

export const demoSchedules: PaymentSchedule[] = [
  { id: 1, reference: "ECH-0031", customer: "Fotso Éric", product: "Samsung Galaxy S24 128 Go", total: 545000, paid: 218000, installments_total: 5, installments_paid: 2, next_due: daysAhead(6), status: "en_cours" },
  { id: 2, reference: "ECH-0030", customer: "Tchoua Alain", product: "iPad Air 11\" 128 Go", total: 495000, paid: 99000, installments_total: 5, installments_paid: 1, next_due: daysAgo(4), status: "retard" },
  { id: 3, reference: "ECH-0029", customer: "Ngono Marie", product: "AirPods Pro 2", total: 165000, paid: 165000, installments_total: 3, installments_paid: 3, next_due: daysAgo(20), status: "solde" },
];

export const demoInstallments: Installment[] = [
  { id: 1, schedule_id: 2, customer: "Tchoua Alain", due_date: daysAgo(4), amount: 99000, status: "retard" },
  { id: 2, schedule_id: 1, customer: "Fotso Éric", due_date: daysAhead(6), amount: 109000, status: "due" },
  { id: 3, schedule_id: 1, customer: "Fotso Éric", due_date: daysAhead(36), amount: 109000, status: "due" },
  { id: 4, schedule_id: 2, customer: "Tchoua Alain", due_date: daysAhead(26), amount: 99000, status: "due" },
];

export const demoSuppliers: Supplier[] = [
  { id: 1, name: "Tech Import Douala", phone: "+237 233 42 10 90", city: "Douala", balance: 1250000 },
  { id: 2, name: "Global Mobile SARL", phone: "+237 677 09 11 22", city: "Yaoundé", balance: 0 },
  { id: 3, name: "Accessoires Plus", phone: "+237 699 55 34 08", city: "Douala", balance: 320000 },
];

export const demoInvoices: Invoice[] = [
  { id: 1, number: "FAC-2026-0042", customer: "Boutique Nkolbisson", total: 3120000, paid: 1500000, status: "partielle", issued_at: daysAgo(12) },
  { id: 2, number: "FAC-2026-0041", customer: "Ngono Marie", total: 795500, paid: 795500, status: "payee", issued_at: daysAgo(20) },
  { id: 3, number: "FAC-2026-0040", customer: "Global Mobile SARL", total: 460000, paid: 0, status: "envoyee", issued_at: daysAgo(26) },
];

export const demoPromotions: Promotion[] = [
  { id: 1, name: "Rentrée accessoires -15%", type: "pourcentage", value: 15, starts_at: daysAgo(10), ends_at: daysAhead(20), active: true },
  { id: 2, name: "Bon d'achat 10 000 XAF", type: "montant", value: 10000, starts_at: daysAgo(40), ends_at: daysAgo(5), active: false },
];

export const demoTransfers: Transfer[] = [
  { id: 18, reference: "TRF-018", from: "Boutique Centre", to: "Boutique Bonapriso", items: 3, status: "expedie", created_at: daysAgo(4) },
  { id: 17, reference: "TRF-017", from: "Entrepôt", to: "Boutique Centre", items: 24, status: "recu", created_at: daysAgo(11) },
  { id: 16, reference: "TRF-016", from: "Boutique Bonapriso", to: "Entrepôt", items: 2, status: "cree", created_at: daysAgo(1) },
];
