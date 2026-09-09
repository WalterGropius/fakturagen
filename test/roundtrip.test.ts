// Test kolečka export → import na skutečném PDF.
//
// Fixtury jsou zaznamenaný výstup pdf.js nad fakturou, kterou Fakturka sama
// vytiskla. Přesně tady dřív import selhával: nadpisy jsou v PDF prostrkané
// („O D BĚR AT E L"), popisky platebních údajů stojí nad hodnotami a odběratel
// je ve druhém sloupci vedle dodavatele.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  groupIntoLines,
  parseInvoiceLines,
  type PdfTextItem,
} from "@/lib/pdf-parse";

function fixture(name: string) {
  const path = new URL(`./fixtures/${name}.json`, import.meta.url);
  const items = JSON.parse(readFileSync(path, "utf8")) as PdfTextItem[];
  return parseInvoiceLines(groupIntoLines(items));
}

test("vlastní PDF (neplátce DPH) se naimportuje kompletní", () => {
  const parsed = fixture("fakturka-neplatce");

  assert.equal(parsed.number, "2026001");
  assert.equal(parsed.variableSymbol, "2026001");
  assert.equal(parsed.constantSymbol, "0308");
  assert.equal(parsed.issueDate, "2026-08-07");
  assert.equal(parsed.dueDate, "2026-08-21");
  assert.equal(parsed.taxDate, "2026-08-07");
  assert.equal(parsed.paymentMethod, "prikazem");
  assert.equal(parsed.currency, "CZK");
  assert.equal(parsed.vatPayer, false);
  assert.equal(parsed.total, 14100);
});

test("odběratel se z druhého sloupce přenese celý", () => {
  const parsed = fixture("fakturka-neplatce");

  assert.equal(parsed.client.name, "PECUD výrobní a obchodní družstvo");
  assert.equal(parsed.client.street, "Zemská 535");
  assert.equal(parsed.client.zip, "417 12");
  assert.equal(parsed.client.city, "Probošťov");
  assert.equal(parsed.client.ico, "00526814");
  assert.equal(parsed.client.dic, "CZ00526814");
  // Dodavatel se do odběratele nesmí propsat.
  assert.equal(parsed.supplierName, "Pavel Müller");
  assert.ok(!parsed.client.name.includes("Pavel"));
  assert.ok(!parsed.client.street.includes("Muchova"));
});

test("položky z vlastního PDF včetně víceřádkového popisu", () => {
  const parsed = fixture("fakturka-neplatce");

  assert.equal(parsed.items.length, 2);
  assert.equal(
    parsed.items[0].description,
    "Konzultace a řešení krizových situací po telefonu — srpen 2026",
  );
  assert.equal(parsed.items[0].quantity, 8);
  assert.equal(parsed.items[0].unit, "hod");
  assert.equal(parsed.items[0].unitPrice, 1200);
  assert.equal(parsed.items[0].total, 9600);

  // Druhá položka se v PDF láme na dva řádky ("… v IS" / "ComSTAR").
  assert.equal(
    parsed.items[1].description,
    "Poradenská činnost při implementaci požadovaných změn v IS ComSTAR",
  );
  assert.equal(parsed.items[1].quantity, 1);
  assert.equal(parsed.items[1].total, 4500);

  assert.equal(
    parsed.items.reduce((sum, i) => sum + i.total, 0),
    parsed.total,
  );
});

test("vlastní PDF plátce DPH: sazby, základ i daň", () => {
  const parsed = fixture("fakturka-platce-dph");

  assert.equal(parsed.vatPayer, true);
  assert.equal(parsed.client.name, "PECUD výrobní a obchodní družstvo");
  assert.equal(parsed.items.length, 2);
  assert.ok(
    parsed.items.every((i) => i.vatRate === 21),
    "obě položky mají sazbu 21 %",
  );
  assert.equal(parsed.subtotal, 14100);
  assert.equal(parsed.vatTotal, 2961);
  assert.equal(parsed.total, 17061);
});

test("z vlastního PDF se pozná, co se našlo", () => {
  const parsed = fixture("fakturka-neplatce");
  assert.deepEqual(parsed.found, {
    number: true,
    client: true,
    clientAddress: true,
    issueDate: true,
    total: true,
    items: true,
  });
});
