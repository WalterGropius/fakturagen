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
  ChevronDown,
  Info,
  UserPlus,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import {
  processPdf,
  parsedToInvoice,
  type ParsedInvoice,
} from "@/lib/pdf-import";
import type { ParsedParty } from "@/lib/pdf-parse";
import { formatMoney, czPlural } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Button, Card, Input, Badge, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";

interface Row extends ParsedInvoice {
  include: boolean;
  duplicate: "hash" | "number" | null;
  expanded: boolean;
}

/** Pole, která se z PDF nepovedla vyčíst — ať uživatel ví, co dohlédnout. */
function missingFields(row: Row): string[] {
  const missing: string[] = [];
  if (!row.found.number) missing.push("číslo");
  if (!row.found.client) missing.push("odběratel");
  if (!row.found.issueDate) missing.push("datum");
  if (!row.found.total) missing.push("částka");
  return missing;
}

export default function ImportPage() {
  const hydrated = useHydrated();
  const invoices = useStore((s) => s.invoices);
  const clients = useStore((s) => s.clients);
  const settings = useStore((s) => s.settings);
  const addInvoice = useStore((s) => s.addInvoice);
  const addClient = useStore((s) => s.addClient);

  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveClients, setSaveClients] = useState(true);
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
        newRows.push({
          ...parsed,
          include: duplicate !== "hash",
          duplicate,
          expanded: false,
        });
      } catch (e) {
        const reason = e instanceof Error ? e.message : "Soubor se nepodařilo přečíst.";
        newErrors.push(`„${file.name}“ — ${reason}`);
      }
    }

    setRows((prev) => [...prev, ...newRows]);
    setErrors(newErrors);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const update = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const updateClient = (i: number, patch: Partial<ParsedParty>) =>
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === i ? { ...r, client: { ...r.client, ...patch } } : r,
      ),
    );
  const remove = (i: number) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));

  const runImport = () => {
    const chosen = rows.filter((r) => r.include && r.duplicate !== "hash");
    const knownClients = new Map(
      clients.map((c) => [(c.ico || c.name).trim().toLowerCase(), c]),
    );

    for (const row of chosen) {
      const invoice = parsedToInvoice(row, settings);
      const key = (row.client.ico || row.client.name).trim().toLowerCase();
      if (saveClients && row.client.name && key && !knownClients.has(key)) {
        const created = addClient({
          name: row.client.name,
          street: row.client.street,
          city: row.client.city,
          zip: row.client.zip,
          ico: row.client.ico || undefined,
          dic: row.client.dic || undefined,
          email: row.client.email || undefined,
          phone: row.client.phone || undefined,
        });
        knownClients.set(key, created);
        invoice.clientId = created.id;
      } else if (key) {
        invoice.clientId = knownClients.get(key)?.id;
      }
      addInvoice(invoice);
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
              <TriangleAlert className="size-4 shrink-0" /> {e}
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
            {rows.map((r, i) => {
              const missing = missingFields(r);
              return (
                <Card
                  key={r.hash + i}
                  className={cn("p-4", r.duplicate === "hash" && "opacity-60")}
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
                      {missing.length > 0 && (
                        <Badge tone="warning">
                          Zkontrolujte: {missing.join(", ")}
                        </Badge>
                      )}
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
                        value={r.client.name}
                        onChange={(e) => updateClient(i, { name: e.target.value })}
                        className="mt-1"
                        placeholder="Název firmy"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      IČO odběratele
                      <Input
                        value={r.client.ico}
                        onChange={(e) => updateClient(i, { ico: e.target.value })}
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
                      Datum splatnosti
                      <Input
                        type="date"
                        value={r.dueDate}
                        onChange={(e) => update(i, { dueDate: e.target.value })}
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
                    <div className="flex items-end pb-2.5 text-sm font-medium tabular">
                      {formatMoney(r.total, r.currency)}
                    </div>
                  </div>

                  <button
                    onClick={() => update(i, { expanded: !r.expanded })}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 transition-transform",
                        r.expanded && "rotate-180",
                      )}
                    />
                    Adresa a položky
                    {r.items.length > 0 && (
                      <span className="text-accent">
                        · {r.items.length}{" "}
                        {czPlural(r.items.length, "položka", "položky", "položek")}
                      </span>
                    )}
                  </button>

                  {r.expanded && (
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs text-muted-foreground lg:col-span-2">
                          Ulice a číslo
                          <Input
                            value={r.client.street}
                            onChange={(e) =>
                              updateClient(i, { street: e.target.value })
                            }
                            className="mt-1"
                          />
                        </label>
                        <label className="text-xs text-muted-foreground">
                          PSČ
                          <Input
                            value={r.client.zip}
                            onChange={(e) => updateClient(i, { zip: e.target.value })}
                            className="mt-1"
                          />
                        </label>
                        <label className="text-xs text-muted-foreground">
                          Město
                          <Input
                            value={r.client.city}
                            onChange={(e) =>
                              updateClient(i, { city: e.target.value })
                            }
                            className="mt-1"
                          />
                        </label>
                        <label className="text-xs text-muted-foreground">
                          DIČ odběratele
                          <Input
                            value={r.client.dic}
                            onChange={(e) => updateClient(i, { dic: e.target.value })}
                            className="mt-1"
                          />
                        </label>
                        <label className="text-xs text-muted-foreground">
                          Variabilní symbol
                          <Input
                            value={r.variableSymbol}
                            onChange={(e) =>
                              update(i, {
                                variableSymbol: e.target.value.replace(/\D/g, ""),
                              })
                            }
                            className="mt-1"
                          />
                        </label>
                      </div>

                      {r.items.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50 text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium">
                                  Popis
                                </th>
                                <th className="px-3 py-2 text-right font-medium">
                                  Množství
                                </th>
                                <th className="px-3 py-2 text-right font-medium">
                                  J. cena
                                </th>
                                <th className="px-3 py-2 text-right font-medium">
                                  Celkem
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.items.map((it, idx) => (
                                <tr key={idx} className="border-t border-border">
                                  <td className="max-w-[320px] px-3 py-2">
                                    {it.description}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-right tabular">
                                    {it.quantity} {it.unit}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-right tabular">
                                    {formatMoney(it.unitPrice, r.currency)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-right tabular font-medium">
                                    {formatMoney(it.total, r.currency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Rozpis položek se z PDF vyčíst nepodařilo — faktura
                          dostane jednu souhrnnou položku na celou částku.
                          Po importu ji můžete upravit.
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <label className="mt-4 flex items-center gap-2.5 text-sm text-muted-foreground">
            <Switch checked={saveClients} onChange={setSaveClients} />
            <UserPlus className="size-4" />
            Uložit nové odběratele mezi klienty
          </label>

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
