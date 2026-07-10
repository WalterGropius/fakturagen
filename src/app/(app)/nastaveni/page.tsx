"use client";

import { useRef, useState } from "react";
import {
  UserRound,
  Landmark,
  Hash,
  Palette,
  Receipt,
  Database,
  Sun,
  Moon,
  Monitor,
  Upload,
  Download,
  Trash2,
  ImagePlus,
  Check,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import type { Settings } from "@/lib/types";
import {
  ACCENTS,
  FONTS,
  PAYMENT_METHODS,
  ROUNDING_OPTIONS,
  CURRENCIES,
} from "@/lib/constants";
import { czAccountToIban, formatIban, bankName } from "@/lib/payment";
import { buildInvoiceNumber } from "@/lib/invoice";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  Button,
  Input,
  Field,
  Label,
  Select,
  Switch,
} from "@/components/ui";
import { AresLookup } from "@/components/ares-lookup";
import { cn } from "@/lib/cn";

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          {icon}
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  const hydrated = useHydrated();
  const s = useStore((st) => st.settings);
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const setSettings = (updater: (prev: Settings) => Settings) =>
    useStore.setState((st) => ({ settings: updater(st.settings) }));

  const setSupplier = (patch: Partial<Settings["supplier"]>) =>
    setSettings((p) => ({ ...p, supplier: { ...p.supplier, ...patch } }));
  const setBank = (patch: Partial<Settings["supplier"]["bank"]>) =>
    setSettings((p) => ({
      ...p,
      supplier: { ...p.supplier, bank: { ...p.supplier.bank, ...patch } },
    }));
  const setAppearance = (patch: Partial<Settings["appearance"]>) =>
    setSettings((p) => ({ ...p, appearance: { ...p.appearance, ...patch } }));
  const setInvoice = (patch: Partial<Settings["invoice"]>) =>
    setSettings((p) => ({ ...p, invoice: { ...p.invoice, ...patch } }));
  const setNumbering = (patch: Partial<Settings["numbering"]>) =>
    setSettings((p) => ({ ...p, numbering: { ...p.numbering, ...patch } }));

  const onLogo = (file?: File) => {
    setLogoError(null);
    if (!file) return;
    if (file.size > 600_000) {
      setLogoError("Logo je příliš velké (max 600 kB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAppearance({ logo: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const exportData = () => {
    const { settings, clients, invoices } = useStore.getState();
    const blob = new Blob(
      [JSON.stringify({ settings, clients, invoices }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fakturka-zaloha-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (
          confirm(
            "Načíst zálohu? Nahradí současná data (nastavení, klienty i faktury).",
          )
        ) {
          useStore.getState().importData(data);
        }
      } catch {
        alert("Soubor se nepodařilo načíst.");
      }
    };
    reader.readAsText(file);
  };

  if (!hydrated) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-9 w-40 rounded-lg bg-muted" />
        <div className="h-64 rounded-2xl bg-muted" />
      </div>
    );
  }

  const iban =
    s.supplier.bank.iban ||
    czAccountToIban(s.supplier.bank.accountNumber, s.supplier.bank.bankCode) ||
    "";
  const bank = bankName(s.supplier.bank.bankCode);

  return (
    <div>
      <PageHeader
        title="Nastavení"
        subtitle="Vaše údaje, vzhled a výchozí hodnoty faktur"
      />

      <div className="space-y-5">
        {/* Dodavatel */}
        <Section
          icon={<UserRound className="size-5" />}
          title="Dodavatel"
          description="Vaše údaje se předvyplní do každé faktury."
        >
          <Field label="Načíst mou firmu z ARES" className="mb-4">
            <AresLookup
              ico={s.supplier.ico || ""}
              onIcoChange={(ico) => setSupplier({ ico })}
              onLoaded={(c) =>
                setSupplier({
                  name: c.name || s.supplier.name,
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
            <Field label="Jméno / název firmy" required className="sm:col-span-2">
              <Input
                value={s.supplier.name}
                onChange={(e) => setSupplier({ name: e.target.value })}
                placeholder="Jan Novák / Firma s.r.o."
              />
            </Field>
            <Field label="Ulice a číslo">
              <Input
                value={s.supplier.street}
                onChange={(e) => setSupplier({ street: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-[7rem_1fr] gap-3">
              <Field label="PSČ">
                <Input
                  value={s.supplier.zip}
                  onChange={(e) => setSupplier({ zip: e.target.value })}
                />
              </Field>
              <Field label="Město">
                <Input
                  value={s.supplier.city}
                  onChange={(e) => setSupplier({ city: e.target.value })}
                />
              </Field>
            </div>
            <Field label="IČO">
              <Input
                value={s.supplier.ico || ""}
                onChange={(e) => setSupplier({ ico: e.target.value })}
              />
            </Field>
            <Field label="DIČ">
              <Input
                value={s.supplier.dic || ""}
                onChange={(e) => setSupplier({ dic: e.target.value })}
                placeholder="CZ12345678"
              />
            </Field>
            <Field label="Telefon">
              <Input
                value={s.supplier.phone || ""}
                onChange={(e) => setSupplier({ phone: e.target.value })}
              />
            </Field>
            <Field label="E-mail">
              <Input
                type="email"
                value={s.supplier.email || ""}
                onChange={(e) => setSupplier({ email: e.target.value })}
              />
            </Field>
            <Field label="Web">
              <Input
                value={s.supplier.web || ""}
                onChange={(e) => setSupplier({ web: e.target.value })}
              />
            </Field>
          </div>

          <label className="mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div>
              <div className="text-sm font-medium">Jsem plátce DPH</div>
              <div className="text-xs text-muted-foreground">
                Na fakturách se bude počítat a zobrazovat DPH.
              </div>
            </div>
            <Switch
              checked={s.supplier.vatPayer}
              onChange={(v) => setSupplier({ vatPayer: v })}
            />
          </label>
        </Section>

        {/* Banka */}
        <Section
          icon={<Landmark className="size-5" />}
          title="Bankovní spojení"
          description="Z čísla účtu vytvoříme IBAN a QR platbu."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Číslo účtu"
              hint="Včetně případného předčíslí, např. 19-2000145399"
            >
              <Input
                value={s.supplier.bank.accountNumber}
                onChange={(e) => setBank({ accountNumber: e.target.value })}
                placeholder="2000145399"
              />
            </Field>
            <Field label="Kód banky" hint={bank ? bank : "Např. 0800"}>
              <Input
                value={s.supplier.bank.bankCode}
                onChange={(e) =>
                  setBank({ bankCode: e.target.value.replace(/\D/g, "").slice(0, 4) })
                }
                placeholder="0800"
              />
            </Field>
          </div>
          {iban && (
            <div className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm">
              <span className="text-muted-foreground">IBAN: </span>
              <span className="font-medium tabular text-accent">
                {formatIban(iban)}
              </span>
            </div>
          )}
        </Section>

        {/* Číslování */}
        <Section
          icon={<Hash className="size-5" />}
          title="Číslování faktur"
          description="Číslo se u nové faktury navrhne samo, jde ale přepsat."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Prefix" hint="Volitelně před číslem">
              <Input
                value={s.numbering.prefix}
                onChange={(e) => setNumbering({ prefix: e.target.value })}
                placeholder="FA"
              />
            </Field>
            <Field label="Další pořadové číslo">
              <Input
                type="number"
                min={1}
                value={s.numbering.nextNumber}
                onChange={(e) =>
                  setNumbering({ nextNumber: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </Field>
            <Field label="Počet číslic" hint="Doplní se nuly">
              <Select
                value={s.numbering.pad}
                onChange={(e) => setNumbering({ pad: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <label className="mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div className="text-sm font-medium">Vkládat rok do čísla</div>
            <Switch
              checked={s.numbering.includeYear}
              onChange={(v) => setNumbering({ includeYear: v })}
            />
          </label>
          <p className="mt-3 text-sm text-muted-foreground">
            Další faktura bude mít číslo{" "}
            <span className="font-semibold text-foreground">
              {buildInvoiceNumber(s.numbering)}
            </span>
            .
          </p>
        </Section>

        {/* Výchozí hodnoty */}
        <Section
          icon={<Receipt className="size-5" />}
          title="Výchozí hodnoty faktury"
          description="Předvyplní se u každé nové faktury."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Splatnost (dní)">
              <Input
                type="number"
                min={0}
                value={s.invoice.dueDays}
                onChange={(e) =>
                  setInvoice({ dueDays: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </Field>
            <Field label="Forma úhrady">
              <Select
                value={s.invoice.paymentMethod}
                onChange={(e) =>
                  setInvoice({
                    paymentMethod: e.target.value as Settings["invoice"]["paymentMethod"],
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
            <Field label="Měna">
              <Select
                value={s.invoice.currency}
                onChange={(e) => setInvoice({ currency: e.target.value })}
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
                value={s.invoice.rounding}
                onChange={(e) =>
                  setInvoice({
                    rounding: e.target.value as Settings["invoice"]["rounding"],
                  })
                }
              >
                {ROUNDING_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Konstantní symbol">
              <Input
                value={s.invoice.constantSymbol || ""}
                onChange={(e) => setInvoice({ constantSymbol: e.target.value })}
              />
            </Field>
            <Field label="Vystavil (jméno)">
              <Input
                value={s.invoice.issuedBy || ""}
                onChange={(e) => setInvoice({ issuedBy: e.target.value })}
              />
            </Field>
            <Field label="Text QR platby" className="sm:col-span-2">
              <Input
                value={s.invoice.qrMessage}
                onChange={(e) => setInvoice({ qrMessage: e.target.value })}
              />
            </Field>
            <Field label="Poznámka pod fakturou" className="sm:col-span-2">
              <Input
                value={s.invoice.footerNote || ""}
                onChange={(e) => setInvoice({ footerNote: e.target.value })}
                placeholder="Např. Děkuji za využití mých služeb."
              />
            </Field>
          </div>
          <label className="mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div className="text-sm font-medium">
              Generovat QR platbu na faktury
            </div>
            <Switch
              checked={s.invoice.qrPayment}
              onChange={(v) => setInvoice({ qrPayment: v })}
            />
          </label>
        </Section>

        {/* Vzhled */}
        <Section
          icon={<Palette className="size-5" />}
          title="Vzhled"
          description="Přizpůsobte si aplikaci i faktury."
        >
          <div className="space-y-6">
            <div>
              <Label>Režim</Label>
              <div className="grid max-w-md grid-cols-3 gap-2">
                {[
                  { v: "light", label: "Světlý", icon: Sun },
                  { v: "dark", label: "Tmavý", icon: Moon },
                  { v: "system", label: "Systém", icon: Monitor },
                ].map(({ v, label, icon: Icon }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      setAppearance({ theme: v as Settings["appearance"]["theme"] })
                    }
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      s.appearance.theme === v
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Akcentní barva</Label>
              <div className="flex flex-wrap gap-2.5">
                {ACCENTS.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    aria-label={a.label}
                    title={a.label}
                    onClick={() => setAppearance({ accent: a.key })}
                    className={cn(
                      "grid size-9 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                      s.appearance.accent === a.key
                        ? "ring-foreground/40"
                        : "ring-transparent hover:ring-border",
                    )}
                    style={{ background: a.color }}
                  >
                    {s.appearance.accent === a.key && (
                      <Check className="size-4 text-white" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Písmo</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {FONTS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setAppearance({ font: f.key })}
                    style={{ fontFamily: f.variable }}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                      s.appearance.font === f.key
                        ? "border-accent bg-accent-soft"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <span>
                      <span className="block font-semibold">{f.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {f.note}
                      </span>
                    </span>
                    {s.appearance.font === f.key && (
                      <Check className="size-4 text-accent" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Logo</Label>
              <div className="flex flex-wrap items-center gap-4">
                <div className="grid h-20 w-32 place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40">
                  {s.appearance.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.appearance.logo}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <ImagePlus className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => onLogo(e.target.files?.[0])}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="size-4" /> Nahrát logo
                  </Button>
                  {s.appearance.logo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAppearance({ logo: undefined })}
                      className="text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="size-4" /> Odebrat
                    </Button>
                  )}
                  {logoError && (
                    <p className="text-xs text-danger">{logoError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Data */}
        <Section
          icon={<Database className="size-5" />}
          title="Vaše data"
          description="Vše je uložené jen ve vašem prohlížeči. Udělejte si zálohu."
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportData}>
              <Download className="size-4" /> Exportovat zálohu
            </Button>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => importData(e.target.files?.[0])}
            />
            <Button variant="outline" onClick={() => importRef.current?.click()}>
              <Upload className="size-4" /> Načíst zálohu
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-danger"
              onClick={() => {
                if (
                  confirm(
                    "Opravdu smazat všechna data? Tuto akci nelze vzít zpět.",
                  )
                ) {
                  useStore.getState().resetAll();
                }
              }}
            >
              <Trash2 className="size-4" /> Smazat vše
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
