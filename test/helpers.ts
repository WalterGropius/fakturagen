// Pomůcky pro testy: poskládají „PDF" text s polohami, jak by ho vrátil pdf.js.

import type { PdfTextItem } from "@/lib/pdf-parse";

export interface Cell {
  text: string;
  x: number;
  y: number;
  size?: number;
}

/** Odhad šířky textu — pro testy stačí průměrná šířka znaku. */
export function layout(cells: Cell[], page = 1): PdfTextItem[] {
  return cells.map((c) => {
    const h = c.size ?? 9;
    return {
      str: c.text,
      x: c.x,
      y: c.y,
      w: c.text.length * h * 0.5,
      h,
      page,
    };
  });
}

/**
 * Faktura ve dvou sloupcích: dodavatel vlevo (x=60), odběratel vpravo (x=330).
 * Přesně ten případ, kde se dřív odběratel slil s dodavatelem do jednoho řádku.
 */
export const TWO_COLUMN_INVOICE: Cell[] = [
  { text: "Pavel Müller", x: 60, y: 760, size: 14 },
  { text: "Faktura", x: 460, y: 760, size: 22 },
  { text: "č. dokladu", x: 470, y: 738 },
  { text: "2026001", x: 470, y: 722, size: 12 },

  { text: "DODAVATEL", x: 60, y: 700 },
  { text: "ODBĚRATEL", x: 330, y: 700 },
  { text: "Pavel Müller", x: 60, y: 685 },
  { text: "PECUD výrobní a obchodní družstvo", x: 330, y: 685 },
  { text: "Muchova 2889/1", x: 60, y: 672 },
  { text: "Zemská 535", x: 330, y: 672 },
  { text: "400 11 Ústí nad Labem", x: 60, y: 659 },
  { text: "417 12 Probošťov", x: 330, y: 659 },
  { text: "IČO: 86708121", x: 60, y: 640 },
  { text: "IČO: 00526814", x: 330, y: 640 },
  { text: "Neplátce DPH", x: 60, y: 627 },
  { text: "DIČ: CZ00526814", x: 330, y: 627 },
  { text: "Tel.: 603713456", x: 60, y: 614 },
  { text: "E-mail: info@mils.info", x: 60, y: 601 },

  { text: "Forma úhrady: Převodem", x: 60, y: 570 },
  { text: "Datum vystavení: 07.08.2026", x: 230, y: 570 },
  { text: "Č. účtu: 2205903851/0210", x: 420, y: 570 },
  { text: "Datum splatnosti: 21.08.2026", x: 60, y: 556 },
  { text: "IBAN: CZ30 8210 0000 0022 0590 3851", x: 230, y: 556 },
  { text: "DUZP: 07.08.2026", x: 420, y: 556 },
  { text: "Variabilní symbol: 2026001", x: 60, y: 542 },
  { text: "Konstantní symbol: 0308", x: 230, y: 542 },

  { text: "POPIS", x: 60, y: 505 },
  { text: "MNOŽSTVÍ", x: 330, y: 505 },
  { text: "J. CENA", x: 420, y: 505 },
  { text: "CELKEM", x: 500, y: 505 },
  { text: "Konzultace a řešení krizových situací", x: 60, y: 485 },
  { text: "8 hod", x: 330, y: 485 },
  { text: "1 200,00 Kč", x: 420, y: 485 },
  { text: "9 600,00 Kč", x: 500, y: 485 },
  { text: "Poradenská činnost v IS ComSTAR", x: 60, y: 468 },
  { text: "1 ks", x: 330, y: 468 },
  { text: "4 500,00 Kč", x: 420, y: 468 },
  { text: "4 500,00 Kč", x: 500, y: 468 },

  { text: "QR PLATBA", x: 60, y: 400 },
  { text: "Celkem k úhradě", x: 420, y: 400 },
  { text: "14 100,00 Kč", x: 500, y: 400 },
  { text: "Vystavil: Pavel Müller", x: 60, y: 340 },
];

/** Opačné rozvržení: odběratel vlevo, dodavatel vpravo, plátce DPH. */
export const SWAPPED_VAT_INVOICE: Cell[] = [
  { text: "FAKTURA — DAŇOVÝ DOKLAD č. 2026/0042", x: 60, y: 780, size: 13 },

  { text: "Odběratel:", x: 60, y: 730 },
  { text: "Dodavatel:", x: 340, y: 730 },
  { text: "Alfa Systems s.r.o.", x: 60, y: 715 },
  { text: "Studio Nova s.r.o.", x: 340, y: 715 },
  { text: "Dlouhá 12", x: 60, y: 702 },
  { text: "Krátká 3", x: 340, y: 702 },
  { text: "110 00 Praha 1", x: 60, y: 689 },
  { text: "602 00 Brno", x: 340, y: 689 },
  { text: "IČO 27604977", x: 60, y: 676 },
  { text: "IČO 45274649", x: 340, y: 676 },
  { text: "DIČ CZ27604977", x: 60, y: 663 },
  { text: "DIČ CZ45274649", x: 340, y: 663 },

  { text: "Datum vystavení: 3. 9. 2026", x: 60, y: 620 },
  { text: "Datum splatnosti: 17. 9. 2026", x: 60, y: 606 },
  { text: "DUZP: 3. 9. 2026", x: 60, y: 592 },
  { text: "Variabilní symbol: 20260042", x: 340, y: 620 },
  { text: "Forma úhrady: Hotově", x: 340, y: 606 },

  { text: "Označení dodávky", x: 60, y: 550 },
  { text: "Počet", x: 300, y: 550 },
  { text: "MJ", x: 350, y: 550 },
  { text: "Cena za MJ", x: 400, y: 550 },
  { text: "DPH", x: 470, y: 550 },
  { text: "Celkem", x: 510, y: 550 },
  { text: "Vývoj webové aplikace", x: 60, y: 530 },
  { text: "10", x: 300, y: 530 },
  { text: "hod", x: 350, y: 530 },
  { text: "1.500,00", x: 400, y: 530 },
  { text: "21 %", x: 470, y: 530 },
  { text: "15.000,00", x: 510, y: 530 },
  { text: "— včetně nasazení a školení", x: 60, y: 516 },
  { text: "Grafické práce", x: 60, y: 500 },
  { text: "4", x: 300, y: 500 },
  { text: "hod", x: 350, y: 500 },
  { text: "900,00", x: 400, y: 500 },
  { text: "21 %", x: 470, y: 500 },
  { text: "3.600,00", x: 510, y: 500 },

  { text: "Základ daně: 18.600,00", x: 340, y: 440 },
  { text: "DPH celkem: 3.906,00", x: 340, y: 426 },
  { text: "Celkem k úhradě: 22.506,00 Kč", x: 340, y: 410 },
];
