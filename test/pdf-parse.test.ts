import test from "node:test";
import assert from "node:assert/strict";

import {
  groupIntoLines,
  parseAmount,
  parseCzDate,
  parseParty,
  parseInvoiceLines,
} from "@/lib/pdf-parse";
import { layout, TWO_COLUMN_INVOICE, SWAPPED_VAT_INVOICE } from "./helpers.ts";

test("parseAmount rozumí českým i anglickým formátům", () => {
  assert.equal(parseAmount("12 345,50 Kč"), 12345.5);
  assert.equal(parseAmount("12 345,50 Kč"), 12345.5);
  assert.equal(parseAmount("1.234.567,89"), 1234567.89);
  assert.equal(parseAmount("12,345.50"), 12345.5);
  assert.equal(parseAmount("1 500"), 1500);
  assert.equal(parseAmount("900,00"), 900);
  assert.equal(parseAmount("-250,00"), -250);
  assert.equal(parseAmount(""), 0);
  assert.equal(parseAmount("bez čísla"), 0);
});

test("parseCzDate zvládá formáty a odmítá nesmysly", () => {
  assert.equal(parseCzDate("07.08.2026"), "2026-08-07");
  assert.equal(parseCzDate("7. 8. 2026"), "2026-08-07");
  assert.equal(parseCzDate("7/8/2026"), "2026-08-07");
  assert.equal(parseCzDate("2026-08-07"), "2026-08-07");
  assert.equal(parseCzDate("31.02.2026"), "");
  assert.equal(parseCzDate("45.13.2026"), "");
  assert.equal(parseCzDate("bez data"), "");
});

test("groupIntoLines slepí sloupce do jednoho řádku, ale úryvky zůstanou", () => {
  const lines = groupIntoLines(layout(TWO_COLUMN_INVOICE));
  const header = lines.find((l) => l.text.includes("ODBĚRATEL"));
  assert.ok(header, "řádek s popisky stran musí existovat");
  assert.equal(header.text, "DODAVATEL ODBĚRATEL");
  assert.equal(header.items.length, 2);
  assert.equal(header.items[1].x, 330);
});

test("parseParty poskládá firmu, adresu, IČO i DIČ", () => {
  const party = parseParty([
    "PECUD výrobní a obchodní družstvo",
    "Zemská 535",
    "417 12 Probošťov",
    "IČO: 00526814",
    "DIČ: CZ00526814",
  ]);
  assert.equal(party.name, "PECUD výrobní a obchodní družstvo");
  assert.equal(party.street, "Zemská 535");
  assert.equal(party.zip, "417 12");
  assert.equal(party.city, "Probošťov");
  assert.equal(party.ico, "00526814");
  assert.equal(party.dic, "CZ00526814");
});

test("parseParty rozumí i pořadí „město, PSČ“", () => {
  const party = parseParty(["Alfa s.r.o.", "Dlouhá 12", "Praha 1, 110 00"]);
  assert.equal(party.city, "Praha 1");
  assert.equal(party.zip, "110 00");
});

test("odběratel z pravého sloupce se nesmí smíchat s dodavatelem", () => {
  const parsed = parseInvoiceLines(groupIntoLines(layout(TWO_COLUMN_INVOICE)));

  assert.equal(parsed.client.name, "PECUD výrobní a obchodní družstvo");
  assert.equal(parsed.client.street, "Zemská 535");
  assert.equal(parsed.client.zip, "417 12");
  assert.equal(parsed.client.city, "Probošťov");
  assert.equal(parsed.client.ico, "00526814");
  assert.equal(parsed.client.dic, "CZ00526814");
  assert.equal(parsed.supplierName, "Pavel Müller");
});

test("dvousloupcová faktura: čísla, data a částky", () => {
  const parsed = parseInvoiceLines(groupIntoLines(layout(TWO_COLUMN_INVOICE)));

  assert.equal(parsed.number, "2026001");
  assert.equal(parsed.variableSymbol, "2026001");
  assert.equal(parsed.constantSymbol, "0308");
  assert.equal(parsed.issueDate, "2026-08-07");
  assert.equal(parsed.dueDate, "2026-08-21");
  assert.equal(parsed.taxDate, "2026-08-07");
  assert.equal(parsed.total, 14100);
  assert.equal(parsed.currency, "CZK");
  assert.equal(parsed.paymentMethod, "prikazem");
  assert.equal(parsed.vatPayer, false);
});

test("dvousloupcová faktura: položky včetně množství a jednotek", () => {
  const parsed = parseInvoiceLines(groupIntoLines(layout(TWO_COLUMN_INVOICE)));

  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items[0].description, "Konzultace a řešení krizových situací");
  assert.equal(parsed.items[0].quantity, 8);
  assert.equal(parsed.items[0].unit, "hod");
  assert.equal(parsed.items[0].unitPrice, 1200);
  assert.equal(parsed.items[0].total, 9600);
  assert.equal(parsed.items[1].description, "Poradenská činnost v IS ComSTAR");
  assert.equal(parsed.items[1].total, 4500);
  // Součet položek musí sedět na částku k úhradě.
  assert.equal(
    parsed.items.reduce((sum, i) => sum + i.total, 0),
    parsed.total,
  );
});

test("prohozené sloupce a plátce DPH", () => {
  const parsed = parseInvoiceLines(groupIntoLines(layout(SWAPPED_VAT_INVOICE)));

  assert.equal(parsed.client.name, "Alfa Systems s.r.o.");
  assert.equal(parsed.client.city, "Praha 1");
  assert.equal(parsed.client.zip, "110 00");
  assert.equal(parsed.client.ico, "27604977");
  assert.equal(parsed.supplierName, "Studio Nova s.r.o.");

  assert.equal(parsed.number, "2026/0042");
  assert.equal(parsed.issueDate, "2026-09-03");
  assert.equal(parsed.dueDate, "2026-09-17");
  assert.equal(parsed.paymentMethod, "hotove");

  assert.equal(parsed.subtotal, 18600);
  assert.equal(parsed.vatTotal, 3906);
  assert.equal(parsed.total, 22506);
  assert.equal(parsed.vatPayer, true);
});

test("víceřádkový popis položky se připojí k předchozí", () => {
  const parsed = parseInvoiceLines(groupIntoLines(layout(SWAPPED_VAT_INVOICE)));

  assert.equal(parsed.items.length, 2);
  assert.equal(
    parsed.items[0].description,
    "Vývoj webové aplikace — včetně nasazení a školení",
  );
  assert.equal(parsed.items[0].quantity, 10);
  assert.equal(parsed.items[0].unit, "hod");
  assert.equal(parsed.items[0].vatRate, 21);
  assert.equal(parsed.items[1].description, "Grafické práce");
  assert.equal(parsed.items[1].unitPrice, 900);
});

test("prázdný dokument nespadne a nic si nevymyslí", () => {
  const parsed = parseInvoiceLines(groupIntoLines([]));
  assert.equal(parsed.number, "");
  assert.equal(parsed.client.name, "");
  assert.equal(parsed.total, 0);
  assert.equal(parsed.found.client, false);
  assert.equal(parsed.found.total, false);
});
