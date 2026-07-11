// Datové modely aplikace Fakturka. Vše se ukládá lokálně (localStorage),
// žádná databáze, žádný server — faktury i klienti zůstávají u vás.

export type PaymentMethod =
  | "prikazem"
  | "hotove"
  | "kartou"
  | "dobirka"
  | "zapoctem";

export type Rounding = "none" | "math" | "up" | "down";

export type InvoiceStatus = "draft" | "issued" | "paid";

/** Společné pole pro dodavatele i odběratele. */
export interface Party {
  name: string; // firma / jméno
  person?: string; // kontaktní osoba (u odběratele)
  street: string; // ulice a číslo
  city: string; // město
  zip: string; // PSČ
  country?: string;
  ico?: string;
  dic?: string;
  phone?: string;
  email?: string;
  web?: string;
}

export interface BankInfo {
  accountNumber: string; // např. "19-2000145399" nebo "2000145399"
  bankCode: string; // např. "0800"
  iban?: string; // volitelně ruční IBAN (jinak se dopočítá)
}

export interface Supplier extends Party {
  bank: BankInfo;
  vatPayer: boolean; // plátce DPH
}

export interface Client extends Party {
  id: string;
  createdAt: string;
  note?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string; // ks, hod, kg, m, ...
  unitPrice: number; // jednotková cena bez DPH
  vatRate: number; // 21 | 12 | 0
  discount: number; // sleva v %
}

export interface Invoice {
  id: string;
  number: string; // číslo faktury, např. "2026001"
  variableSymbol: string;
  constantSymbol?: string;
  orderNumber?: string;
  supplier: Supplier; // snapshot v době vystavení
  client: Party; // snapshot odběratele
  clientId?: string;
  issueDate: string; // datum vystavení (ISO)
  dueDate: string; // datum splatnosti
  taxDate: string; // datum uskutečnění plnění (DUZP)
  paymentMethod: PaymentMethod;
  items: InvoiceItem[];
  rounding: Rounding;
  currency: string; // CZK, EUR
  note?: string;
  issuedBy?: string; // vystavil
  qrPayment: boolean;
  qrMessage?: string;
  vatPayer: boolean; // zobrazovat DPH
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  // Import ze staré PDF faktury:
  imported?: boolean;
  sourceHash?: string; // otisk pro idempotentní import
  sourceFileName?: string;
}

export interface Appearance {
  theme: "light" | "dark" | "system";
  accent: string; // klíč z ACCENTS
  font: string; // klíč z FONTS
  logo?: string; // data URL loga
}

export interface Numbering {
  prefix: string;
  nextNumber: number;
  pad: number; // počet číslic pro doplnění nul
  includeYear: boolean;
}

export interface InvoiceDefaults {
  dueDays: number;
  paymentMethod: PaymentMethod;
  currency: string;
  rounding: Rounding;
  constantSymbol?: string;
  qrPayment: boolean;
  qrMessage: string;
  footerNote?: string;
  issuedBy?: string;
}

export interface Settings {
  supplier: Supplier;
  appearance: Appearance;
  invoice: InvoiceDefaults;
  numbering: Numbering;
  onboarded: boolean;
}
