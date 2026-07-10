// Lokální čtení starých PDF faktur — vše běží v prohlížeči (pdf.js).
// Z textu se heuristikou vytáhnou hlavní údaje; uživatel je pak potvrdí.

import type { Invoice, Settings } from "./types";
import { uid, variableSymbolFromNumber } from "./invoice";
import { todayIso } from "./format";

export interface ParsedInvoice {
  fileName: string;
  hash: string;
  number: string;
  variableSymbol: string;
  issueDate: string;
  dueDate: string;
  taxDate: string;
  clientName: string;
  clientIco: string;
  total: number;
  currency: string;
}

/** Načte text z PDF po řádcích (rekonstrukce podle pozice). */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const lines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items) {
      // @ts-expect-error pdf.js typuje items volně
      const str: string = item.str ?? "";
      if (!str.trim()) continue;
      // @ts-expect-error transform je [a,b,c,d,e,f]
      const y = Math.round((item.transform?.[5] ?? 0) / 2) * 2;
      // @ts-expect-error
      const x = item.transform?.[4] ?? 0;
      const arr = rows.get(y) ?? [];
      arr.push({ x, s: str });
      rows.set(y, arr);
    }
    const sortedY = [...rows.keys()].sort((a, b) => b - a);
    for (const y of sortedY) {
      const row = rows.get(y)!.sort((a, b) => a.x - b.x);
      lines.push(row.map((r) => r.s).join(" "));
    }
  }
  return lines.join("\n");
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

function parseCzDate(raw: string): string {
  const m = raw.match(/([0-3]?\d)[.\s]+([01]?\d)[.\s]+(\d{4})/);
  if (!m) return "";
  const [, d, mo, y] = m;
  const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return Number.isNaN(new Date(iso).getTime()) ? "" : iso;
}

function parseAmount(raw: string): number {
  const cleaned = raw
    .replace(/[^\d\s.,]/g, "")
    .replace(/\s| /g, "")
    .replace(/\.(?=\d{3}\b)/g, "") // tisícové tečky
    .replace(",", ".");
  const val = parseFloat(cleaned);
  return Number.isFinite(val) ? val : 0;
}

function firstMatch(text: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return "";
}

/** Heuristická extrakce údajů z textu faktury. */
export function parseInvoiceText(text: string): Omit<ParsedInvoice, "hash" | "fileName"> {
  const lines = text.split("\n");

  const variableSymbol = firstMatch(text, [
    /variabiln[íi]\s*symbol[:\s]*([0-9]{1,10})/i,
    /\bVS[:\s]*([0-9]{4,10})/i,
  ]).replace(/\D/g, "");

  let number = firstMatch(text, [
    /faktura[\s–-]*(?:da[ňn]ov[ýy]\s+doklad)?\s*(?:č[íislo.]*|number)\s*[:.]?\s*([A-Za-z0-9/-]{3,})/i,
    /(?:č[íislo]*\.?\s*(?:faktury|dokladu))\s*[:.]?\s*([A-Za-z0-9/-]{3,})/i,
    /da[ňn]ov[ýy]\s+doklad\s*(?:č\.?)?\s*[:.]?\s*([A-Za-z0-9/-]{4,})/i,
  ]);
  if (!number) number = variableSymbol;

  const issueDate = parseCzDate(
    firstMatch(text, [/(?:datum\s+vystaven[íi]|vystaveno|vystavení)[:\s]*([0-3]?\d[.\s]+[01]?\d[.\s]+\d{4})/i]),
  );
  const dueDate = parseCzDate(
    firstMatch(text, [/(?:datum\s+splatnosti|splatnost)[:\s]*([0-3]?\d[.\s]+[01]?\d[.\s]+\d{4})/i]),
  );
  const taxDate = parseCzDate(
    firstMatch(text, [
      /(?:datum\s+uskute[čc]n[ěe]n[íi][^0-9]*|duzp|zdaniteln[éě]ho\s+pln[ěe]n[íi])[:\s]*([0-3]?\d[.\s]+[01]?\d[.\s]+\d{4})/i,
    ]),
  );

  // Odběratel — jméno na řádku(ích) za slovem „Odběratel"
  let clientName = "";
  const odbIdx = lines.findIndex((l) => /odb[ěe]ratel/i.test(l));
  if (odbIdx >= 0) {
    const after = lines[odbIdx].replace(/.*odb[ěe]ratel[:\s]*/i, "").trim();
    clientName = after || (lines[odbIdx + 1] || "").trim();
  }
  clientName = clientName.replace(/i[čc]o.*$/i, "").trim().slice(0, 80);

  // IČO odběratele — poslední 8místné číslo poblíž „Odběratel", jinak druhé v pořadí
  const icos = [...text.matchAll(/i[čc]o?\s*[:.]?\s*(\d{8})/gi)].map((m) => m[1]);
  const clientIco = icos.length > 1 ? icos[1] : icos[0] || "";

  // Celková částka — poslední výskyt „k úhradě" / „celkem s DPH"
  const totalMatches = [
    ...text.matchAll(
      /(?:celkem\s+k\s+[úu]hrad[ěe]|k\s+[úu]hrad[ěe]|celkem\s+s\s+dph|celkem\s+v[čc]etn[ěe]\s+dph)[:\s]*([\d\s., ]+)/gi,
    ),
  ];
  let total = 0;
  if (totalMatches.length) {
    total = parseAmount(totalMatches[totalMatches.length - 1][1]);
  }
  if (!total) {
    // Nouzově největší částka v dokumentu
    const nums = [...text.matchAll(/(\d[\d\s ]{2,}[.,]\d{2})/g)].map((m) =>
      parseAmount(m[1]),
    );
    total = nums.length ? Math.max(...nums) : 0;
  }

  const currency = /eur|€/i.test(text) && !/kč|czk/i.test(text) ? "EUR" : "CZK";

  return {
    number: number || "",
    variableSymbol: variableSymbol || variableSymbolFromNumber(number || ""),
    issueDate,
    dueDate,
    taxDate,
    clientName,
    clientIco,
    total,
    currency,
  };
}

/** Kompletně zpracuje jeden soubor. */
export async function processPdf(file: File): Promise<ParsedInvoice> {
  const text = await extractPdfText(file);
  const hash = await hashText(text);
  const parsed = parseInvoiceText(text);
  return { ...parsed, hash, fileName: file.name };
}

/** Vytvoří fakturu z naparsovaných dat (importovaná, jako zaplacená). */
export function parsedToInvoice(
  p: ParsedInvoice,
  settings: Settings,
): Invoice {
  const issue = p.issueDate || todayIso();
  const now = new Date().toISOString();
  return {
    id: uid(),
    number: p.number || p.variableSymbol || "IMPORT",
    variableSymbol: p.variableSymbol,
    supplier: structuredClone(settings.supplier),
    client: {
      name: p.clientName || "Neznámý odběratel",
      street: "",
      city: "",
      zip: "",
      ico: p.clientIco || "",
    },
    issueDate: issue,
    dueDate: p.dueDate || issue,
    taxDate: p.taxDate || issue,
    paymentMethod: "prikazem",
    items: [
      {
        id: uid(),
        description: "Fakturováno (import z PDF)",
        quantity: 1,
        unit: "ks",
        unitPrice: p.total,
        vatRate: 0,
        discount: 0,
      },
    ],
    rounding: "none",
    currency: p.currency || "CZK",
    note: `Importováno ze souboru ${p.fileName}.`,
    qrPayment: false,
    vatPayer: false,
    status: "paid",
    createdAt: now,
    updatedAt: now,
    imported: true,
    sourceHash: p.hash,
    sourceFileName: p.fileName,
  };
}
