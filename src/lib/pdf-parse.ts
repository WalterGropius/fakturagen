// Heuristická analýza textu z PDF faktur.
//
// Modul je čistě funkční — nezná pdf.js ani DOM, takže se dá testovat
// samostatně. `pdf-import.ts` z PDF vytáhne polohovaný text a předá ho sem.
//
// Klíčová myšlenka: české faktury jsou dvousloupcové (dodavatel vlevo,
// odběratel vpravo). Kdybychom text jen slepili po řádcích, oba bloky by
// se slily dohromady a odběratel by se ztratil. Proto si u každého úryvku
// držíme souřadnice a bloky čteme po svislých pruzích (sloupcích).

import type { PaymentMethod } from "./types";

/** Jeden úryvek textu z PDF i se svou polohou na stránce. */
export interface PdfTextItem {
  str: string;
  x: number; // levý okraj
  y: number; // účaří (v PDF roste směrem nahoru)
  w: number; // šířka úryvku
  h: number; // výška písma
  page: number;
}

/** Úryvky slepené do jednoho řádku. */
export interface PdfTextLine {
  page: number;
  y: number;
  items: PdfTextItem[];
  text: string;
  /** Pro každý znak `text` index úryvku, ze kterého pochází. */
  owners: number[];
}

export interface ParsedParty {
  name: string;
  street: string;
  city: string;
  zip: string;
  ico: string;
  dic: string;
  email: string;
  phone: string;
}

export interface ParsedItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  total: number;
}

export interface ParsedInvoiceData {
  number: string;
  variableSymbol: string;
  constantSymbol: string;
  orderNumber: string;
  issueDate: string;
  dueDate: string;
  taxDate: string;
  client: ParsedParty;
  supplierName: string;
  items: ParsedItem[];
  subtotal: number;
  vatTotal: number;
  total: number;
  currency: string;
  paymentMethod: PaymentMethod;
  vatPayer: boolean;
  /** Co se povedlo najít — podle toho umíme upozornit na dohledání ručně. */
  found: {
    number: boolean;
    client: boolean;
    clientAddress: boolean;
    issueDate: boolean;
    total: boolean;
    items: boolean;
  };
}

export function emptyParty(): ParsedParty {
  return { name: "", street: "", city: "", zip: "", ico: "", dic: "", email: "", phone: "" };
}

// ---------------------------------------------------------------------------
// Skládání řádků
// ---------------------------------------------------------------------------

/** Slepí úryvky do řádku; mezeru vloží jen tam, kde je v PDF skutečná mezera. */
function joinItems(items: PdfTextItem[]): { text: string; owners: number[] } {
  let text = "";
  const owners: number[] = [];
  items.forEach((it, index) => {
    if (index > 0) {
      const prev = items[index - 1];
      const gap = it.x - (prev.x + prev.w);
      const threshold = Math.max(0.6, (it.h || 8) * 0.16);
      const already = /\s$/.test(text) || /^\s/.test(it.str);
      if (!already && gap > threshold) {
        text += " ";
        owners.push(index);
      }
    }
    for (let i = 0; i < it.str.length; i++) owners.push(index);
    text += it.str;
  });
  // Zredukuj vícenásobné mezery, ale nech si mapu na úryvky.
  const outText: string[] = [];
  const outOwners: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const isSpace = /\s/.test(text[i]);
    if (isSpace && (outText.length === 0 || /\s/.test(outText[outText.length - 1]))) {
      continue;
    }
    outText.push(isSpace ? " " : text[i]);
    outOwners.push(owners[i]);
  }
  while (outText.length && outText[outText.length - 1] === " ") {
    outText.pop();
    outOwners.pop();
  }
  return { text: outText.join(""), owners: outOwners };
}

/**
 * Seskupí úryvky do řádků podle stránky a účaří.
 * Tolerance je v bodech — úryvky do 3 bodů od sebe patří na stejný řádek.
 */
export function groupIntoLines(items: PdfTextItem[], tolerance = 2): PdfTextLine[] {
  const byPage = new Map<number, PdfTextItem[]>();
  for (const it of items) {
    // Mezery si necháváme — pdf.js je posílá jako samostatné úryvky
    // a bez nich by se slova slepila dohromady.
    if (!it.str) continue;
    const arr = byPage.get(it.page) ?? [];
    arr.push(it);
    byPage.set(it.page, arr);
  }

  const lines: PdfTextLine[] = [];
  for (const page of [...byPage.keys()].sort((a, b) => a - b)) {
    const pageItems = byPage
      .get(page)!
      .sort((a, b) => b.y - a.y || a.x - b.x);

    let bucket: PdfTextItem[] = [];
    let anchorY = 0;
    const flush = () => {
      if (!bucket.length) return;
      const sorted = [...bucket].sort((a, b) => a.x - b.x);
      const { text, owners } = joinItems(sorted);
      if (text) lines.push({ page, y: anchorY, items: sorted, text, owners });
      bucket = [];
    };

    for (const it of pageItems) {
      if (!bucket.length) {
        anchorY = it.y;
        bucket.push(it);
      } else if (Math.abs(it.y - anchorY) <= tolerance) {
        bucket.push(it);
      } else {
        flush();
        anchorY = it.y;
        bucket.push(it);
      }
    }
    flush();
  }
  return lines;
}

/** Celý dokument jako prostý text (pro otisk a hrubé hledání). */
export function linesToText(lines: PdfTextLine[]): string {
  return lines.map((l) => l.text).join("\n");
}

// ---------------------------------------------------------------------------
// Základní parsování hodnot
// ---------------------------------------------------------------------------

/** "07.08.2026" / "7. 8. 2026" / "2026-08-07" → ISO datum, jinak "". */
export function parseCzDate(raw: string): string {
  const cleaned = (raw || "").trim();
  const iso = cleaned.match(/(\d{4})-([01]?\d)-([0-3]?\d)/);
  if (iso) return isoIfValid(iso[1], iso[2], iso[3]);
  const cz = cleaned.match(/([0-3]?\d)\s*[./]\s*([01]?\d)\s*[./]?\s*(\d{4}|\d{2})\b/);
  if (!cz) return "";
  const year = cz[3].length === 2 ? `20${cz[3]}` : cz[3];
  return isoIfValid(year, cz[2], cz[1]);
}

function isoIfValid(y: string, m: string, d: string): string {
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  if (year < 1990 || year > 2200) return "";
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  if (date.getUTCDate() !== day || date.getUTCMonth() + 1 !== month) return "";
  return iso;
}

/** "12 345,50 Kč" / "12.345,50" / "12,345.50" → číslo. */
export function parseAmount(raw: string): number {
  if (!raw) return 0;
  const negative = /-\s*\d/.test(raw) || /^\s*\(/.test(raw);
  let cleaned = raw.replace(/[^\d\s.,]/g, "").replace(/\s+/g, "");
  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // Oddělovač desetin je ten poslední, ten druhý odděluje tisíce.
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    // "1,50" je desetinná čárka; "1,500" bez dalších oddělovačů taky
    // (tisíce se v češtině píšou mezerou), ale "1,234,567" jsou tisíce.
    cleaned =
      cleaned.split(",").length > 2
        ? cleaned.replace(/,/g, "")
        : cleaned.replace(",", ".");
  } else if (lastDot >= 0 && /\.\d{3}(\D|$)/.test(cleaned) && cleaned.split(".").length > 2) {
    cleaned = cleaned.replace(/\./g, "");
  }

  const value = parseFloat(cleaned);
  if (!Number.isFinite(value)) return 0;
  return negative ? -value : value;
}

function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Hledání popisků a svislých pruhů (sloupců)
// ---------------------------------------------------------------------------

/**
 * Řádek bez mezer a diakritiky, s mapou zpět na úryvky a na původní text.
 *
 * Nadpisy v PDF bývají prostrkané („D O DAVAT E L") a pdf.js mezi znaky vloží
 * mezery. Hledání popisků proto probíhá nad touto zhuštěnou podobou —
 * jinak by se „ODBĚRATEL" nikdy netrefil.
 */
function compactLine(line: PdfTextLine): {
  text: string;
  owners: number[];
  sources: number[];
  /** pozice, na kterých začíná nový úryvek — tam začínají popisky */
  starts: number[];
} {
  const text: string[] = [];
  const owners: number[] = [];
  const sources: number[] = [];
  const starts: number[] = [];
  for (let i = 0; i < line.text.length; i++) {
    const char = line.text[i];
    if (/\s/.test(char)) continue;
    const owner = line.owners[i] ?? 0;
    for (const c of normalize(char)) {
      if (!text.length || owners[owners.length - 1] !== owner) {
        starts.push(text.length);
      }
      text.push(c);
      owners.push(owner);
      sources.push(i);
    }
  }
  return { text: text.join(""), owners, sources, starts };
}

/**
 * Najde vzor ve zhuštěném řádku. Přednost má shoda na začátku úryvku —
 * tam popisky opravdu začínají. Slepením sousedních buněk totiž vznikají
 * náhodné shody uprostřed („MJ" + „Cena za MJ" → …mjcena…).
 */
function matchCompact(
  compact: { text: string; starts: number[] },
  re: RegExp,
): number | null {
  const anchored = new RegExp(`^(?:${re.source})`);
  for (const start of compact.starts) {
    if (anchored.test(compact.text.slice(start))) return start;
  }
  const loose = compact.text.match(re);
  return loose?.index ?? null;
}

export interface LabelHit {
  line: PdfTextLine;
  lineIndex: number;
  /** x levého okraje popisku */
  x: number;
  /** x pravého okraje popisku */
  endX: number;
  /** zbytek řádku za popiskem */
  rest: string;
}

/**
 * Najde první výskyt popisku a vrátí i jeho vodorovnou polohu.
 * Vzor se porovnává se zhuštěným řádkem, takže musí být také bez mezer
 * a bez diakritiky (např. /datumvystaven/, ne /datum vystavení/).
 */
export function findLabel(lines: PdfTextLine[], re: RegExp): LabelHit | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const compact = compactLine(line);
    const from = matchCompact(compact, re);
    if (from === null) continue;
    const match = compact.text.slice(from).match(new RegExp(`^(?:${re.source})`)) ??
      compact.text.slice(from).match(re);
    if (!match) continue;

    const to = from + match[0].length - 1;
    const first = line.items[compact.owners[from] ?? 0];
    const last = line.items[compact.owners[to] ?? 0];
    if (!first) continue;

    const restFrom = (compact.sources[to] ?? 0) + 1;
    const rest = line.text.slice(restFrom).replace(/^[\s:.–-]+/, "");
    return {
      line,
      lineIndex: i,
      x: first.x,
      endX: last ? last.x + last.w : first.x + first.w,
      rest,
    };
  }
  return null;
}

/**
 * Přečte hodnotu patřící k popisku. Nejdřív zkusí zbytek řádku
 * („Variabilní symbol: 2026001"), pak sloupec pod popiskem — tam, kde je
 * popisek nadepsaný nad hodnotou.
 */
export function valueForLabel<T>(
  lines: PdfTextLine[],
  re: RegExp,
  extract: (text: string) => T | "",
): T | "" {
  const hit = findLabel(lines, re);
  if (!hit) return "";

  const sameLine = extract(hit.rest);
  if (sameLine) return sameLine;

  // Pravý okraj pruhu = začátek dalšího popisku na řádku vpravo.
  const next = hit.line.items.find((it) => it.str.trim() && it.x > hit.endX + 2);
  const right = next ? next.x - 6 : Number.POSITIVE_INFINITY;
  const left = hit.x - 6;

  let seen = 0;
  for (let i = hit.lineIndex + 1; i < lines.length && seen < 2; i++) {
    const line = lines[i];
    if (line.page !== hit.line.page) break;
    const inBand = line.items.filter((it) => it.x >= left && it.x < right);
    const text = inBand.length ? joinItems(inBand).text.trim() : "";
    if (!text) continue;
    seen++;
    const value = extract(text);
    if (value) return value;
  }
  return "";
}

const BAND_PAD = 14;

/**
 * Posbírá řádky pod popiskem, ale jen text ve svislém pruhu daného sloupce.
 * Díky tomu se do odběratele nepropíše nic z vedlejšího sloupce.
 */
export function collectBlock(
  lines: PdfTextLine[],
  hit: LabelHit,
  opts: { rightEdge?: number; maxLines?: number; stop?: RegExp } = {},
): string[] {
  const rightEdge = opts.rightEdge ?? Number.POSITIVE_INFINITY;
  const maxLines = opts.maxLines ?? 10;
  const stop = opts.stop ?? STOP_BLOCK;
  const left = hit.x - BAND_PAD;

  const block: string[] = [];
  if (hit.rest) block.push(hit.rest);

  let blanks = 0;
  for (let i = hit.lineIndex + 1; i < lines.length && block.length < maxLines; i++) {
    const line = lines[i];
    if (line.page !== hit.line.page) break;
    const inBand = line.items.filter(
      (it) => it.x + it.w > left && it.x < rightEdge,
    );
    if (!inBand.length) {
      blanks++;
      if (blanks >= 2 && block.length) break;
      continue;
    }
    const text = joinItems(inBand).text.trim();
    if (!text) continue;
    if (stop.test(normalize(text))) break;
    blanks = 0;
    block.push(text);
  }
  return block;
}

const STOP_BLOCK =
  /^(forma\s*[uú]hrady|datum|zp[uů]sob\s*platby|bankovn[ií]|iban|variabiln|konstantn|specifick|popis|ozna[cč]en|celkem|fakturujeme|objedn[aá]vk|spojen[ií]|[cč]\.?\s*[uú][cč]tu|dodac[ií])/;

// ---------------------------------------------------------------------------
// Bloky dodavatele / odběratele
// ---------------------------------------------------------------------------

// Vzory pro findLabel se porovnávají se zhuštěným řádkem — bez mezer a diakritiky.
const CLIENT_LABEL = /odberatel|kupujici|prijemce|fakturacniadresa|zakaznik/;
const SUPPLIER_LABEL = /dodavatel|prodavajici|vystavilfirma/;

const JUNK_LINE =
  /^(tel|telefon|mobil|e-?mail|mail|web|www|fax|banka|iban|swift|bic|[cč]\.?\s*[uú][cč]tu|[uú][cč]et|neplatce\s+dph|platce\s+dph|zapsan|spisov|obchodn[ií]\s+rejst)/;

/** Z bloku řádků poskládá firmu, adresu, IČO a DIČ. */
export function parseParty(block: string[]): ParsedParty {
  const party = emptyParty();
  const rest: string[] = [];

  for (const raw of block) {
    let line = (raw || "").replace(/\u00a0/g, " ").trim();
    if (!line) continue;

    const ico = line.match(/i[cč]\s*o?\s*[:.]?\s*(\d{6,10})/i);
    if (ico && !party.ico) party.ico = ico[1];
    const dic = line.match(/di[cč]\s*[:.]?\s*([a-z]{2}\s?\d{6,12})/i);
    if (dic && !party.dic) party.dic = dic[1].replace(/\s/g, "").toUpperCase();
    const email = line.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (email && !party.email) party.email = email[0];
    const phone = line.match(/(?:tel|telefon|mobil)\.?\s*:?\s*(\+?[\d\s]{9,17})/i);
    if (phone && !party.phone) party.phone = phone[1].trim();

    line = line
      .replace(/i[cč]\s*o?\s*[:.]?\s*\d{6,10}/gi, "")
      .replace(/di[cč]\s*[:.]?\s*[a-z]{2}\s?\d{6,12}/gi, "")
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "")
      // Tečku na konci nechat — „s.r.o.“ i „a.s.“ ji mají v názvu.
      .replace(/^[\s:.,–-]+|[\s:,–-]+$/g, "")
      .trim();

    if (!line) continue;
    if (JUNK_LINE.test(normalize(line))) continue;
    if (CLIENT_LABEL.test(normalize(line)) || SUPPLIER_LABEL.test(normalize(line))) continue;
    rest.push(line);
  }

  // PSČ + město: "417 12 Probošťov" nebo "Probošťov, 417 12"
  let addressIndex = -1;
  for (let i = 0; i < rest.length; i++) {
    const before = rest[i].match(/^(\d{3})\s?(\d{2})\s+(.{2,})$/);
    if (before) {
      party.zip = `${before[1]} ${before[2]}`;
      party.city = before[3].trim();
      addressIndex = i;
      break;
    }
    const after = rest[i].match(/^(.{2,}?)[,\s]+(\d{3})\s?(\d{2})$/);
    if (after) {
      party.city = after[1].trim();
      party.zip = `${after[2]} ${after[3]}`;
      addressIndex = i;
      break;
    }
  }

  const nameIndex = rest.findIndex((l) => /[\p{L}]{2,}/u.test(l));
  if (nameIndex >= 0 && nameIndex !== addressIndex) {
    party.name = rest[nameIndex].slice(0, 90);
  }

  // Ulice = řádek mezi názvem a PSČ (poslední, pokud jich je víc).
  if (addressIndex > 0) {
    const between = rest.slice(nameIndex + 1, addressIndex).filter(Boolean);
    if (between.length) party.street = between[between.length - 1].slice(0, 90);
  } else if (addressIndex === -1 && nameIndex >= 0) {
    if (rest[nameIndex + 1]) party.street = rest[nameIndex + 1].slice(0, 90);
    if (rest[nameIndex + 2]) party.city = rest[nameIndex + 2].slice(0, 60);
  }

  return party;
}

// ---------------------------------------------------------------------------
// Tabulka položek
// ---------------------------------------------------------------------------

type ColumnKey = "description" | "quantity" | "unit" | "unitPrice" | "vatRate" | "total";

// Vzory se porovnávají se zhuštěným řádkem — bez mezer a diakritiky.
// Pořadí rozhoduje: „j.cena" se musí zabrat dřív, než na „cena" sáhne „celkem".
const COLUMN_PATTERNS: { key: ColumnKey; re: RegExp }[] = [
  { key: "description", re: /popis|oznacen|nazev|polozk|predmet|dodavka|sluzb|text/ },
  { key: "quantity", re: /mnozstv|pocet|mnoz\.|pocet/ },
  { key: "unit", re: /mj|m\.j\.|jednotka|jedn\./ },
  { key: "unitPrice", re: /j\.?cena|cenaza|jednotkovacena|cenabezdph|cena\/mj|cena\/j/ },
  { key: "vatRate", re: /dph|sazba/ },
  { key: "total", re: /celkem|castka|suma|celkov/ },
];

const ITEMS_STOP =
  /^(celkem\s*k\s*[uú]hrad|k\s*[uú]hrad|rekapitulace|z[aá]klad\b|zaokrouhlen|celkem\s*bez\s*dph|dph\s*celkem|sou[cč]et|souhrn|celkem\s*s\s*dph|qr\s*platba|vystavil|celkem\s*$)/;

interface Column {
  key: ColumnKey;
  /** levý okraj záhlaví sloupce */
  start: number;
}

/** Najde hlavičku tabulky položek a levé okraje jejích sloupců. */
export function findItemsHeader(
  lines: PdfTextLine[],
): { lineIndex: number; columns: Column[] } | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.items.length < 2) continue;
    const compact = compactLine(line);
    if (compact.text.length < 6) continue;

    const columns: Column[] = [];
    const claimed = new Set<number>();
    for (const { key, re } of COLUMN_PATTERNS) {
      const anchored = new RegExp(`^(?:${re.source})`);
      for (const start of compact.starts) {
        if (!anchored.test(compact.text.slice(start))) continue;
        const itemIndex = compact.owners[start] ?? 0;
        if (claimed.has(itemIndex)) continue;
        const item = line.items[itemIndex];
        if (!item) continue;
        claimed.add(itemIndex);
        columns.push({ key, start: item.x });
        break;
      }
    }

    const keys = new Set(columns.map((c) => c.key));
    const hasText = keys.has("description");
    const hasMoney = keys.has("total") || keys.has("unitPrice");
    if (hasText && hasMoney && columns.length >= 3) {
      columns.sort((a, b) => a.start - b.start);
      return { lineIndex: i, columns };
    }
  }
  return null;
}

/** Kolik smí hodnota přetéct vlevo přes záhlaví (čísla bývají zarovnaná vpravo). */
const COLUMN_OVERHANG = 30;

/**
 * Rozdělí řádek do sloupců čtením zleva doprava.
 *
 * Do dalšího sloupce se přechází, až úryvek začne za jeho prahem. Popis
 * bývá o dost širší než slovo „Popis" v záhlaví, takže porovnávat středy
 * nebo nejbližší sloupec by dlouhý text urvalo do sloupce s množstvím.
 */
function bucketByColumn(
  line: PdfTextLine,
  columns: Column[],
): Partial<Record<ColumnKey, string>> {
  const thresholds = columns.map((col, i) =>
    i === 0
      ? Number.NEGATIVE_INFINITY
      : col.start - Math.min(COLUMN_OVERHANG, 0.4 * (col.start - columns[i - 1].start)),
  );

  const buckets = new Map<ColumnKey, PdfTextItem[]>();
  let index = 0;
  for (const item of line.items) {
    while (index + 1 < columns.length && item.x >= thresholds[index + 1]) index++;
    const key = columns[index].key;
    const arr = buckets.get(key) ?? [];
    arr.push(item);
    buckets.set(key, arr);
  }

  const out: Partial<Record<ColumnKey, string>> = {};
  for (const [key, items] of buckets) {
    out[key] = joinItems(items).text.trim();
  }
  return out;
}

const VAT_RATES_KNOWN = [21, 12, 15, 10, 0];

function nearestVatRate(value: number): number {
  return VAT_RATES_KNOWN.reduce(
    (best, rate) => (Math.abs(rate - value) < Math.abs(best - value) ? rate : best),
    0,
  );
}

/** Vytáhne položky faktury z tabulky pod hlavičkou. */
export function parseItems(lines: PdfTextLine[]): ParsedItem[] {
  const header = findItemsHeader(lines);
  if (!header) return [];

  const items: ParsedItem[] = [];
  for (let i = header.lineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const normalized = normalize(line.text).trim();
    if (!normalized) continue;
    if (ITEMS_STOP.test(normalized)) break;

    const cells = bucketByColumn(line, header.columns);
    const description = (cells.description || "").trim();
    const totalRaw = cells.total || "";
    const priceRaw = cells.unitPrice || "";
    const hasMoney = /\d/.test(totalRaw) || /\d/.test(priceRaw);

    if (!hasMoney) {
      // Pokračování popisu předchozí položky na dalším řádku.
      if (description && items.length && !/^\d+[.)]?$/.test(description)) {
        const last = items[items.length - 1];
        last.description = `${last.description} ${description}`.trim().slice(0, 400);
      }
      continue;
    }
    if (!description) continue;

    const quantityRaw = (cells.quantity || "").trim();
    const quantity = quantityRaw ? parseAmount(quantityRaw) : 1;
    const unitFromQuantity = quantityRaw.match(/([\p{L}²³]{1,4})\s*$/u);
    const unit = (cells.unit || unitFromQuantity?.[1] || "ks").trim().slice(0, 8);
    const total = parseAmount(totalRaw);
    const unitPrice = priceRaw ? parseAmount(priceRaw) : quantity ? total / quantity : total;
    const vatRaw = cells.vatRate || "";
    const vatRate = /\d/.test(vatRaw) ? nearestVatRate(parseAmount(vatRaw)) : 0;

    items.push({
      description: description.replace(/^\d+[.)]\s*/, "").slice(0, 400),
      quantity: quantity > 0 ? quantity : 1,
      unit: unit || "ks",
      unitPrice: Math.abs(unitPrice) < 1e-9 && total ? total : unitPrice,
      vatRate,
      total: total || unitPrice * quantity,
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Celá faktura
// ---------------------------------------------------------------------------

function firstMatch(text: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return "";
}

function lastAmount(text: string, re: RegExp): number {
  const matches = [...text.matchAll(re)];
  if (!matches.length) return 0;
  for (let i = matches.length - 1; i >= 0; i--) {
    const value = parseAmount(matches[i][1] || "");
    if (value) return value;
  }
  return 0;
}

const PAYMENT_HINTS: { re: RegExp; value: PaymentMethod }[] = [
  { re: /prevod|bankovnim|prikaz/, value: "prikazem" },
  { re: /hotov/, value: "hotove" },
  { re: /kart/, value: "kartou" },
  { re: /dobirk/, value: "dobirka" },
  { re: /zapoct/, value: "zapoctem" },
];

// --- popisky nad hodnotami (zhuštěné, bez mezer a diakritiky) --------------
// Kotvení na začátek úryvku řeší matchCompact, vzory proto nemají ^.
const LABEL = {
  issueDate: /datumvystaven|vystaveno|datumvyhotoven|dat\.vystaven/,
  dueDate: /datumsplatnosti|splatnost/,
  taxDate: /duzp|datumuskutecnen|zdanitelnehoplnen|datumplnen/,
  variableSymbol: /variabilnisymbol|var\.symbol|v\.s\./,
  constantSymbol: /konstantnisymbol|konst\.symbol|k\.s\./,
  orderNumber: /objednavk|c\.obj/,
  paymentMethod: /formauhrady|zpusobplatby|zpusobuhrady/,
} as const;

const DATE_PATTERN =
  /([0-3]?\d\s*[./]\s*[01]?\d\s*[./]?\s*\d{2,4}|\d{4}-\d{2}-\d{2})/;

const takeDate = (text: string) => parseCzDate(text.match(DATE_PATTERN)?.[1] ?? "");

const takeDigits = (max: number) => (text: string) => {
  const match = text.match(/\d[\d\s]{0,15}/);
  return match ? match[0].replace(/\D/g, "").slice(0, max) : "";
};

const takePayment = (text: string): PaymentMethod | "" => {
  const normalized = normalize(text);
  return PAYMENT_HINTS.find((h) => h.re.test(normalized))?.value ?? "";
};

const takeText = (text: string) => text.trim().slice(0, 40);

/** Hlavní vstupní bod: z polohovaných řádků poskládá údaje faktury. */
export function parseInvoiceLines(lines: PdfTextLine[]): ParsedInvoiceData {
  const text = linesToText(lines);
  const flat = normalize(text.replace(/\u00a0/g, " "));

  // --- symboly -------------------------------------------------------------
  const variableSymbol =
    valueForLabel(lines, LABEL.variableSymbol, takeDigits(10)) ||
    firstMatch(flat, [
      /variabiln[ií]\s*symbol\s*[:.]?\s*([0-9]{1,10})/,
      /\bv\.?\s?s\.?\s*[:.]?\s*([0-9]{4,10})/,
    ]).replace(/\D/g, "");
  const constantSymbol =
    valueForLabel(lines, LABEL.constantSymbol, takeDigits(4)) ||
    firstMatch(flat, [
      /konstantn[ií]\s*symbol\s*[:.]?\s*([0-9]{1,4})/,
      /\bk\.?\s?s\.?\s*[:.]?\s*([0-9]{3,4})\b/,
    ]).replace(/\D/g, "");

  // --- číslo faktury -------------------------------------------------------
  // Číslo musí obsahovat cifru, jinak by se chytlo běžné slovo z nadpisu.
  const NUM = "([A-Za-z]{0,4}[-/]?\\d[A-Za-z0-9/-]{2,18})";
  const CISLO = "(?:[čc](?:[íi]s(?:lo)?)?\\.?)";
  let number = firstMatch(text, [
    new RegExp(`${CISLO}\\s*(?:dokladu|faktury)\\s*[:.]?\\s*${NUM}`, "i"),
    new RegExp(
      `(?:faktura|da[ňn]ov[ýy]\\s+doklad|invoice)\\s*[-–]?\\s*${CISLO}?\\s*[:.#]?\\s*${NUM}`,
      "i",
    ),
    new RegExp(`${CISLO}\\s*[:.]?\\s*${NUM}`, "i"),
  ]);
  number = number.replace(/[.,;:/-]+$/, "").trim();
  if (!number) number = variableSymbol;

  // --- data ----------------------------------------------------------------
  // Popisek bývá buď před hodnotou („Datum vystavení: 7. 8. 2026"),
  // nebo nad ní ve sloupci — valueForLabel zvládne obojí.
  const DATE = DATE_PATTERN.source;
  const issueDate =
    valueForLabel(lines, LABEL.issueDate, takeDate) ||
    parseCzDate(
      firstMatch(flat, [
        new RegExp(`datum\\s*vystaven[ií]\\s*[:.]?\\s*${DATE}`),
        new RegExp(`(?:vystaveno|vystaven[ií]|datum\\s*vyhotoven[ií])\\s*[:.]?\\s*${DATE}`),
      ]),
    );
  const dueDate =
    valueForLabel(lines, LABEL.dueDate, takeDate) ||
    parseCzDate(
      firstMatch(flat, [
        new RegExp(`datum\\s*splatnosti\\s*[:.]?\\s*${DATE}`),
        new RegExp(`splatnost[^\\n]{0,12}?[:.]?\\s*${DATE}`),
      ]),
    );
  const taxDate =
    valueForLabel(lines, LABEL.taxDate, takeDate) ||
    parseCzDate(
      firstMatch(flat, [
        new RegExp(`\\bduzp\\s*[:.]?\\s*${DATE}`),
        new RegExp(`datum\\s*uskute[cč]n[eě]n[ií][^\\n]{0,40}?[:.]?\\s*${DATE}`),
        new RegExp(`zdaniteln[eé]ho\\s*pln[eě]n[ií]\\s*[:.]?\\s*${DATE}`),
      ]),
    );

  // --- strany --------------------------------------------------------------
  const clientHit = findLabel(lines, CLIENT_LABEL);
  const supplierHit = findLabel(lines, SUPPLIER_LABEL);

  let client = emptyParty();
  if (clientHit) {
    // Pravý okraj pruhu = začátek dalšího sloupce vpravo (typicky dodavatel).
    const rightEdge =
      supplierHit && supplierHit.x > clientHit.x + BAND_PAD
        ? supplierHit.x - BAND_PAD
        : Number.POSITIVE_INFINITY;
    client = parseParty(collectBlock(lines, clientHit, { rightEdge }));
  }

  let supplierName = "";
  if (supplierHit) {
    const rightEdge =
      clientHit && clientHit.x > supplierHit.x + BAND_PAD
        ? clientHit.x - BAND_PAD
        : Number.POSITIVE_INFINITY;
    supplierName = parseParty(collectBlock(lines, supplierHit, { rightEdge })).name;
  }

  // Záložní IČO odběratele: druhé IČO v dokumentu (první bývá dodavatele).
  if (!client.ico) {
    const icos = [...flat.matchAll(/i[cč]\s*o?\s*[:.]?\s*(\d{8})/g)].map((m) => m[1]);
    if (icos.length > 1) client.ico = icos[1];
  }

  // --- částky --------------------------------------------------------------
  // Částka musí začínat číslicí, jinak by se popisek chytil na samotnou mezeru.
  const AMOUNT = "([-\\d][\\d\\s.,\\u00a0]{0,19})";
  let total = lastAmount(
    flat,
    new RegExp(
      `(?:celkem\\s*k\\s*[uú]hrad[eě]|k\\s*[uú]hrad[eě]|celkem\\s*s\\s*dph|celkem\\s*v[cč]etn[eě]\\s*dph|celkem\\s*(?:k\\s*)?zaplacen[ií]|total)\\s*[:.]?\\s*${AMOUNT}`,
      "g",
    ),
  );
  const subtotal = lastAmount(
    flat,
    new RegExp(
      `(?:z[aá]klad(?:\\s*dan[eě]|\\s*bez\\s*dph)?|celkem\\s*bez\\s*dph|cena\\s*bez\\s*dph|mezisou[cč]et)\\s*[:.]?\\s*${AMOUNT}`,
      "g",
    ),
  );
  const vatTotal = lastAmount(
    flat,
    new RegExp(`(?:dph\\s*celkem|celkem\\s*dph|vy[sš]e\\s*dph|da[nň]\\s*celkem)\\s*[:.]?\\s*${AMOUNT}`, "g"),
  );

  const items = parseItems(lines);

  if (!total) {
    const fromItems = items.reduce((sum, it) => sum + (it.total || 0), 0);
    if (fromItems) total = Math.round(fromItems * 100) / 100;
  }
  if (!total) {
    // Nouzově největší částka s desetinnými místy v dokumentu.
    const nums = [...text.matchAll(/(\d[\d\s.,]{2,}[.,]\d{2})(?!\d)/g)].map((m) =>
      parseAmount(m[1]),
    );
    total = nums.length ? Math.max(...nums) : 0;
  }

  const vatPayer = vatTotal > 0 || items.some((it) => it.vatRate > 0);

  // --- ostatní -------------------------------------------------------------
  const currency = /\beur\b|€/.test(flat) && !/\bk[cč]\b|\bczk\b/.test(flat) ? "EUR" : "CZK";

  const paymentMethod: PaymentMethod =
    valueForLabel(lines, LABEL.paymentMethod, takePayment) ||
    takePayment(
      firstMatch(flat, [
        /(?:forma\s*[uú]hrady|zp[uů]sob\s*(?:platby|[uú]hrady))\s*[:.]?\s*([^\n]{0,30})/,
      ]),
    ) ||
    "prikazem";

  const orderNumber = valueForLabel(lines, LABEL.orderNumber, takeText);

  return {
    number,
    variableSymbol: variableSymbol || number.replace(/\D/g, "").slice(0, 10),
    constantSymbol,
    orderNumber,
    issueDate,
    dueDate,
    taxDate,
    client,
    supplierName,
    items,
    subtotal,
    vatTotal,
    total,
    currency,
    paymentMethod,
    vatPayer,
    found: {
      number: Boolean(number),
      client: Boolean(client.name),
      clientAddress: Boolean(client.city || client.street),
      issueDate: Boolean(issueDate),
      total: total > 0,
      items: items.length > 0,
    },
  };
}
