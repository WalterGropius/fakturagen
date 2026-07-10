"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Wallet,
  Clock,
  TriangleAlert,
  Plus,
  ArrowRight,
  FileText,
  Upload,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { invoiceGrandTotal } from "@/lib/invoice";
import { statusMeta } from "@/lib/status";
import { formatMoney, formatDate, monthNameShort } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Card, Button, Badge, Select } from "@/components/ui";
import { RevenueChart, type MonthDatum } from "@/components/revenue-chart";

function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "text-foreground",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-accent">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className={`mt-2 font-display text-2xl font-semibold tabular ${tone}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-9 w-48 rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-muted" />
    </div>
  );
}

export default function DashboardPage() {
  const hydrated = useHydrated();
  const invoices = useStore((s) => s.invoices);
  const clients = useStore((s) => s.clients);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    for (const inv of invoices)
      set.add(Number(inv.issueDate.slice(0, 4)) || currentYear);
    return [...set].sort((a, b) => b - a);
  }, [invoices, currentYear]);

  const { months, stats } = useMemo(() => {
    const yearInvoices = invoices.filter(
      (i) => i.issueDate.slice(0, 4) === String(year) && i.status !== "draft",
    );
    const months: MonthDatum[] = Array.from({ length: 12 }, (_, m) => ({
      label: monthNameShort(m),
      paid: 0,
      unpaid: 0,
    }));
    let paid = 0;
    let unpaid = 0;
    let overdueSum = 0;
    let overdueCount = 0;
    for (const inv of yearInvoices) {
      const total = invoiceGrandTotal(inv);
      const m = new Date(inv.issueDate).getMonth();
      if (inv.status === "paid") {
        months[m].paid += total;
        paid += total;
      } else {
        months[m].unpaid += total;
        unpaid += total;
        if (statusMeta(inv).overdue) {
          overdueSum += total;
          overdueCount++;
        }
      }
    }
    return {
      months,
      stats: {
        total: paid + unpaid,
        paid,
        unpaid,
        overdueSum,
        overdueCount,
        count: yearInvoices.length,
      },
    };
  }, [invoices, year]);

  const recent = invoices.slice(0, 6);

  if (!hydrated) return <DashboardSkeleton />;

  if (invoices.length === 0) {
    return (
      <div>
        <PageHeader
          title="Vítejte ve Fakturce"
          subtitle="Začněte první fakturou nebo si nahrajte ty staré."
        />
        <EmptyState
          icon={<Sparkles className="size-6" />}
          title="Zatím tu nic není"
          description="Vytvořte první fakturu za minutu, nebo naimportujte staré PDF faktury a rovnou uvidíte statistiky."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/faktura/nova">
                <Button>
                  <Plus className="size-4" /> Nová faktura
                </Button>
              </Link>
              <Link href="/faktury/import">
                <Button variant="outline">
                  <Upload className="size-4" /> Importovat PDF
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Přehled"
        subtitle={`Vaše fakturace za rok ${year}`}
        actions={
          <div className="flex items-center gap-2">
            {years.length > 1 && (
              <Select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-10 w-28"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            )}
            <Link href="/faktura/nova">
              <Button>
                <Plus className="size-4" /> Nová faktura
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Vyfakturováno"
          value={formatMoney(stats.total)}
          sub={`${stats.count} ${czPlural(stats.count, "faktura", "faktury", "faktur")}`}
        />
        <StatCard
          icon={<Wallet className="size-4" />}
          label="Zaplaceno"
          value={formatMoney(stats.paid)}
          tone="text-success"
        />
        <StatCard
          icon={<Clock className="size-4" />}
          label="Čeká na zaplacení"
          value={formatMoney(stats.unpaid)}
          tone="text-warning"
        />
        <StatCard
          icon={<TriangleAlert className="size-4" />}
          label="Po splatnosti"
          value={formatMoney(stats.overdueSum)}
          sub={
            stats.overdueCount
              ? `${stats.overdueCount} ${czPlural(stats.overdueCount, "faktura", "faktury", "faktur")}`
              : "Vše v termínu"
          }
          tone={stats.overdueSum ? "text-danger" : "text-foreground"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Tržby po měsících</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-accent" /> Zaplaceno
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-accent/35" /> Nezaplaceno
              </span>
            </div>
          </div>
          <RevenueChart data={months} />
        </Card>

        <Card className="flex flex-col p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Poslední faktury</h2>
            <Link
              href="/faktury"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Vše <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="flex-1 space-y-1">
            {recent.map((inv) => {
              const meta = statusMeta(inv);
              return (
                <Link
                  key={inv.id}
                  href={`/faktura/${inv.id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted"
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {inv.client.name || "Bez odběratele"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {inv.number} · {formatDate(inv.issueDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular text-foreground">
                      {formatMoney(invoiceGrandTotal(inv), inv.currency)}
                    </div>
                    <Badge tone={meta.tone} className="mt-0.5">
                      {meta.label}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {clients.length > 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Máte uloženo {clients.length}{" "}
          {czPlural(clients.length, "klienta", "klienty", "klientů")}.{" "}
          <Link href="/klienti" className="font-medium text-accent hover:underline">
            Spravovat klienty
          </Link>
        </p>
      )}
    </div>
  );
}

function czPlural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
