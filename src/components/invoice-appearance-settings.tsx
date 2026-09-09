"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { DocumentAppearance, Invoice, Settings } from "@/lib/types";
import {
  DENSITY_OPTIONS,
  INK_OPTIONS,
  INVOICE_FONTS,
  INVOICE_FONT_SIZES,
  LINE_SPACING_OPTIONS,
  DEFAULT_DOCUMENT_APPEARANCE,
} from "@/lib/constants";
import { addDays, todayIso } from "@/lib/format";
import { Label, Switch } from "./ui";
import { InvoiceDocument } from "./invoice-document";
import { cn } from "@/lib/cn";

/** Ukázková faktura pro náhled — použije skutečné údaje dodavatele. */
function sampleInvoice(settings: Settings): Invoice {
  const issueDate = todayIso();
  const vatPayer = settings.supplier.vatPayer;
  return {
    id: "nahled",
    number: "2026001",
    variableSymbol: "2026001",
    constantSymbol: "0308",
    supplier: settings.supplier.name
      ? settings.supplier
      : {
          ...settings.supplier,
          name: "Jan Novák",
          street: "Muchova 2889/1",
          city: "Ústí nad Labem",
          zip: "400 11",
          ico: "86708121",
          phone: "603 713 456",
          email: "jan@novak.cz",
        },
    client: {
      name: "PECUD výrobní a obchodní družstvo",
      street: "Zemská 535",
      city: "Probošťov",
      zip: "417 12",
      ico: "00526814",
      dic: "CZ00526814",
    },
    issueDate,
    dueDate: addDays(issueDate, settings.invoice.dueDays),
    taxDate: issueDate,
    paymentMethod: settings.invoice.paymentMethod,
    items: [
      {
        id: "1",
        description: "Konzultace a řešení krizových situací po telefonu",
        quantity: 8,
        unit: "hod",
        unitPrice: 1200,
        vatRate: vatPayer ? 21 : 0,
        discount: 0,
      },
      {
        id: "2",
        description: "Poradenská činnost při implementaci změn v IS ComSTAR",
        quantity: 1,
        unit: "ks",
        unitPrice: 4500,
        vatRate: vatPayer ? 21 : 0,
        discount: 0,
      },
    ],
    rounding: settings.invoice.rounding,
    currency: settings.invoice.currency,
    note:
      settings.invoice.footerNote ||
      "Fakturace za období 8/2026 na základě Smlouvy o poskytování služeb.",
    issuedBy: settings.invoice.issuedBy || settings.supplier.person || "Jan Novák",
    qrPayment: settings.invoice.qrPayment,
    qrMessage: settings.invoice.qrMessage,
    vatPayer,
    status: "issued",
    createdAt: issueDate,
    updatedAt: issueDate,
  };
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; note?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
            value === o.value
              ? "border-accent bg-accent-soft"
              : "border-border hover:bg-muted",
          )}
        >
          <span className="block font-medium">{o.label}</span>
          {o.note && (
            <span className="block text-xs text-muted-foreground">{o.note}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Šířka sazby dokumentu — stejná jako `max-w-[820px]` u faktury. */
const PAGE_WIDTH = 820;
/** Poměr stran A4 (210 × 297 mm). */
const PAGE_RATIO_CSS = "210 / 297";

/**
 * Vykreslí dokument v plné šířce a lineárně ho zmenší na šířku sloupce.
 * Zmenšení řeší transform (ne zoom) — funguje ve všech podporovaných
 * prohlížečích a nemění zalomení textu, takže náhled odpovídá tisku.
 */
function PagePreview({ children }: { children: React.ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.45);

  const measure = useCallback(() => {
    const frame = frameRef.current;
    if (frame) setScale(frame.clientWidth / PAGE_WIDTH);
  }, []);

  useLayoutEffect(() => {
    measure();
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div
      ref={frameRef}
      className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
      style={{ aspectRatio: PAGE_RATIO_CSS }}
    >
      <div
        style={{
          width: PAGE_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function InvoiceAppearanceSettings({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<DocumentAppearance>) => void;
}) {
  const doc = settings.appearance.document ?? DEFAULT_DOCUMENT_APPEARANCE;
  const preview = useMemo(() => sampleInvoice(settings), [settings]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <div className="space-y-6">
        <div>
          <Label>Sytost písma</Label>
          <Segmented
            value={doc.ink}
            options={INK_OPTIONS}
            onChange={(ink) => onChange({ ink })}
          />
        </div>

        <div>
          <Label>Písmo faktury</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {INVOICE_FONTS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => onChange({ font: f.key })}
                style={{ fontFamily: f.variable }}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                  doc.font === f.key
                    ? "border-accent bg-accent-soft"
                    : "border-border hover:bg-muted",
                )}
              >
                <span>
                  <span className="block font-semibold">{f.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {f.note}
                  </span>
                </span>
                {doc.font === f.key && (
                  <Check className="size-4 text-accent" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Velikost písma</Label>
          <div className="flex flex-wrap gap-2">
            {INVOICE_FONT_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onChange({ fontSize: size })}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-medium tabular transition-colors",
                  doc.fontSize === size
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border hover:bg-muted",
                )}
              >
                {size} px
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Řádkování</Label>
          <Segmented
            value={doc.lineSpacing}
            options={LINE_SPACING_OPTIONS}
            onChange={(lineSpacing) => onChange({ lineSpacing })}
          />
        </div>

        <div>
          <Label>Hustota rozvržení</Label>
          <Segmented
            value={doc.density}
            options={DENSITY_OPTIONS}
            onChange={(density) => onChange({ density })}
          />
        </div>

        <label className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
          <div>
            <div className="text-sm font-medium">Barevný akcent na faktuře</div>
            <div className="text-xs text-muted-foreground">
              Vypnuto vytiskne fakturu čistě černobíle.
            </div>
          </div>
          <Switch
            checked={doc.colored}
            onChange={(colored) => onChange({ colored })}
          />
        </label>

        <label className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
          <div>
            <div className="text-sm font-medium">
              Podpis „Vystaveno ve Fakturce“
            </div>
            <div className="text-xs text-muted-foreground">
              Drobná patička na konci dokumentu.
            </div>
          </div>
          <Switch
            checked={doc.watermark}
            onChange={(watermark) => onChange({ watermark })}
          />
        </label>
      </div>

      {/* Živý náhled — zmenšená, ale skutečná A4 stránka */}
      <div className="lg:sticky lg:top-6 lg:h-fit">
        <Label>Náhled</Label>
        <PagePreview>
          <InvoiceDocument
            invoice={preview}
            logo={settings.appearance.logo}
            appearance={doc}
            accent={settings.appearance.accent}
          />
        </PagePreview>
        <p className="mt-2 text-xs text-muted-foreground">
          Zmenšená stránka A4 — přesně tak fakturu uvidí odběratel.
        </p>
      </div>
    </div>
  );
}
