// Import starých PDF faktur — vše běží v prohlížeči (pdf.js).
// Z PDF vytáhneme polohovaný text, `pdf-parse.ts` z něj poskládá údaje
// a uživatel je pak v přehledu potvrdí nebo opraví.

import type { Invoice, InvoiceItem, Settings } from "./types";
import { uid, round2 } from "./invoice";
import { todayIso } from "./format";
import {
  groupIntoLines,
  linesToText,
  parseInvoiceLines,
  emptyParty,
  type ParsedInvoiceData,
  type PdfTextItem,
} from "./pdf-parse";

export type { ParsedItem, ParsedParty } from "./pdf-parse";

export interface ParsedInvoice extends ParsedInvoiceData {
  fileName: string;
  hash: string;
}

interface PdfJsTextItem {
  str?: string;
  width?: number;
  height?: number;
  transform?: number[];
}

/** Načte z PDF všechny úryvky textu i s jejich polohou na stránce. */
export async function extractPdfItems(file: File): Promise<PdfTextItem[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data });
  const pdf = await task.promise;
  const items: PdfTextItem[] = [];

  try {
    for (let page = 1; page <= pdf.numPages; page++) {
      const pageObj = await pdf.getPage(page);
      const content = await pageObj.getTextContent();
      for (const raw of content.items as PdfJsTextItem[]) {
        const str = raw.str ?? "";
        if (!str) continue;
        const transform = raw.transform ?? [];
        items.push({
          str,
          x: transform[4] ?? 0,
          y: transform[5] ?? 0,
          w: raw.width ?? 0,
          h: raw.height ?? Math.abs(transform[3] ?? 8),
          page,
        });
      }
      pageObj.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return items;
}

/** SHA-256 normalizovaného textu — otisk pro idempotentní import. */
export async function hashText(text: string): Promise<string> {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Kompletně zpracuje jeden soubor. */
export async function processPdf(file: File): Promise<ParsedInvoice> {
  const items = await extractPdfItems(file);
  const lines = groupIntoLines(items);
  const text = linesToText(lines);
  if (!text.trim()) {
    throw new Error("PDF neobsahuje čitelný text (nejspíš jde o sken).");
  }
  const hash = await hashText(text);
  return { ...parseInvoiceLines(lines), hash, fileName: file.name };
}

/** Prázdný výsledek pro ruční doplnění, když se z PDF nic nevyčetlo. */
export function emptyParsed(fileName: string, hash: string): ParsedInvoice {
  return {
    fileName,
    hash,
    number: "",
    variableSymbol: "",
    constantSymbol: "",
    orderNumber: "",
    issueDate: "",
    dueDate: "",
    taxDate: "",
    client: emptyParty(),
    supplierName: "",
    items: [],
    subtotal: 0,
    vatTotal: 0,
    total: 0,
    currency: "CZK",
    paymentMethod: "prikazem",
    vatPayer: false,
    found: {
      number: false,
      client: false,
      clientAddress: false,
      issueDate: false,
      total: false,
      items: false,
    },
  };
}

/** Sazba DPH odvozená z celkového základu a daně, když ji u položek neznáme. */
function inferredVatRate(subtotal: number, vatTotal: number): number {
  if (subtotal <= 0 || vatTotal <= 0) return 0;
  const rate = (vatTotal / subtotal) * 100;
  return [21, 15, 12, 10].find((r) => Math.abs(r - rate) < 1.5) ?? 0;
}

/** Položky faktury z naparsovaných dat — buď z tabulky, nebo jedna souhrnná. */
function invoiceItems(p: ParsedInvoice, vatPayer: boolean): InvoiceItem[] {
  if (p.items.length) {
    return p.items.map((it) => ({
      id: uid(),
      description: it.description || "Položka",
      quantity: it.quantity || 1,
      unit: it.unit || "ks",
      unitPrice: round2(it.unitPrice || 0),
      vatRate: vatPayer ? it.vatRate || 0 : 0,
      discount: 0,
    }));
  }

  const rate = vatPayer ? inferredVatRate(p.subtotal, p.vatTotal) : 0;
  // Bez rozpisu položek fakturujeme jednu souhrnnou částku. U plátce DPH
  // musí být základ bez daně, aby součet vyšel na původní částku k úhradě.
  const base = p.subtotal || (rate ? p.total / (1 + rate / 100) : p.total);
  return [
    {
      id: uid(),
      description: "Fakturovaná částka (import z PDF)",
      quantity: 1,
      unit: "ks",
      unitPrice: round2(base),
      vatRate: rate,
      discount: 0,
    },
  ];
}

/** Vytvoří fakturu z naparsovaných dat (importovaná, jako zaplacená). */
export function parsedToInvoice(p: ParsedInvoice, settings: Settings): Invoice {
  const issue = p.issueDate || todayIso();
  const now = new Date().toISOString();
  const vatPayer = p.vatPayer;
  const number = p.number || p.variableSymbol || `IMPORT-${p.hash.slice(0, 6)}`;

  return {
    id: uid(),
    number,
    variableSymbol: p.variableSymbol || number.replace(/\D/g, "").slice(0, 10),
    constantSymbol: p.constantSymbol || undefined,
    orderNumber: p.orderNumber || undefined,
    supplier: structuredClone(settings.supplier),
    client: {
      name: p.client.name || "Neznámý odběratel",
      street: p.client.street,
      city: p.client.city,
      zip: p.client.zip,
      ico: p.client.ico || undefined,
      dic: p.client.dic || undefined,
      email: p.client.email || undefined,
      phone: p.client.phone || undefined,
    },
    issueDate: issue,
    dueDate: p.dueDate || issue,
    taxDate: p.taxDate || issue,
    paymentMethod: p.paymentMethod,
    items: invoiceItems(p, vatPayer),
    rounding: "none",
    currency: p.currency || "CZK",
    note: `Importováno ze souboru ${p.fileName}.`,
    qrPayment: false,
    vatPayer,
    status: "paid",
    createdAt: now,
    updatedAt: now,
    imported: true,
    sourceHash: p.hash,
    sourceFileName: p.fileName,
  };
}
