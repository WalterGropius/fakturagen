"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UserRound,
  ListPlus,
  Wallet,
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Users,
  TriangleAlert,
  Save,
} from "lucide-react";
import type { Invoice, InvoiceItem, Client } from "@/lib/types";
import { useStore, clientToParty } from "@/lib/store";
import {
  newItem,
  invoiceTotals,
  variableSymbolFromNumber,
  buildInvoiceNumber,
} from "@/lib/invoice";
import { formatMoney } from "@/lib/format";
import {
  PAYMENT_METHODS,
  ROUNDING_OPTIONS,
  CURRENCIES,
  UNITS,
  VAT_RATES,
} from "@/lib/constants";
import { Button, Input, Textarea, Select, Field, Switch, Badge } from "./ui";
import { AresLookup } from "./ares-lookup";
import { InvoiceDocument } from "./invoice-document";
import { cn } from "@/lib/cn";

const STEPS = [
  { title: "Odběratel", icon: UserRound },
  { title: "Položky", icon: ListPlus },
  { title: "Platba a detaily", icon: Wallet },
];

export function InvoiceEditor({
  initial,
  mode,
}: {
  initial: Invoice;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const clients = useStore((s) => s.clients);
  const logo = useStore((s) => s.settings.appearance.logo);
  const docAppearance = useStore((s) => s.settings.appearance.document);
  const accent = useStore((s) => s.settings.appearance.accent);
  const numbering = useStore((s) => s.settings.numbering);
  const addInvoice = useStore((s) => s.addInvoice);
  const updateInvoice = useStore((s) => s.updateInvoice);
  const addClient = useStore((s) => s.addClient);
  const bumpNextNumber = useStore((s) => s.bumpNextNumber);

  const [draft, setDraft] = useState<Invoice>(initial);
  const [step, setStep] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [vsAuto, setVsAuto] = useState(
    initial.variableSymbol === variableSymbolFromNumber(initial.number),
  );
  const [saveClient, setSaveClient] = useState(false);

  const patch = (p: Partial<Invoice>) => setDraft((d) => ({ ...d, ...p }));
  const patchClient = (p: Partial<Invoice["client"]>) =>
    setDraft((d) => ({ ...d, client: { ...d.client, ...p } }));

  const setNumber = (number: string) =>
    setDraft((d) => ({
      ...d,
      number,
      variableSymbol: vsAuto
        ? variableSymbolFromNumber(number)
        : d.variableSymbol,
    }));

  const updateItem = (id: string, p: Partial<InvoiceItem>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((it) => (it.id === id ? { ...it, ...p } : it)),
    }));
  const addItem = () =>
    setDraft((d) => ({
      ...d,
      items: [...d.items, newItem(d.vatPayer ? 21 : 0)],
    }));
  const removeItem = (id: string) =>
    setDraft((d) => ({
      ...d,
      items: d.items.length > 1 ? d.items.filter((it) => it.id !== id) : d.items,
    }));

  const totals = useMemo(
    () =>
      invoiceTotals(draft.items, {
        vatPayer: draft.vatPayer,
        rounding: draft.rounding,
      }),
    [draft.items, draft.vatPayer, draft.rounding],
  );

  const pickClient = (c: Client) => {
    setDraft((d) => ({ ...d, client: clientToParty(c), clientId: c.id }));
  };

  const canProceed = step === 0 ? draft.client.name.trim().length > 0 : true;

  const save = (status: Invoice["status"]) => {
    const now = new Date().toISOString();
    let clientId = draft.clientId;
    if (saveClient && !clientId && draft.client.name.trim()) {
      const created = addClient({
        name: draft.client.name,
        person: draft.client.person,
        street: draft.client.street,
        city: draft.client.city,
        zip: draft.client.zip,
        country: draft.client.country,
        ico: draft.client.ico,
        dic: draft.client.dic,
        email: draft.client.email,
        phone: draft.client.phone,
      });
      clientId = created.id;
    }
    const final: Invoice = { ...draft, clientId, status, updatedAt: now };

    if (mode === "create") {
      addInvoice(final);
      // Posuň čítač, pokud číslo odpovídá navrženému
      if (draft.number === buildInvoiceNumber(numbering)) bumpNextNumber();
    } else {
      updateInvoice(final.id, final);
    }
    router.push(`/faktura/${final.id}`);
  };

  const supplierMissing = !draft.supplier.name.trim();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
      {/* Formulář */}
      <div className="min-w-0">
        {/* Stepper */}
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((st, i) => {
            const Icon = st.icon;
            const active = i === step;
            const done = i < step;
            return (
              <button
                key={st.title}
                onClick={() => setStep(i)}
                className="flex flex-1 items-center gap-2.5"
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors",
                    active && "bg-accent text-accent-foreground",
                    done && "bg-accent-soft text-accent",
                    !active && !done && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                </span>
                <span
                  className={cn(
                    "hidden text-sm font-medium sm:block",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {st.title}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="mx-1 hidden h-px flex-1 bg-border sm:block" />
                )}
              </button>
            );
          })}
        </div>

        {supplierMissing && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <span>
              Nemáte vyplněné údaje dodavatele.{" "}
              <Link href="/nastaveni" className="font-medium underline">
                Doplňte je v nastavení
              </Link>{" "}
              — propíšou se do faktury.
            </span>
          </div>
        )}

        {/* Krok 1 — Odběratel */}
        {step === 0 && (
          <div className="space-y-5">
            {clients.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="size-4" /> Vaši klienti
                </div>
                <div className="flex flex-wrap gap-2">
                  {clients.slice(0, 12).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => pickClient(c)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                        draft.clientId === c.id
                          ? "border-accent bg-accent-soft"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <span className="block font-medium text-foreground">
                        {c.name}
                      </span>
                      {c.ico && (
                        <span className="block text-xs text-muted-foreground">
                          IČO {c.ico}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> nebo nový odběratel{" "}
                  <span className="h-px flex-1 bg-border" />
                </div>
              </div>
            )}

            <Field
              label="Načíst firmu z ARES"
              hint="Zadejte IČO a údaje doplníme z obchodního rejstříku."
            >
              <AresLookup
                ico={draft.client.ico || ""}
                onIcoChange={(ico) => patchClient({ ico })}
                onLoaded={(c) =>
                  setDraft((d) => ({
                    ...d,
                    clientId: undefined,
                    client: {
                      ...d.client,
                      name: c.name,
                      ico: c.ico,
                      dic: c.dic,
                      street: c.street,
                      city: c.city,
                      zip: c.zip,
                      country: c.country,
                    },
                  }))
                }
              />
            </Field>

            <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
              <Field label="Firma / jméno" required className="sm:col-span-2">
                <Input
                  value={draft.client.name}
                  onChange={(e) => patchClient({ name: e.target.value })}
                  placeholder="Odběratel s.r.o."
                />
              </Field>
              <Field label="Kontaktní osoba">
                <Input
                  value={draft.client.person || ""}
                  onChange={(e) => patchClient({ person: e.target.value })}
                />
              </Field>
              <Field label="E-mail">
                <Input
                  value={draft.client.email || ""}
                  onChange={(e) => patchClient({ email: e.target.value })}
                />
              </Field>
              <Field label="Ulice a číslo" className="sm:col-span-2">
                <Input
                  value={draft.client.street}
                  onChange={(e) => patchClient({ street: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-[7rem_1fr] gap-3">
                <Field label="PSČ">
                  <Input
                    value={draft.client.zip}
                    onChange={(e) => patchClient({ zip: e.target.value })}
                  />
                </Field>
                <Field label="Město">
                  <Input
                    value={draft.client.city}
                    onChange={(e) => patchClient({ city: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="IČO">
                  <Input
                    value={draft.client.ico || ""}
                    onChange={(e) => patchClient({ ico: e.target.value })}
                  />
                </Field>
                <Field label="DIČ">
                  <Input
                    value={draft.client.dic || ""}
                    onChange={(e) => patchClient({ dic: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            {!draft.clientId && draft.client.name.trim() && (
              <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Switch checked={saveClient} onChange={setSaveClient} />
                Uložit tohoto odběratele mezi klienty
              </label>
            )}
          </div>
        )}

        {/* Krok 2 — Položky */}
        {step === 1 && (
          <div className="space-y-3">
            {draft.items.map((item, idx) => {
              const base =
                item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Položka {idx + 1}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={draft.items.length === 1}
                      className="text-muted-foreground transition-colors hover:text-danger disabled:opacity-30"
                      aria-label="Odebrat položku"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, { description: e.target.value })
                    }
                    placeholder="Popis položky — např. Konzultace, Návrh loga…"
                    className="mb-3"
                  />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Field label="Množství">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, {
                            quantity: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </Field>
                    <Field label="MJ">
                      <Select
                        value={item.unit}
                        onChange={(e) =>
                          updateItem(item.id, { unit: e.target.value })
                        }
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Cena za MJ">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(item.id, {
                            unitPrice: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </Field>
                    {draft.vatPayer ? (
                      <Field label="DPH">
                        <Select
                          value={item.vatRate}
                          onChange={(e) =>
                            updateItem(item.id, {
                              vatRate: Number(e.target.value),
                            })
                          }
                        >
                          {VAT_RATES.map((r) => (
                            <option key={r} value={r}>
                              {r} %
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ) : (
                      <Field label="Sleva %">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={item.discount || 0}
                          onChange={(e) =>
                            updateItem(item.id, {
                              discount: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </Field>
                    )}
                  </div>
                  {draft.vatPayer && (
                    <div className="mt-3">
                      <Field label="Sleva %">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={item.discount || 0}
                          onChange={(e) =>
                            updateItem(item.id, {
                              discount: Number(e.target.value) || 0,
                            })
                          }
                          className="max-w-32"
                        />
                      </Field>
                    </div>
                  )}
                  <div className="mt-3 flex justify-end border-t border-border pt-2 text-sm">
                    <span className="text-muted-foreground">Celkem bez DPH:&nbsp;</span>
                    <span className="font-semibold tabular">
                      {formatMoney(base, draft.currency)}
                    </span>
                  </div>
                </div>
              );
            })}

            <Button variant="secondary" onClick={addItem} className="w-full">
              <Plus className="size-4" /> Přidat položku
            </Button>

            <div className="flex items-center justify-between rounded-2xl bg-accent-soft px-4 py-3">
              <span className="font-medium">Celkem k úhradě</span>
              <span className="font-display text-lg font-bold tabular text-accent">
                {formatMoney(totals.total, draft.currency)}
              </span>
            </div>
          </div>
        )}

        {/* Krok 3 — Platba a detaily */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Číslo faktury" required>
                <Input
                  value={draft.number}
                  onChange={(e) => setNumber(e.target.value)}
                />
              </Field>
              <Field label="Variabilní symbol">
                <Input
                  value={draft.variableSymbol}
                  onChange={(e) => {
                    setVsAuto(false);
                    patch({
                      variableSymbol: e.target.value.replace(/\D/g, "").slice(0, 10),
                    });
                  }}
                />
              </Field>
              <Field label="Datum vystavení">
                <Input
                  type="date"
                  value={draft.issueDate}
                  onChange={(e) => patch({ issueDate: e.target.value })}
                />
              </Field>
              <Field label="Datum splatnosti">
                <Input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => patch({ dueDate: e.target.value })}
                />
              </Field>
              <Field label="Datum uskutečnění plnění (DUZP)">
                <Input
                  type="date"
                  value={draft.taxDate}
                  onChange={(e) => patch({ taxDate: e.target.value })}
                />
              </Field>
              <Field label="Číslo objednávky">
                <Input
                  value={draft.orderNumber || ""}
                  onChange={(e) => patch({ orderNumber: e.target.value })}
                />
              </Field>
              <Field label="Forma úhrady">
                <Select
                  value={draft.paymentMethod}
                  onChange={(e) =>
                    patch({
                      paymentMethod: e.target
                        .value as Invoice["paymentMethod"],
                    })
                  }
                >
                  {PAYMENT_METHODS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Měna">
                  <Select
                    value={draft.currency}
                    onChange={(e) => patch({ currency: e.target.value })}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Zaokrouhlení">
                  <Select
                    value={draft.rounding}
                    onChange={(e) =>
                      patch({ rounding: e.target.value as Invoice["rounding"] })
                    }
                  >
                    {ROUNDING_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            <Field label="Poznámka na faktuře">
              <Textarea
                value={draft.note || ""}
                onChange={(e) => patch({ note: e.target.value })}
                placeholder="Např. Fakturuji na základě smlouvy ze dne…"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vystavil">
                <Input
                  value={draft.issuedBy || ""}
                  onChange={(e) => patch({ issuedBy: e.target.value })}
                />
              </Field>
              <div className="flex items-end">
                <label className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-2.5">
                  <span className="text-sm font-medium">QR platba</span>
                  <Switch
                    checked={draft.qrPayment}
                    onChange={(v) => patch({ qrPayment: v })}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Navigace */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? router.back() : setStep(step - 1))}
          >
            <ChevronLeft className="size-4" />
            {step === 0 ? "Zpět" : "Předchozí"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setShowPreview((v) => !v)}
              aria-label="Náhled"
            >
              {showPreview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed}>
                Pokračovat <ChevronRight className="size-4" />
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => save("draft")}>
                  <Save className="size-4" /> Uložit koncept
                </Button>
                <Button onClick={() => save("issued")}>
                  <Check className="size-4" />
                  {mode === "create" ? "Vystavit fakturu" : "Uložit"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Náhled */}
      <div
        className={cn(
          "lg:sticky lg:top-6 lg:block lg:h-fit",
          showPreview ? "block" : "hidden",
        )}
      >
        <div className="mb-2 hidden items-center justify-between lg:flex">
          <span className="text-sm font-medium text-muted-foreground">
            Živý náhled
          </span>
          <Badge tone="accent">{formatMoney(totals.total, draft.currency)}</Badge>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
          <div className="max-h-[80dvh] overflow-y-auto bg-neutral-100 p-3 dark:bg-neutral-900">
            <InvoiceDocument
              invoice={draft}
              logo={logo}
              appearance={docAppearance}
              accent={accent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
