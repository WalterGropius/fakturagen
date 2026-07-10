// Generování českého IBAN a QR platby (formát SPAYD / „QR Platba").
// Vše se počítá lokálně v prohlížeči — žádné externí API, žádné odesílání dat.
//
// Reference:
//  - IBAN: ISO 13616, český formát CZkk BBBB PPPPPP NNNNNNNNNN
//  - SPAYD: Short Payment Descriptor, standard České bankovní asociace
//    https://cs.wikipedia.org/wiki/Short_Payment_Descriptor

import { BANK_CODES } from "./constants";

/** Odstraní diakritiku — SPAYD i banky očekávají ASCII. */
export function stripDiacritics(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function mod97(numeric: string): number {
  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + (numeric.charCodeAt(i) - 48)) % 97;
  }
  return remainder;
}

/** Převede písmena na čísla (A=10 … Z=35) pro výpočet kontrolních číslic. */
function lettersToDigits(input: string): string {
  return input.replace(/[A-Z]/g, (c) => (c.charCodeAt(0) - 55).toString());
}

/**
 * Sestaví český IBAN z čísla účtu a kódu banky.
 * Číslo účtu může obsahovat předčíslí: "19-2000145399".
 */
export function czAccountToIban(
  accountNumber: string,
  bankCode: string,
): string | null {
  if (!accountNumber || !bankCode) return null;

  let prefix = "0";
  let base = accountNumber.trim();
  if (base.includes("-")) {
    const parts = base.split("-");
    prefix = parts[0];
    base = parts[1];
  }
  prefix = prefix.replace(/\D/g, "");
  base = base.replace(/\D/g, "");
  const bank = bankCode.replace(/\D/g, "");

  if (!base || bank.length !== 4) return null;

  const bban = bank + prefix.padStart(6, "0") + base.padStart(10, "0");
  // Kontrolní číslice: BBAN + "CZ00", písmena → čísla, 98 - (mod 97)
  const check = 98 - mod97(lettersToDigits(bban + "CZ") + "00");
  const iban = "CZ" + check.toString().padStart(2, "0") + bban;
  return iban;
}

/** Naformátuje IBAN po čtveřicích pro čitelné zobrazení. */
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

/** Ověří platnost IBANu kontrolou mod 97. */
export function isValidIban(iban: string): boolean {
  const clean = iban.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(clean)) return false;
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  return mod97(lettersToDigits(rearranged)) === 1;
}

export function bankName(bankCode: string): string | undefined {
  return BANK_CODES[bankCode.replace(/\D/g, "").padStart(4, "0")];
}

export interface SpaydParams {
  iban: string;
  amount?: number;
  currency?: string; // výchozí CZK
  variableSymbol?: string;
  constantSymbol?: string;
  specificSymbol?: string;
  message?: string;
  recipientName?: string;
  dueDate?: string; // ISO datum → převedeno na YYYYMMDD
}

/**
 * Sestaví SPAYD řetězec pro QR platbu.
 * Např.: SPD*1.0*ACC:CZ65...*AM:1234.50*CC:CZK*X-VS:2026001*MSG:...
 */
export function buildSpayd(params: SpaydParams): string {
  const clean = params.iban.replace(/\s/g, "").toUpperCase();
  const fields: string[] = ["SPD", "1.0", `ACC:${clean}`];

  if (params.amount != null && params.amount > 0) {
    fields.push(`AM:${params.amount.toFixed(2)}`);
  }
  fields.push(`CC:${(params.currency || "CZK").toUpperCase()}`);

  const vs = (params.variableSymbol || "").replace(/\D/g, "");
  if (vs) fields.push(`X-VS:${vs}`);
  const ks = (params.constantSymbol || "").replace(/\D/g, "");
  if (ks) fields.push(`X-KS:${ks}`);
  const ss = (params.specificSymbol || "").replace(/\D/g, "");
  if (ss) fields.push(`X-SS:${ss}`);

  if (params.dueDate) {
    const d = params.dueDate.replace(/-/g, "").slice(0, 8);
    if (d.length === 8) fields.push(`DT:${d}`);
  }

  if (params.recipientName) {
    fields.push(`RN:${sanitizeSpaydValue(params.recipientName, 35)}`);
  }
  if (params.message) {
    fields.push(`MSG:${sanitizeSpaydValue(params.message, 60)}`);
  }

  return fields.join("*");
}

/** SPAYD hodnoty: ASCII, bez hvězdiček, omezená délka. */
function sanitizeSpaydValue(value: string, maxLength: number): string {
  return stripDiacritics(value)
    .replace(/\*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Vrátí SPAYD řetězec pro fakturu, pokud lze QR platbu vygenerovat.
 * Podmínka: platný IBAN (z účtu nebo ručně zadaný) a měna CZK.
 */
export function invoiceSpayd(args: {
  accountNumber?: string;
  bankCode?: string;
  ibanOverride?: string;
  amount: number;
  currency: string;
  variableSymbol?: string;
  constantSymbol?: string;
  message?: string;
  recipientName?: string;
  dueDate?: string;
}): string | null {
  if (args.currency && args.currency !== "CZK") return null;

  let iban = args.ibanOverride?.replace(/\s/g, "").toUpperCase();
  if (!iban && args.accountNumber && args.bankCode) {
    iban = czAccountToIban(args.accountNumber, args.bankCode) || undefined;
  }
  if (!iban || !isValidIban(iban)) return null;

  return buildSpayd({
    iban,
    amount: args.amount,
    currency: args.currency || "CZK",
    variableSymbol: args.variableSymbol,
    constantSymbol: args.constantSymbol,
    message: args.message,
    recipientName: args.recipientName,
    dueDate: args.dueDate,
  });
}
