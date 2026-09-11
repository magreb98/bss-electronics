import type {
  BackendCashSession,
  BackendCustomer,
  BackendInvoice,
  BackendInvoicePayment,
  BackendProduct,
  BackendPromotion,
  BackendQuote,
  BackendSale,
  BackendSerialUnit,
  BackendStockLevel,
  BackendTransfer,
  CashSession,
  Customer,
  Invoice,
  InvoicePayment,
  Product,
  Promotion,
  Sale,
  SerialUnit,
  StockLevel,
  Transfer,
} from "./types";

const STATE_MAP: Record<string, Sale["status"]> = {
  confirmed: "confirmee",
  abandoned: "annulee",
  draft: "en_cours",
  quote: "en_cours",
};

export function adaptSale(raw: BackendSale): Sale {
  return {
    id: raw.id,
    reference: raw.number ?? "—",
    ...(raw.customer?.name ? { customer: raw.customer.name } : {}),
    total: raw.total_including_tax ?? 0,
    status: STATE_MAP[raw.state] ?? "en_cours",
    created_at: raw.created_at,
    seller: raw.cash_session?.opened_by
      ? `${raw.cash_session.opened_by.first_name} ${raw.cash_session.opened_by.last_name}`.trim()
      : "—",
    items: raw.lines_count ?? 0,
  };
}

export function adaptSales(raws: BackendSale[]): Sale[] {
  return raws.map(adaptSale);
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export interface Quote {
  id: string;
  reference: string;
  customer: string | null;
  customer_id: string | null;
  total: number;
  valid_until: string | null;
  lines_count: number;
  status: "en_attente" | "converti" | "expire";
}

export function adaptQuote(raw: BackendQuote): Quote {
  const isExpired =
    raw.valid_until !== null && new Date(raw.valid_until) < new Date();
  const isConverted = raw.state === "draft" || raw.state === "confirmed";

  return {
    id: raw.id,
    reference: raw.number ?? `DEV-${raw.id.slice(0, 8).toUpperCase()}`,
    customer: raw.customer?.name ?? null,
    customer_id: raw.customer?.id ?? null,
    total: raw.total_including_tax ?? 0,
    valid_until: raw.valid_until,
    lines_count: raw.lines_count ?? 0,
    status: isConverted ? "converti" : isExpired ? "expire" : "en_attente",
  };
}

export function adaptQuotes(raws: BackendQuote[]): Quote[] {
  return raws.map(adaptQuote);
}

// ── Invoices ──────────────────────────────────────────────────────────────────

const INVOICE_STATUS_MAP: Record<string, Invoice["status"]> = {
  draft:         "brouillon",
  sent:          "envoyee",
  partially_paid:"partielle",
  paid:          "payee",
  overdue:       "en_retard",
};

export function adaptInvoicePayment(raw: BackendInvoicePayment): InvoicePayment {
  return {
    id: raw.id,
    amount: raw.amount,
    date: raw.payment_date,
    method: raw.method,
    reference: raw.reference,
  };
}

export function adaptInvoice(raw: BackendInvoice): Invoice {
  return {
    id: raw.id,
    number: raw.number,
    customer: raw.customer?.name ?? "—",
    customer_id: raw.client_id,
    customer_phone: raw.customer?.phone ?? null,
    total: raw.total_ttc,
    total_ht: raw.total_ht,
    total_vat: raw.total_vat,
    paid: raw.paid_amount,
    outstanding: raw.outstanding_amount,
    status: INVOICE_STATUS_MAP[raw.status] ?? "brouillon",
    issued_at: raw.issue_date,
    due_date: raw.due_date,
    notes: raw.notes,
    sale_number: raw.sale?.number ?? null,
    lines: (raw.sale?.lines ?? []).map((l) => ({
      id: l.id,
      designation: l.designation || l.product?.label || "—",
      quantity: l.quantity,
      unit_price: l.unit_price,
      vat_rate: Number(l.vat_rate),
      discount_percent: l.discount_percent,
      total: l.line_total_including_tax,
    })),
    payments: (raw.payments ?? []).map(adaptInvoicePayment),
    setting: raw.setting ?? null,
  };
}

export function adaptInvoices(raws: BackendInvoice[]): Invoice[] {
  return raws.map(adaptInvoice);
}

// ── Promotions ────────────────────────────────────────────────────────────────

export function adaptPromotion(raw: BackendPromotion): Promotion {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    type_label: raw.type === "percent" ? "%" : "XAF",
    scope: raw.scope,
    value: raw.value,
    starts_at: raw.starts_at ?? "",
    ends_at: raw.ends_at ?? "",
    active: raw.active,
    cumulative: raw.cumulative,
  };
}

export function adaptPromotions(raws: BackendPromotion[]): Promotion[] {
  return raws.map(adaptPromotion);
}

// ── Transfers ─────────────────────────────────────────────────────────────────

const TRANSFER_STATUS_LABEL: Record<string, Transfer["status_label"]> = {
  pending:   "Créé",
  in_transit:"En transit",
  received:  "Reçu",
  cancelled: "Annulé",
};

export function adaptTransfer(raw: BackendTransfer): Transfer {
  return {
    id: raw.id,
    reference: `TRF-${raw.id.slice(0, 8).toUpperCase()}`,
    from: raw.source_pos?.name ?? raw.source_pos_id.slice(0, 8),
    to: raw.destination_pos?.name ?? raw.destination_pos_id.slice(0, 8),
    source_pos_id: raw.source_pos_id,
    destination_pos_id: raw.destination_pos_id,
    items: raw.lines?.length ?? 0,
    status: raw.status,
    status_label: TRANSFER_STATUS_LABEL[raw.status] ?? "Créé",
    notes: raw.notes,
    created_at: raw.created_at,
    ...(raw.lines ? { lines: raw.lines } : {}),
  };
}

export function adaptTransfers(raws: BackendTransfer[]): Transfer[] {
  return raws.map(adaptTransfer);
}

export function adaptProduct(raw: BackendProduct): Product {
  return {
    id: raw.id,
    name: raw.label,
    sku: raw.reference,
    family: raw.family?.name ?? "",
    family_id: raw.family_id,
    price: raw.selling_price,
    stock: 0,
    min_stock: 0,
    has_serial: raw.granularity === "serial",
    ...(raw.images?.[0]?.url ? { image_url: raw.images[0].url } : {}),
    vat_rate: Number(raw.vat_rate),
    active: raw.active,
  };
}

export function adaptStockLevel(raw: BackendStockLevel): StockLevel {
  return {
    id: raw.id,
    product_id: raw.product_id ?? "",
    product_name: raw.product?.label ?? "—",
    product_sku: raw.product?.reference ?? "—",
    pos_id: raw.point_of_sale_id,
    pos_name: raw.point_of_sale?.name ?? raw.point_of_sale_id.slice(0, 8),
    quantity: raw.quantity,
    minimum_quantity: raw.minimum_quantity,
  };
}

export function adaptStockLevels(raws: BackendStockLevel[]): StockLevel[] {
  return raws.map(adaptStockLevel);
}

export function adaptProducts(raws: BackendProduct[]): Product[] {
  return raws.map(adaptProduct);
}

export function adaptCashSession(raw: BackendCashSession): CashSession {
  return {
    id: raw.id,
    cash_register_id: raw.cash_register_id,
    cash_register: raw.cash_register?.name ?? raw.cash_register_id,
    opening_balance: raw.opening_balance,
    opened_at: raw.opened_at,
    opened_by: raw.opened_by,
  };
}

export function adaptCustomer(raw: BackendCustomer): Customer {
  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone,
    credit: raw.outstanding_balance,
    total_spent: raw.total_spent ?? 0,
    sales_count: raw.sales_count ?? 0,
  };
}

export function adaptCustomers(raws: BackendCustomer[]): Customer[] {
  return raws.map(adaptCustomer);
}

export function adaptSerialUnit(raw: BackendSerialUnit): SerialUnit {
  return {
    id: raw.id,
    product_id: raw.product_id,
    product_name: raw.product?.label ?? "",
    imei: raw.serial_number,
    status: raw.status,
    entered_at: raw.entered_at,
    ...(raw.sale_id ? { sale_id: raw.sale_id } : {}),
  };
}

export function adaptSerialUnits(raws: BackendSerialUnit[]): SerialUnit[] {
  return raws.map(adaptSerialUnit);
}
