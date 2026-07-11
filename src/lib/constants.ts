import type { PaymentMethod, Rounding } from "./types";

// Sazby DPH platné v ČR (2024+): základní 21 %, snížená 12 %, nulová.
export const VAT_RATES = [21, 12, 0] as const;

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "prikazem", label: "Převodem" },
  { value: "hotove", label: "Hotově" },
  { value: "kartou", label: "Kartou" },
  { value: "dobirka", label: "Dobírkou" },
  { value: "zapoctem", label: "Zápočtem" },
];

export const ROUNDING_OPTIONS: { value: Rounding; label: string }[] = [
  { value: "none", label: "Bez zaokrouhlení" },
  { value: "math", label: "Na celé koruny (matematicky)" },
  { value: "up", label: "Nahoru na koruny" },
  { value: "down", label: "Dolů na koruny" },
];

export const UNITS = ["ks", "hod", "den", "měs", "kg", "m", "m²", "l", "%", "sada"];

export const CURRENCIES = ["CZK", "EUR", "USD"];

// Nejčastější kódy českých bank pro zobrazení názvu a validaci.
export const BANK_CODES: Record<string, string> = {
  "0100": "Komerční banka",
  "0300": "ČSOB",
  "0600": "MONETA Money Bank",
  "0710": "Česká národní banka",
  "0800": "Česká spořitelna",
  "2010": "Fio banka",
  "2020": "MUFG Bank",
  "2060": "Citfin",
  "2070": "TRINITY BANK",
  "2100": "Hypoteční banka",
  "2200": "Peněžní dům",
  "2250": "Banka CREDITAS",
  "2260": "NEY spořitelní družstvo",
  "2600": "Citibank",
  "2700": "UniCredit Bank",
  "3030": "Air Bank",
  "3050": "BNP Paribas Personal Finance",
  "3060": "PKO BP",
  "3500": "ING Bank",
  "4000": "Max banka",
  "4300": "Národní rozvojová banka",
  "5500": "Raiffeisenbank",
  "5800": "J&T Banka",
  "6000": "PPF banka",
  "6100": "Equa bank",
  "6200": "COMMERZBANK",
  "6210": "mBank",
  "6300": "BNP Paribas",
  "6700": "Všeobecná úverová banka",
  "6800": "Sberbank CZ",
  "7910": "Deutsche Bank",
  "7940": "Waldviertler Sparkasse",
  "8030": "Volksbank Raiffeisenbank",
  "8040": "Oberbank AG",
  "8060": "Stavební spořitelna České spořitelny",
  "8090": "Česká exportní banka",
  "8150": "HSBC",
  "8190": "Sparkasse Oberlausitz",
  "8220": "Payment Execution",
  "8250": "Bank of China",
  "8255": "Bank of Communications",
  "8265": "Industrial and Commercial Bank of China",
};

export interface AccentTheme {
  key: string;
  label: string;
  // barvy ve formátu oklch pro světlý režim
  color: string; // hlavní akcent
  soft: string; // jemné pozadí akcentu
  contrast: string; // text na akcentu
}

// Humanisticky laděná paleta — teplé, klidné, „papírové" tóny.
export const ACCENTS: AccentTheme[] = [
  {
    key: "terracotta",
    label: "Terakota",
    color: "oklch(0.62 0.15 40)",
    soft: "oklch(0.95 0.03 50)",
    contrast: "oklch(0.99 0.01 60)",
  },
  {
    key: "olive",
    label: "Olivová",
    color: "oklch(0.58 0.09 125)",
    soft: "oklch(0.95 0.03 125)",
    contrast: "oklch(0.99 0.01 125)",
  },
  {
    key: "indigo",
    label: "Indigo",
    color: "oklch(0.55 0.16 264)",
    soft: "oklch(0.95 0.03 264)",
    contrast: "oklch(0.99 0.01 264)",
  },
  {
    key: "teal",
    label: "Modrozelená",
    color: "oklch(0.6 0.1 195)",
    soft: "oklch(0.95 0.03 195)",
    contrast: "oklch(0.99 0.01 195)",
  },
  {
    key: "plum",
    label: "Švestková",
    color: "oklch(0.52 0.14 340)",
    soft: "oklch(0.95 0.03 340)",
    contrast: "oklch(0.99 0.01 340)",
  },
  {
    key: "slate",
    label: "Grafitová",
    color: "oklch(0.45 0.03 260)",
    soft: "oklch(0.94 0.01 260)",
    contrast: "oklch(0.99 0.01 260)",
  },
];

export interface FontOption {
  key: string;
  label: string;
  // CSS proměnná registrovaná v layoutu
  variable: string;
  note: string;
}

export const FONTS: FontOption[] = [
  { key: "inter", label: "Inter", variable: "var(--font-inter)", note: "Čisté a univerzální" },
  { key: "manrope", label: "Manrope", variable: "var(--font-manrope)", note: "Měkké a moderní" },
  { key: "plex", label: "IBM Plex Sans", variable: "var(--font-plex)", note: "Technické a přesné" },
  { key: "geist", label: "Geist", variable: "var(--font-geist-sans)", note: "Neutrální a ostré" },
];

export const DEFAULT_ACCENT = "terracotta";
export const DEFAULT_FONT = "inter";
