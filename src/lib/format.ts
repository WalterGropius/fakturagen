// Formátování částek a dat v českém formátu.

export function formatMoney(value: number, currency = "CZK"): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value || 0);
}

/** "10.07.2026" */
export function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

/** Datum pro <input type="date"> → "2026-07-10" */
export function toDateInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // "2026-07"
}

const CZ_MONTHS = [
  "leden",
  "únor",
  "březen",
  "duben",
  "květen",
  "červen",
  "červenec",
  "srpen",
  "září",
  "říjen",
  "listopad",
  "prosinec",
];

const CZ_MONTHS_SHORT = [
  "led",
  "úno",
  "bře",
  "dub",
  "kvě",
  "čer",
  "črc",
  "srp",
  "zář",
  "říj",
  "lis",
  "pro",
];

export function monthNameShort(month: number): string {
  return CZ_MONTHS_SHORT[month] ?? "";
}

export function monthName(month: number): string {
  return CZ_MONTHS[month] ?? "";
}

/** České skloňování podle počtu: 1 / 2–4 / 5+. */
export function czPlural(
  n: number,
  one: string,
  few: string,
  many: string,
): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

/** Vrátí true, pokud je faktura po splatnosti (a není zaplacená). */
export function isOverdue(dueDate: string, status: string): boolean {
  if (status === "paid" || status === "draft") return false;
  const due = new Date(dueDate);
  const today = new Date(todayIso());
  return due < today;
}
