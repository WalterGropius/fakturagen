import test from "node:test";
import assert from "node:assert/strict";

import {
  invoiceTotals,
  invoiceGrandTotal,
  buildInvoiceNumber,
  variableSymbolFromNumber,
  round2,
} from "@/lib/invoice";
import {
  czAccountToIban,
  isValidIban,
  formatIban,
  buildSpayd,
  invoiceSpayd,
  stripDiacritics,
  bankName,
} from "@/lib/payment";
import { formatDate, addDays, czPlural, isOverdue, monthKey } from "@/lib/format";
import { parsedToInvoice, type ParsedInvoice } from "@/lib/pdf-import";
import { groupIntoLines, parseInvoiceLines, emptyParty } from "@/lib/pdf-parse";
import type { Settings } from "@/lib/types";
import { DEFAULT_DOCUMENT_APPEARANCE } from "@/lib/constants";
import { layout, TWO_COLUMN_INVOICE, SWAPPED_VAT_INVOICE } from "./helpers.ts";

const SETTINGS: Settings = {
  supplier: {
    name: "Pavel Müller",
    street: "Muchova 2889/1",
    city: "Ústí nad Labem",
    zip: "400 11",
    country: "Česká republika",
    ico: "86708121",
    vatPayer: false,
    bank: { accountNumber: "2205903851", bankCode: "0210" },
  },
  appearance: {
    theme: "system",
    accent: "terracotta",
    font: "inter",
    document: DEFAULT_DOCUMENT_APPEARANCE,
  },
  invoice: {
    dueDays: 14,
    paymentMethod: "prikazem",
    currency: "CZK",
    rounding: "none",
    qrPayment: true,
    qrMessage: "Úhrada faktury",
  },
  numbering: { prefix: "", nextNumber: 1, pad: 3, includeYear: true },
  onboarded: true,
};

// --- Výpočty faktury -------------------------------------------------------

test("invoiceTotals počítá DPH po sazbách", () => {
  const totals = invoiceTotals(
    [
      { id: "a", description: "", quantity: 2, unit: "ks", unitPrice: 1000, vatRate: 21, discount: 0 },
      { id: "b", description: "", quantity: 1, unit: "ks", unitPrice: 500, vatRate: 12, discount: 0 },
    ],
    { vatPayer: true, rounding: "none" },
  );
  assert.equal(totals.subtotal, 2500);
  assert.equal(totals.vatTotal, 480); // 420 + 60
  assert.equal(totals.total, 2980);
  assert.equal(totals.breakdown.length, 2);
  assert.equal(totals.breakdown[0].rate, 21);
});

test("neplátce DPH počítá bez daně, i když má položka sazbu", () => {
  const totals = invoiceTotals(
    [{ id: "a", description: "", quantity: 1, unit: "ks", unitPrice: 1000, vatRate: 21, discount: 0 }],
    { vatPayer: false, rounding: "none" },
  );
  assert.equal(totals.vatTotal, 0);
  assert.equal(totals.total, 1000);
});

test("sleva se počítá ze základu", () => {
  const totals = invoiceTotals(
    [{ id: "a", description: "", quantity: 2, unit: "ks", unitPrice: 1000, vatRate: 0, discount: 25 }],
    { vatPayer: true, rounding: "none" },
  );
  assert.equal(totals.subtotal, 1500);
});

test("zaokrouhlení hlásí i vlastní rozdíl", () => {
  const items = [
    { id: "a", description: "", quantity: 1, unit: "ks", unitPrice: 1000.4, vatRate: 0, discount: 0 },
  ];
  assert.equal(invoiceTotals(items, { vatPayer: false, rounding: "math" }).total, 1000);
  assert.equal(invoiceTotals(items, { vatPayer: false, rounding: "up" }).total, 1001);
  assert.equal(invoiceTotals(items, { vatPayer: false, rounding: "down" }).total, 1000);
  const up = invoiceTotals(items, { vatPayer: false, rounding: "up" });
  assert.equal(up.rounding, round2(1001 - 1000.4));
  assert.equal(up.totalBeforeRounding + up.rounding, up.total);
});

test("číslo faktury a variabilní symbol", () => {
  assert.equal(
    buildInvoiceNumber({ prefix: "", nextNumber: 1, pad: 3, includeYear: true }, 2026),
    "2026001",
  );
  assert.equal(
    buildInvoiceNumber({ prefix: "FA", nextNumber: 42, pad: 4, includeYear: false }, 2026),
    "FA0042",
  );
  assert.equal(variableSymbolFromNumber("FA2026/001"), "2026001");
  assert.equal(variableSymbolFromNumber("123456789012345"), "1234567890");
});

// --- IBAN a QR platba ------------------------------------------------------

test("český účet se převede na platný IBAN", () => {
  const iban = czAccountToIban("2000145399", "0800");
  assert.ok(iban);
  assert.equal(iban.slice(0, 2), "CZ");
  assert.equal(iban.length, 24);
  assert.ok(isValidIban(iban), `${iban} musí projít kontrolou mod 97`);
});

test("IBAN zvládne i předčíslí účtu", () => {
  const iban = czAccountToIban("19-2000145399", "0800");
  assert.ok(iban && isValidIban(iban));
  assert.ok(iban.includes("000019"), "předčíslí patří do IBANu");
});

test("neplatné vstupy IBAN nevyrobí", () => {
  assert.equal(czAccountToIban("", "0800"), null);
  assert.equal(czAccountToIban("2000145399", "80"), null);
  assert.equal(isValidIban("CZ0000000000000000000000"), false);
});

test("formatIban seskupí po čtyřech", () => {
  assert.equal(formatIban("CZ6508000000192000145399"), "CZ65 0800 0000 1920 0014 5399");
});

test("SPAYD obsahuje účet, částku a symboly bez diakritiky", () => {
  const spayd = buildSpayd({
    iban: "CZ6508000000192000145399",
    amount: 14100,
    currency: "CZK",
    variableSymbol: "2026001",
    constantSymbol: "0308",
    message: "Úhrada faktury č. 2026001",
    recipientName: "Pavel Müller",
    dueDate: "2026-08-21",
  });
  assert.ok(spayd.startsWith("SPD*1.0*ACC:CZ6508000000192000145399"));
  assert.ok(spayd.includes("*AM:14100.00*"));
  assert.ok(spayd.includes("*CC:CZK*"));
  assert.ok(spayd.includes("*X-VS:2026001*"));
  assert.ok(spayd.includes("*X-KS:0308*"), "vedoucí nula konstantního symbolu musí zůstat");
  assert.ok(spayd.includes("*DT:20260821*"));
  assert.ok(spayd.includes("RN:Pavel Muller"), "jméno musí být bez diakritiky");
  assert.ok(!spayd.includes("Ú"), "SPAYD musí být ASCII");
});

test("QR platba se negeneruje pro cizí měnu ani bez účtu", () => {
  const args = {
    accountNumber: "2000145399",
    bankCode: "0800",
    amount: 100,
    variableSymbol: "1",
  };
  assert.ok(invoiceSpayd({ ...args, currency: "CZK" }));
  assert.equal(invoiceSpayd({ ...args, currency: "EUR" }), null);
  assert.equal(
    invoiceSpayd({ accountNumber: "", bankCode: "", amount: 100, currency: "CZK" }),
    null,
  );
});

test("stripDiacritics a bankName", () => {
  assert.equal(stripDiacritics("Příliš žluťoučký kůň"), "Prilis zlutoucky kun");
  assert.equal(bankName("0800"), "Česká spořitelna");
  assert.equal(bankName("9999"), undefined);
});

// --- Formátování -----------------------------------------------------------

test("české formátování dat a skloňování", () => {
  assert.equal(formatDate("2026-08-07"), "07.08.2026");
  assert.equal(formatDate(""), "");
  assert.equal(formatDate("nesmysl"), "");
  assert.equal(addDays("2026-08-07", 14), "2026-08-21");
  assert.equal(monthKey("2026-08-07"), "2026-08");
  assert.equal(czPlural(1, "faktura", "faktury", "faktur"), "faktura");
  assert.equal(czPlural(3, "faktura", "faktury", "faktur"), "faktury");
  assert.equal(czPlural(9, "faktura", "faktury", "faktur"), "faktur");
});

test("po splatnosti je jen vystavená faktura", () => {
  assert.equal(isOverdue("2000-01-01", "issued"), true);
  assert.equal(isOverdue("2000-01-01", "paid"), false);
  assert.equal(isOverdue("2000-01-01", "draft"), false);
  assert.equal(isOverdue("2999-01-01", "issued"), false);
});

// --- Import: naparsovaná data → faktura ------------------------------------

function parsedFrom(cells: typeof TWO_COLUMN_INVOICE): ParsedInvoice {
  return {
    ...parseInvoiceLines(groupIntoLines(layout(cells))),
    hash: "abc123",
    fileName: "faktura.pdf",
  };
}

test("import zachová odběratele včetně adresy", () => {
  const invoice = parsedToInvoice(parsedFrom(TWO_COLUMN_INVOICE), SETTINGS);
  assert.equal(invoice.client.name, "PECUD výrobní a obchodní družstvo");
  assert.equal(invoice.client.street, "Zemská 535");
  assert.equal(invoice.client.zip, "417 12");
  assert.equal(invoice.client.city, "Probošťov");
  assert.equal(invoice.client.ico, "00526814");
  assert.equal(invoice.number, "2026001");
  assert.equal(invoice.issueDate, "2026-08-07");
  assert.equal(invoice.dueDate, "2026-08-21");
  assert.equal(invoice.imported, true);
  assert.equal(invoice.status, "paid");
});

test("součet importované faktury sedí na původní částku", () => {
  for (const cells of [TWO_COLUMN_INVOICE, SWAPPED_VAT_INVOICE]) {
    const parsed = parsedFrom(cells);
    const invoice = parsedToInvoice(parsed, SETTINGS);
    assert.equal(
      invoiceGrandTotal(invoice),
      parsed.total,
      `celková částka musí odpovídat (${parsed.number})`,
    );
  }
});

test("bez rozpisu položek vznikne souhrnná položka se správným základem", () => {
  const base: ParsedInvoice = {
    hash: "h",
    fileName: "f.pdf",
    number: "1",
    variableSymbol: "1",
    constantSymbol: "",
    orderNumber: "",
    issueDate: "2026-01-10",
    dueDate: "2026-01-24",
    taxDate: "2026-01-10",
    client: { ...emptyParty(), name: "Klient s.r.o." },
    supplierName: "",
    items: [],
    subtotal: 1000,
    vatTotal: 210,
    total: 1210,
    currency: "CZK",
    paymentMethod: "prikazem",
    vatPayer: true,
    found: {
      number: true,
      client: true,
      clientAddress: false,
      issueDate: true,
      total: true,
      items: false,
    },
  };

  const withVat = parsedToInvoice(base, SETTINGS);
  assert.equal(withVat.items.length, 1);
  assert.equal(withVat.items[0].unitPrice, 1000);
  assert.equal(withVat.items[0].vatRate, 21);
  assert.equal(invoiceGrandTotal(withVat), 1210);

  const noVat = parsedToInvoice(
    { ...base, vatPayer: false, subtotal: 0, vatTotal: 0, total: 5000 },
    SETTINGS,
  );
  assert.equal(noVat.items[0].unitPrice, 5000);
  assert.equal(noVat.items[0].vatRate, 0);
  assert.equal(invoiceGrandTotal(noVat), 5000);
});

test("faktura bez čísla dostane náhradní z otisku", () => {
  const invoice = parsedToInvoice(
    {
      ...parsedFrom([]),
      hash: "deadbeefcafe",
      fileName: "sken.pdf",
    },
    SETTINGS,
  );
  assert.equal(invoice.number, "IMPORT-deadbe");
  assert.equal(invoice.client.name, "Neznámý odběratel");
});
