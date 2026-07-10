"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Upload, Search, FileText } from "lucide-react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { invoiceGrandTotal } from "@/lib/invoice";
import { statusMeta, STATUS_FILTERS } from "@/lib/status";
import { formatMoney, formatDate, czPlural } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button, Input, Badge } from "@/components/ui";
import { cn } from "@/lib/cn";

type Filter = (typeof STATUS_FILTERS)[number]["value"];

export default function InvoicesPage() {
  const hydrated = useHydrated();
  const invoices = useStore((s) => s.invoices);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      const meta = statusMeta(inv);
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "overdue"
            ? meta.overdue
            : inv.status === filter;
      const matchesQuery =
        !q ||
        inv.number.toLowerCase().includes(q) ||
        inv.client.name.toLowerCase().includes(q) ||
        (inv.variableSymbol || "").includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [invoices, query, filter]);

  const sum = useMemo(
    () => filtered.reduce((acc, inv) => acc + invoiceGrandTotal(inv), 0),
    [filtered],
  );

  if (!hydrated) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-9 w-40 rounded-lg bg-muted" />
        <div className="h-64 rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Faktury"
        subtitle={
          invoices.length
            ? `${invoices.length} ${czPlural(invoices.length, "faktura", "faktury", "faktur")} celkem`
            : "Zde najdete všechny vystavené doklady"
        }
        actions={
          <>
            <Link href="/faktury/import">
              <Button variant="outline">
                <Upload className="size-4" /> Import PDF
              </Button>
            </Link>
            <Link href="/faktura/nova">
              <Button>
                <Plus className="size-4" /> Nová faktura
              </Button>
            </Link>
          </>
        }
      />

      {invoices.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-6" />}
          title="Zatím žádné faktury"
          description="Vytvořte první fakturu nebo naimportujte staré PDF doklady."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/faktura/nova">
                <Button>
                  <Plus className="size-4" /> Nová faktura
                </Button>
              </Link>
              <Link href="/faktury/import">
                <Button variant="outline">
                  <Upload className="size-4" /> Importovat
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    filter === f.value
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Hledat číslo, klienta, VS…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {/* Hlavička tabulky (desktop) */}
            <div className="hidden grid-cols-[1fr_1fr_auto_auto_auto] gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
              <span>Číslo / odběratel</span>
              <span>Vystaveno · splatnost</span>
              <span className="text-right">Částka</span>
              <span className="text-center">Stav</span>
              <span />
            </div>

            <div className="divide-y divide-border">
              {filtered.map((inv) => {
                const meta = statusMeta(inv);
                return (
                  <Link
                    key={inv.id}
                    href={`/faktura/${inv.id}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 md:grid-cols-[1fr_1fr_auto_auto_auto] md:gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {inv.client.name || "Bez odběratele"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {inv.number}
                        </div>
                      </div>
                    </div>

                    <div className="hidden text-sm text-muted-foreground md:block">
                      {formatDate(inv.issueDate)}
                      <span className="mx-1 opacity-40">→</span>
                      {formatDate(inv.dueDate)}
                    </div>

                    <div className="text-right font-semibold tabular text-foreground md:min-w-28">
                      {formatMoney(invoiceGrandTotal(inv), inv.currency)}
                    </div>

                    <div className="hidden justify-center md:flex">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>

                    <div className="col-start-2 row-start-1 hidden justify-self-end md:col-auto md:row-auto md:block" />
                  </Link>
                );
              })}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Žádná faktura neodpovídá filtru.
            </p>
          ) : (
            <div className="mt-3 flex justify-between px-1 text-sm text-muted-foreground">
              <span>
                {filtered.length}{" "}
                {czPlural(filtered.length, "faktura", "faktury", "faktur")}
              </span>
              <span>
                Součet:{" "}
                <span className="font-semibold text-foreground">
                  {formatMoney(sum)}
                </span>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
