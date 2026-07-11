import type { Invoice, InvoiceItem, Rounding, Settings } from "./types";
import { addDays, todayIso } from "./format";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface ItemTotals {
  base: number; // základ bez DPH po slevě
  vat: number;
  total: number; // s DPH
}

export function itemTotals(item: InvoiceItem, vatPayer: boolean): ItemTotals {
  const gross = (item.quantity || 0) * (item.unitPrice || 0);
  const base = round2(gross * (1 - (item.discount || 0) / 100));
  const rate = vatPayer ? item.vatRate || 0 : 0;
  const vat = round2((base * rate) / 100);
  return { base, vat, total: round2(base + vat) };
}

export interface VatRow {
  rate: number;
  base: number;
  vat: number;
  total: number;
}

export interface InvoiceTotals {
  subtotal: number; // základ celkem bez DPH
  vatTotal: number;
  totalBeforeRounding: number;
  rounding: number;
  total: number; // k úhradě
  breakdown: VatRow[];
}

function applyRounding(value: number, mode: Rounding): number {
  switch (mode) {
    case "math":
      return Math.round(value);
    case "up":
      return Math.ceil(value);
    case "down":
      return Math.floor(value);
    default:
      return value;
  }
}

export function invoiceTotals(
  items: InvoiceItem[],
  opts: { vatPayer: boolean; rounding: Rounding },
): InvoiceTotals {
  const groups = new Map<number, VatRow>();

  for (const item of items) {
    const rate = opts.vatPayer ? item.vatRate || 0 : 0;
    const { base } = itemTotals(item, opts.vatPayer);
    const row = groups.get(rate) || { rate, base: 0, vat: 0, total: 0 };
    row.base = round2(row.base + base);
    groups.set(rate, row);
  }

  const breakdown: VatRow[] = [];
  let subtotal = 0;
  let vatTotal = 0;
  for (const row of groups.values()) {
    row.vat = round2((row.base * row.rate) / 100);
    row.total = round2(row.base + row.vat);
    subtotal = round2(subtotal + row.base);
    vatTotal = round2(vatTotal + row.vat);
    breakdown.push(row);
  }
  breakdown.sort((a, b) => b.rate - a.rate);

  const totalBeforeRounding = round2(subtotal + vatTotal);
  const rounded = applyRounding(totalBeforeRounding, opts.rounding);
  const rounding = round2(rounded - totalBeforeRounding);

  return {
    subtotal,
    vatTotal,
    totalBeforeRounding,
    rounding,
    total: rounded,
    breakdown,
  };
}

/** Celková částka k úhradě pro fakturu. */
export function invoiceGrandTotal(inv: Invoice): number {
  return invoiceTotals(inv.items, {
    vatPayer: inv.vatPayer,
    rounding: inv.rounding,
  }).total;
}

/** Číslo faktury dle nastavení číslování. */
export function buildInvoiceNumber(
  numbering: Settings["numbering"],
  year = new Date().getFullYear(),
): string {
  const seq = String(numbering.nextNumber).padStart(numbering.pad, "0");
  const yearPart = numbering.includeYear ? String(year) : "";
  return `${numbering.prefix}${yearPart}${seq}`;
}

/** Variabilní symbol = číslice z čísla faktury (max 10 znaků). */
export function variableSymbolFromNumber(invoiceNumber: string): string {
  return invoiceNumber.replace(/\D/g, "").slice(0, 10);
}

export function newItem(vatRate = 21): InvoiceItem {
  return {
    id: uid(),
    description: "",
    quantity: 1,
    unit: "ks",
    unitPrice: 0,
    vatRate,
    discount: 0,
  };
}

/** Vytvoří prázdnou fakturu z nastavení dodavatele. */
export function draftFromSettings(settings: Settings): Invoice {
  const issueDate = todayIso();
  const number = buildInvoiceNumber(settings.numbering);
  return {
    id: uid(),
    number,
    variableSymbol: variableSymbolFromNumber(number),
    constantSymbol: settings.invoice.constantSymbol,
    orderNumber: "",
    supplier: structuredClone(settings.supplier),
    client: {
      name: "",
      street: "",
      city: "",
      zip: "",
    },
    issueDate,
    dueDate: addDays(issueDate, settings.invoice.dueDays),
    taxDate: issueDate,
    paymentMethod: settings.invoice.paymentMethod,
    items: [newItem(settings.supplier.vatPayer ? 21 : 0)],
    rounding: settings.invoice.rounding,
    currency: settings.invoice.currency,
    note: settings.invoice.footerNote || "",
    issuedBy: settings.invoice.issuedBy || settings.supplier.person || "",
    qrPayment: settings.invoice.qrPayment,
    qrMessage: settings.invoice.qrMessage,
    vatPayer: settings.supplier.vatPayer,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
