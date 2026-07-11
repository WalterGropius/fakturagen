"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Mail,
  Phone,
  FilePlus,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import type { Client } from "@/lib/types";
import { czPlural } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button, Card, Input, Field, Modal, Badge } from "@/components/ui";
import { AresLookup } from "@/components/ares-lookup";

type Draft = Omit<Client, "id" | "createdAt">;

const EMPTY: Draft = {
  name: "",
  person: "",
  ico: "",
  dic: "",
  street: "",
  city: "",
  zip: "",
  email: "",
  phone: "",
  note: "",
  country: "Česká republika",
};

function ClientForm({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
}) {
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  return (
    <div className="space-y-4">
      <Field label="Načíst z rejstříku" hint="Zadejte IČO a doplníme zbytek.">
        <AresLookup
          ico={draft.ico || ""}
          onIcoChange={(ico) => set({ ico })}
          onLoaded={(c) =>
            set({
              name: c.name || draft.name,
              ico: c.ico,
              dic: c.dic,
              street: c.street,
              city: c.city,
              zip: c.zip,
              country: c.country,
            })
          }
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Firma / jméno" required className="sm:col-span-2">
          <Input
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Např. Alza.cz a.s."
          />
        </Field>
        <Field label="Kontaktní osoba">
          <Input
            value={draft.person || ""}
            onChange={(e) => set({ person: e.target.value })}
          />
        </Field>
        <Field label="E-mail">
          <Input
            type="email"
            value={draft.email || ""}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
        <Field label="Ulice a číslo" className="sm:col-span-2">
          <Input
            value={draft.street}
            onChange={(e) => set({ street: e.target.value })}
          />
        </Field>
        <Field label="PSČ">
          <Input
            value={draft.zip}
            onChange={(e) => set({ zip: e.target.value })}
          />
        </Field>
        <Field label="Město">
          <Input
            value={draft.city}
            onChange={(e) => set({ city: e.target.value })}
          />
        </Field>
        <Field label="IČO">
          <Input
            value={draft.ico || ""}
            onChange={(e) => set({ ico: e.target.value })}
          />
        </Field>
        <Field label="DIČ">
          <Input
            value={draft.dic || ""}
            onChange={(e) => set({ dic: e.target.value })}
          />
        </Field>
        <Field label="Telefon">
          <Input
            value={draft.phone || ""}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const hydrated = useHydrated();
  const clients = useStore((s) => s.clients);
  const addClient = useStore((s) => s.addClient);
  const updateClient = useStore((s) => s.updateClient);
  const removeClient = useStore((s) => s.removeClient);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.person, c.ico, c.city, c.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [clients, query]);

  const openNew = () => {
    setEditing(null);
    setDraft(EMPTY);
    setOpen(true);
  };
  const openEdit = (c: Client) => {
    setEditing(c);
    const { id: _id, createdAt: _createdAt, ...rest } = c;
    void _id;
    void _createdAt;
    setDraft({ ...EMPTY, ...rest });
    setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) return;
    if (editing) updateClient(editing.id, draft);
    else addClient(draft);
    setOpen(false);
  };

  const del = (c: Client) => {
    if (confirm(`Opravdu smazat klienta „${c.name}"?`)) removeClient(c.id);
  };

  if (!hydrated) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-9 w-40 rounded-lg bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Klienti"
        subtitle={
          clients.length
            ? `${clients.length} ${czPlural(clients.length, "uložený klient", "uložení klienti", "uložených klientů")}`
            : "Uložte si odběratele pro rychlejší fakturaci"
        }
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" /> Nový klient
          </Button>
        }
      />

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title="Zatím žádní klienti"
          description="Přidejte odběratele podle IČO z ARES nebo ručně. Příště ho vyberete jedním kliknutím."
          action={
            <Button onClick={openNew}>
              <Plus className="size-4" /> Přidat klienta
            </Button>
          }
        />
      ) : (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hledat klienta…"
              className="pl-9"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Card key={c.id} className="group flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-foreground">
                      {c.name}
                    </div>
                    {c.person && (
                      <div className="truncate text-sm text-muted-foreground">
                        {c.person}
                      </div>
                    )}
                  </div>
                  {c.ico && <Badge tone="neutral">IČO {c.ico}</Badge>}
                </div>

                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {(c.street || c.city) && (
                    <div className="truncate">
                      {[c.street, c.zip, c.city].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="size-3.5 shrink-0" /> {c.email}
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3.5 shrink-0" /> {c.phone}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                  <Link href={`/faktura/nova?klient=${c.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      <FilePlus className="size-4" /> Fakturovat
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(c)}
                    aria-label="Upravit"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => del(c)}
                    aria-label="Smazat"
                    className="text-muted-foreground hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nic nenalezeno.
            </p>
          )}
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Upravit klienta" : "Nový klient"}
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={save} disabled={!draft.name.trim()}>
              {editing ? "Uložit změny" : "Přidat klienta"}
            </Button>
          </>
        }
      >
        <ClientForm draft={draft} setDraft={setDraft} />
      </Modal>
    </div>
  );
}
