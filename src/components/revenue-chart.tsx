"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatMoney } from "@/lib/format";

export interface MonthDatum {
  label: string;
  paid: number;
  unpaid: number;
}

const compact = new Intl.NumberFormat("cs-CZ", {
  notation: "compact",
  maximumFractionDigits: 1,
});

interface TooltipProps {
  active?: boolean;
  payload?: { payload: MonthDatum }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const total = d.paid + d.unpaid;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold capitalize text-foreground">{label}</div>
      <div className="flex items-center justify-between gap-4 text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent" />
          Zaplaceno
        </span>
        <span className="tabular text-foreground">{formatMoney(d.paid)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent/35" />
          Nezaplaceno
        </span>
        <span className="tabular text-foreground">{formatMoney(d.unpaid)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-4 border-t border-border pt-1 font-medium">
        <span>Celkem</span>
        <span className="tabular">{formatMoney(total)}</span>
      </div>
    </div>
  );
}

export function RevenueChart({ data }: { data: MonthDatum[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            dy={4}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(v: number) => (v ? compact.format(v) : "0")}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          />
          <Bar
            dataKey="paid"
            stackId="a"
            fill="var(--accent)"
            radius={[0, 0, 0, 0]}
            maxBarSize={44}
          />
          <Bar
            dataKey="unpaid"
            stackId="a"
            fill="var(--accent)"
            fillOpacity={0.32}
            radius={[6, 6, 0, 0]}
            maxBarSize={44}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
