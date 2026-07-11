"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Invoice } from "@/lib/types";
import { useStore, clientToParty } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { draftFromSettings } from "@/lib/invoice";
import { PageHeader } from "@/components/page-header";
import { InvoiceEditor } from "@/components/invoice-editor";

function EditorSkeleton() {
  return (
    <div className="grid animate-pulse gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
      <div className="space-y-4">
        <div className="h-10 w-full rounded-xl bg-muted" />
        <div className="h-64 w-full rounded-2xl bg-muted" />
      </div>
      <div className="hidden h-[70vh] rounded-2xl bg-muted lg:block" />
    </div>
  );
}

function NovaFakturaInner() {
  const hydrated = useHydrated();
  const settings = useStore((s) => s.settings);
  const getClient = useStore((s) => s.getClient);
  const searchParams = useSearchParams();
  const klientId = searchParams.get("klient");
  const [initial, setInitial] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!hydrated || initial) return;
    const draft = draftFromSettings(settings);
    if (klientId) {
      const c = getClient(klientId);
      if (c) {
        draft.client = clientToParty(c);
        draft.clientId = c.id;
      }
    }
    setInitial(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  return (
    <div>
      <PageHeader
        title="Nová faktura"
        subtitle="Ve třech krocích k hotovému dokladu"
      />
      {!hydrated || !initial ? (
        <EditorSkeleton />
      ) : (
        <InvoiceEditor initial={initial} mode="create" />
      )}
    </div>
  );
}

export default function NovaFakturaPage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <NovaFakturaInner />
    </Suspense>
  );
}
