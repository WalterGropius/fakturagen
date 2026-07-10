"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Upload,
  FileText,
  Check,
  TriangleAlert,
  X,
  Loader2,
  ArrowRight,
  ChevronLeft,
  Info,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import {
  processPdf,
  parsedToInvoice,
  type ParsedInvoice,
} from "@/lib/pdf-import";
import { formatMoney, czPlural } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Button, Card, Input, Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

interface Row extends ParsedInvoice {
  include: boolean;
  duplicate: "hash" | "number" | null;
}

export default function ImportPage() {
  const hydrated = useHydrated();
  const invoices = useStore((s) => s.invoices);
  const settings = useStore((s) => s.settings);
  const addInvoice = useStore((s) => s.addInvoice);

  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setBusy(true);
    setErrors([]);
    setImportedCount(null);

    const existingHashes = new Set(
      invoices.map((i) => i.sourceHash).filter(Boolean) as string[],
    );
    const existingNumbers = new Set(invoices.map((i) => i.number));
    const batchHashes = new Set(rows.map((r) => r.hash));
    const newRows: Row[] = [];
    const newErrors: string[] = [];

    for (const file of Array.from(fileList)) {
      if (!/\.pdf$/i.test(file.name)) continue;
      try {
        const parsed = await processPdf(file);
        let duplicate: Row["duplicate"] = null;
        if (existingHashes.has(parsed.hash) || batchHashes.has(parsed.hash)) {
          duplicate = "hash";
        } else if (parsed.number && existingNumbers.has(parsed.number)) {
          duplicate = "number";
        }
        batchHashes.add(parsed.hash);
        newRows.push({ ...parsed, include: duplicate !== "hash", duplicate });
      } catch {
        newErrors.push(`Soubor „${file.name}" se nepodařilo přečíst.`);
      }
    }

    setRows((prev) => [...prev, ...newRows]);
    setErrors(newErrors);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const update = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));

  const runImport = () => {
    const chosen = rows.filter((r) => r.include && r.duplicate !== "hash");
    for (const r of chosen) {
      addInvoice(parsedToInvoice(r, settings));
    }
    setImportedCount(chosen.length);
    setRows([]);
  };

  const includable = rows.filter(
    (r) => r.include && r.duplicate !== "hash",
  ).length;

  return (
    <div>
      <Link
        href="/faktury"
        className="no-print mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Faktury
      </Link>
      <PageHeader
        title="Import starých faktur"
        subtitle="Nahrajte PDF a přidáme je do přehledu i statistik. Vše zůstává ve vašem prohlížeči."
      />

      {importedCount !== null && (
        <Card className="mb-5 flex items-center gap-3 border-success/40 bg-success-soft p-4">
          <Check className="size-5 text-success" />
          <span className="text-sm">
            Naimportováno {importedCount}{" "}
            {czPlural(importedCount, "faktura", "faktury", "faktur")}.
          </span>
          <Link href="/prehled" className="ml-auto">
            <Button variant="outline" size="sm">
              Zobrazit přehled <ArrowRight className="size-4" />
            </Button>
          </Link>
        </Card>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragging ? "border-accent bg-accent-soft" : "border-border bg-card/40",
        )}
      >
        <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          {busy ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <Upload className="size-6" />
          )}
        </div>
        <p className="font-medium">
          {busy ? "Zpracovávám PDF…" : "Přetáhněte sem PDF faktury"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          nebo je vyberte v počítači. Můžete jich nahrát více najednou.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          Vybrat soubory
        </Button>
      </div>

      {errors.length > 0 && (
        <div className="mt-4 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="flex items-center gap-1.5 text-sm text-danger">
              <TriangleAlert className="size-4" /> {e}
            </p>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">
              Zkontrolujte údaje
            </h2>
            <span className="text-sm text-muted-foreground">
              {includable} k importu z {rows.length}
            </span>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            Údaje jsou vytažené automaticky — než potvrdíte, klidně je upravte.
            Faktury, které už máte, jsme označili jako duplicitní.
          </div>

          <div className="mt-3 space-y-3">
            {rows.map((r, i) => (
              <Card
                key={r.hash + i}
                className={cn(
                  "p-4",
                  r.duplicate === "hash" && "opacity-60",
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={r.include}
                      disabled={r.duplicate === "hash"}
                      onChange={(e) => update(i, { include: e.target.checked })}
                      className="size-4 rounded"
                      style={{ accentColor: "var(--accent)" }}
                    />
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="max-w-[180px] truncate text-muted-foreground">
                      {r.fileName}
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    {r.duplicate === "hash" && (
                      <Badge tone="neutral">Již importováno</Badge>
                    )}
                    {r.duplicate === "number" && (
                      <Badge tone="warning">Číslo už existuje</Badge>
                    )}
                    <button
                      onClick={() => remove(i)}
                      className="text-muted-foreground hover:text-danger"
                      aria-label="Odebrat"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-xs text-muted-foreground">
                    Číslo faktury
                    <Input
                      value={r.number}
                      onChange={(e) => update(i, { number: e.target.value })}
                      className="mt-1"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground lg:col-span-2">
                    Odběratel
                    <Input
                      value={r.clientName}
                      onChange={(e) => update(i, { clientName: e.target.value })}
                      className="mt-1"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Datum vystavení
                    <Input
                      type="date"
                      value={r.issueDate}
                      onChange={(e) => update(i, { issueDate: e.target.value })}
                      className="mt-1"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Částka celkem
                    <Input
                      type="number"
                      step="any"
                      value={r.total}
                      onChange={(e) =>
                        update(i, { total: Number(e.target.value) || 0 })
                      }
                      className="mt-1"
                    />
                  </label>
                  <div className="flex items-end text-sm text-muted-foreground">
                    {formatMoney(r.total, r.currency)}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRows([])}>
              Zrušit
            </Button>
            <Button onClick={runImport} disabled={includable === 0}>
              <Check className="size-4" /> Importovat {includable}{" "}
              {czPlural(includable, "fakturu", "faktury", "faktur")}
            </Button>
          </div>
        </div>
      )}

      {!hydrated && null}
    </div>
  );
}
