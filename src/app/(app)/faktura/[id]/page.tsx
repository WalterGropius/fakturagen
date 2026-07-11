"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  FileDown,
  Pencil,
  Copy,
  Trash2,
  CircleCheck,
  Send,
  FileText,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import type { Invoice } from "@/lib/types";
import { draftFromSettings, uid, buildInvoiceNumber } from "@/lib/invoice";
import { statusMeta } from "@/lib/status";
import { formatMoney, formatDate, todayIso, addDays } from "@/lib/format";
import { invoiceGrandTotal, variableSymbolFromNumber } from "@/lib/invoice";
import { EmptyState } from "@/components/page-header";
import { Button, Card, Badge, Select } from "@/components/ui";
import { InvoiceDocument } from "@/components/invoice-document";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useHydrated();
  const invoice = useStore((s) => s.invoices.find((i) => i.id === id));
  const logo = useStore((s) => s.settings.appearance.logo);
  const numbering = useStore((s) => s.settings.numbering);
  const setInvoiceStatus = useStore((s) => s.setInvoiceStatus);
  const addInvoice = useStore((s) => s.addInvoice);
  const bumpNextNumber = useStore((s) => s.bumpNextNumber);
  const removeInvoice = useStore((s) => s.removeInvoice);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-[820px] animate-pulse space-y-4">
        <div className="h-10 w-full rounded-xl bg-muted" />
        <div className="h-[70vh] w-full rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <EmptyState
        icon={<FileText className="size-6" />}
        title="Faktura nenalezena"
        description="Tato faktura možná byla smazána nebo odkaz není platný."
        action={
          <Link href="/faktury">
            <Button variant="outline">Zpět na faktury</Button>
          </Link>
        }
      />
    );
  }

  const meta = statusMeta(invoice);

  const duplicate = () => {
    const issue = todayIso();
    const number = buildInvoiceNumber(numbering);
    const copy: Invoice = {
      ...structuredClone(invoice),
      id: uid(),
      number,
      variableSymbol: variableSymbolFromNumber(number),
      issueDate: issue,
      dueDate: addDays(issue, 14),
      taxDate: issue,
      status: "draft",
      imported: false,
      sourceHash: undefined,
      sourceFileName: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addInvoice(copy);
    if (number === buildInvoiceNumber(numbering)) bumpNextNumber();
    router.push(`/faktura/${copy.id}/upravit`);
  };

  const del = () => {
    if (confirm(`Opravdu smazat fakturu ${invoice.number}?`)) {
      removeInvoice(invoice.id);
      router.push("/faktury");
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="no-print mb-5 flex flex-col gap-3">
        <Link
          href="/faktury"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Faktury
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Faktura {invoice.number}
            </h1>
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {invoice.imported && <Badge tone="neutral">Import</Badge>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={invoice.status}
              onChange={(e) =>
                setInvoiceStatus(invoice.id, e.target.value as Invoice["status"])
              }
              className="h-10 w-40"
              aria-label="Stav faktury"
            >
              <option value="draft">Rozpracováno</option>
              <option value="issued">Vystaveno</option>
              <option value="paid">Zaplaceno</option>
            </Select>
            {invoice.status !== "paid" && (
              <Button
                variant="secondary"
                onClick={() => setInvoiceStatus(invoice.id, "paid")}
              >
                <CircleCheck className="size-4" /> Zaplaceno
              </Button>
            )}
            <Link href={`/faktura/${invoice.id}/upravit`}>
              <Button variant="outline">
                <Pencil className="size-4" /> Upravit
              </Button>
            </Link>
            <Button variant="outline" onClick={duplicate} aria-label="Duplikovat">
              <Copy className="size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={del}
              aria-label="Smazat"
              className="text-muted-foreground hover:text-danger"
            >
              <Trash2 className="size-4" />
            </Button>
            <Button onClick={() => window.print()}>
              <FileDown className="size-4" /> Stáhnout PDF
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {invoice.client.name} · {formatMoney(invoiceGrandTotal(invoice), invoice.currency)} ·
          splatnost {formatDate(invoice.dueDate)}
        </p>
      </div>

      {/* Dokument */}
      <Card className="print-page overflow-hidden border-border bg-neutral-100 p-3 dark:bg-neutral-900 print:border-0 print:bg-white print:p-0 print:shadow-none">
        <div className="mx-auto max-w-[820px] rounded-xl bg-white shadow-sm print:rounded-none print:shadow-none">
          <InvoiceDocument invoice={invoice} logo={logo} />
        </div>
      </Card>

      <p className="no-print mt-3 text-center text-xs text-muted-foreground">
        Tip: v dialogu tisku zvolte „Uložit jako PDF" pro stažení souboru.
      </p>
    </div>
  );
}
