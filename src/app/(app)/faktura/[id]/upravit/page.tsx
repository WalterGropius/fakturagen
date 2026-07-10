"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui";
import { InvoiceEditor } from "@/components/invoice-editor";
import { FileText } from "lucide-react";

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const hydrated = useHydrated();
  const invoice = useStore((s) => s.invoices.find((i) => i.id === id));

  if (!hydrated) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-9 w-48 rounded-lg bg-muted" />
        <div className="h-96 rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <EmptyState
        icon={<FileText className="size-6" />}
        title="Faktura nenalezena"
        action={
          <Link href="/faktury">
            <Button variant="outline">Zpět na faktury</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={`Úprava faktury ${invoice.number}`}
        subtitle="Změny se uloží k této faktuře"
      />
      <InvoiceEditor initial={invoice} mode="edit" />
    </div>
  );
}
