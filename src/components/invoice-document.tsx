"use client";

import Image from "next/image";
import type { DocumentAppearance, Invoice } from "@/lib/types";
import { invoiceTotals } from "@/lib/invoice";
import { invoiceSpayd, czAccountToIban, formatIban } from "@/lib/payment";
import { formatMoney, formatDate, formatNumber } from "@/lib/format";
import { PAYMENT_METHODS, DEFAULT_DOCUMENT_APPEARANCE } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { QrPlatba } from "./qr-platba";

function paymentLabel(v: string): string {
  return PAYMENT_METHODS.find((p) => p.value === v)?.label ?? v;
}

/** Popisek nad hodnotou — v pruhu platebních údajů se vejde víc do řádku. */
function Pair({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="inv-pair">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** Řádek „popisek hodnota" vedle sebe — pro údaje stran. */
function Line({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <span className="whitespace-nowrap">
      <span className="inv-muted">{label} </span>
      <span className="inv-strong">{value}</span>
    </span>
  );
}

function PartyBlock({
  eyebrow,
  name,
  person,
  street,
  cityLine,
  country,
  details,
  contacts,
  boxed,
}: {
  eyebrow: string;
  name: string;
  person?: string;
  street?: string;
  cityLine: string;
  country?: string;
  details: React.ReactNode;
  contacts?: React.ReactNode;
  boxed?: boolean;
}) {
  return (
    <div
      className={cn(
        boxed && "rounded-xl px-4 py-3",
      )}
      style={
        boxed
          ? {
              border: "1px solid var(--paper-line)",
              background: "var(--paper-soft)",
            }
          : undefined
      }
    >
      <div className="inv-eyebrow mb-1">{eyebrow}</div>
      <div className="inv-strong text-[1.06em] leading-snug">{name || "—"}</div>
      {person && <div className="inv-muted">{person}</div>}
      {street && <div>{street}</div>}
      {cityLine && <div>{cityLine}</div>}
      {country && <div>{country}</div>}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">{details}</div>
      {contacts && (
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">{contacts}</div>
      )}
    </div>
  );
}

export function InvoiceDocument({
  invoice,
  logo,
  appearance = DEFAULT_DOCUMENT_APPEARANCE,
  accent = "terracotta",
  className,
}: {
  invoice: Invoice;
  logo?: string;
  appearance?: DocumentAppearance;
  accent?: string;
  className?: string;
}) {
  const { supplier, client } = invoice;
  const totals = invoiceTotals(invoice.items, {
    vatPayer: invoice.vatPayer,
    rounding: invoice.rounding,
  });
  const hasDiscount = invoice.items.some((i) => (i.discount || 0) > 0);

  const iban =
    supplier.bank.iban ||
    czAccountToIban(supplier.bank.accountNumber, supplier.bank.bankCode) ||
    "";
  const accountLine =
    supplier.bank.accountNumber && supplier.bank.bankCode
      ? `${supplier.bank.accountNumber}/${supplier.bank.bankCode}`
      : "";

  const spayd = invoice.qrPayment
    ? invoiceSpayd({
        accountNumber: supplier.bank.accountNumber,
        bankCode: supplier.bank.bankCode,
        ibanOverride: supplier.bank.iban,
        amount: totals.total,
        currency: invoice.currency,
        variableSymbol: invoice.variableSymbol,
        constantSymbol: invoice.constantSymbol,
        message: invoice.qrMessage,
        recipientName: supplier.name,
        dueDate: invoice.dueDate,
      })
    : null;

  const money = (n: number) => formatMoney(n, invoice.currency);
  const supplierCity = [supplier.zip, supplier.city].filter(Boolean).join(" ");
  const clientCity = [client.zip, client.city].filter(Boolean).join(" ");

  return (
    <div
      className={cn(
        "invoice-paper @container mx-auto w-full max-w-[820px] p-6 @md:p-10",
        className,
      )}
      data-ink={appearance.ink}
      data-leading={appearance.lineSpacing}
      data-density={appearance.density}
      data-doc-font={appearance.font}
      data-paper-accent={appearance.colored ? accent : undefined}
      data-paper-color={appearance.colored ? "accent" : "mono"}
      style={{ ["--paper-size" as string]: `${appearance.fontSize}px` }}
    >
      {/* Hlavička */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          {logo && (
            <Image
              src={logo}
              alt=""
              width={120}
              height={64}
              unoptimized
              className="max-h-16 w-auto object-contain"
            />
          )}
          <div className="min-w-0">
            <div className="inv-heading">{supplier.name || "Dodavatel"}</div>
            {supplier.person && <div className="inv-muted">{supplier.person}</div>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="inv-title">Faktura</div>
          <div className="inv-muted">
            {invoice.vatPayer ? "daňový doklad" : "č. dokladu"}
          </div>
          <div
            className="mt-0.5 text-[1.35em] font-semibold tabular"
            style={{ color: "var(--paper-accent)" }}
          >
            {invoice.number}
          </div>
        </div>
      </div>

      <div className="inv-rule inv-block" />

      {/* Dodavatel / Odběratel */}
      <div className="inv-block grid grid-cols-1 gap-5 @sm:grid-cols-2 @sm:gap-7">
        <PartyBlock
          eyebrow="Dodavatel"
          name={supplier.name}
          street={supplier.street}
          cityLine={supplierCity}
          country={
            supplier.country && supplier.country !== "Česká republika"
              ? supplier.country
              : undefined
          }
          details={
            <>
              <Line label="IČO" value={supplier.ico} />
              {supplier.vatPayer ? (
                <Line label="DIČ" value={supplier.dic} />
              ) : (
                <span className="inv-muted">Neplátce DPH</span>
              )}
            </>
          }
          contacts={
            <>
              <Line label="Tel." value={supplier.phone} />
              <Line label="E-mail" value={supplier.email} />
              <Line label="Web" value={supplier.web} />
            </>
          }
        />
        <PartyBlock
          boxed
          eyebrow="Odběratel"
          name={client.name}
          person={client.person}
          street={client.street}
          cityLine={clientCity}
          country={
            client.country && client.country !== "Česká republika"
              ? client.country
              : undefined
          }
          details={
            <>
              <Line label="IČO" value={client.ico} />
              <Line label="DIČ" value={client.dic} />
            </>
          }
        />
      </div>

      {/* Platební údaje — vše na jeden pruh, ať zbude místo na položky */}
      <dl
        className="inv-block flex flex-wrap gap-x-6 gap-y-2 rounded-xl px-4 py-3"
        style={{ background: "var(--paper-soft)" }}
      >
        <Pair label="Forma úhrady" value={paymentLabel(invoice.paymentMethod)} />
        <Pair label="Vystaveno" value={formatDate(invoice.issueDate)} />
        <Pair label="Splatnost" value={formatDate(invoice.dueDate)} />
        <Pair label="DUZP" value={formatDate(invoice.taxDate)} />
        <Pair label="Var. symbol" value={invoice.variableSymbol} />
        <Pair label="Konst. symbol" value={invoice.constantSymbol} />
        <Pair label="Č. objednávky" value={invoice.orderNumber} />
        <Pair label="Č. účtu" value={accountLine} />
        <Pair label="IBAN" value={iban ? formatIban(iban) : undefined} />
      </dl>

      {/* Položky */}
      <div className="inv-block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr
              className="inv-eyebrow text-left"
              style={{ borderBottom: "1px solid var(--paper-line)" }}
            >
              <th className="py-1.5 pr-2 font-semibold">Popis</th>
              <th className="py-1.5 px-2 text-right font-semibold">Množství</th>
              <th className="py-1.5 px-2 text-right font-semibold">J. cena</th>
              {hasDiscount && (
                <th className="py-1.5 px-2 text-right font-semibold">Sleva</th>
              )}
              {invoice.vatPayer && (
                <th className="py-1.5 px-2 text-right font-semibold">DPH</th>
              )}
              <th className="py-1.5 pl-2 text-right font-semibold">Celkem</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => {
              const gross = item.quantity * item.unitPrice;
              const base = gross * (1 - (item.discount || 0) / 100);
              return (
                <tr
                  key={item.id}
                  className="align-top"
                  style={{ borderBottom: "1px solid var(--paper-line)" }}
                >
                  <td className="py-2 pr-2">{item.description || "—"}</td>
                  <td className="inv-muted whitespace-nowrap px-2 py-2 text-right tabular">
                    {formatNumber(item.quantity, item.quantity % 1 === 0 ? 0 : 2)}{" "}
                    {item.unit}
                  </td>
                  <td className="inv-muted whitespace-nowrap px-2 py-2 text-right tabular">
                    {money(item.unitPrice)}
                  </td>
                  {hasDiscount && (
                    <td className="inv-muted px-2 py-2 text-right tabular">
                      {item.discount ? `${item.discount} %` : "—"}
                    </td>
                  )}
                  {invoice.vatPayer && (
                    <td className="inv-muted px-2 py-2 text-right tabular">
                      {item.vatRate} %
                    </td>
                  )}
                  <td className="inv-strong whitespace-nowrap py-2 pl-2 text-right tabular">
                    {money(base)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Součty + QR */}
      <div className="inv-block flex flex-col-reverse gap-6 @lg:flex-row @lg:items-start @lg:justify-between">
        <div className="flex flex-1 flex-wrap items-start gap-5">
          {spayd && (
            <div className="inv-no-break text-center">
              <QrPlatba value={spayd} size={112} />
              <div className="inv-eyebrow mt-1">QR platba</div>
            </div>
          )}
          {invoice.vatPayer && totals.breakdown.length > 0 && (
            <div className="inv-no-break min-w-[210px]">
              <div className="inv-eyebrow mb-0.5">Rekapitulace DPH</div>
              <table className="w-full text-[0.92em]">
                <thead>
                  <tr className="inv-muted">
                    <th className="py-0.5 text-left font-medium">Sazba</th>
                    <th className="py-0.5 text-right font-medium">Základ</th>
                    <th className="py-0.5 text-right font-medium">DPH</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {totals.breakdown.map((r) => (
                    <tr key={r.rate}>
                      <td className="py-0.5">{r.rate} %</td>
                      <td className="py-0.5 text-right">{money(r.base)}</td>
                      <td className="py-0.5 text-right">{money(r.vat)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Celková částka */}
        <div className="inv-no-break w-full @lg:w-72">
          <div className="space-y-1">
            {invoice.vatPayer && (
              <>
                <div className="inv-muted flex justify-between">
                  <span>Základ bez DPH</span>
                  <span className="tabular">{money(totals.subtotal)}</span>
                </div>
                <div className="inv-muted flex justify-between">
                  <span>DPH celkem</span>
                  <span className="tabular">{money(totals.vatTotal)}</span>
                </div>
              </>
            )}
            {totals.rounding !== 0 && (
              <div className="inv-muted flex justify-between">
                <span>Zaokrouhlení</span>
                <span className="tabular">{money(totals.rounding)}</span>
              </div>
            )}
          </div>
          <div
            className="mt-2 flex items-baseline justify-between gap-3 rounded-xl px-4 py-3"
            style={{
              background: "var(--paper-accent-soft)",
              border: "1px solid var(--paper-accent-line)",
            }}
          >
            <span className="inv-strong">Celkem k úhradě</span>
            <span
              className="text-[1.5em] font-bold tabular"
              style={{ color: "var(--paper-accent-ink)" }}
            >
              {money(totals.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Patička */}
      {(invoice.note || invoice.issuedBy) && (
        <div
          className="inv-block pt-3"
          style={{ borderTop: "1px solid var(--paper-line)" }}
        >
          {invoice.note && (
            <p className="inv-muted max-w-2xl whitespace-pre-wrap text-[0.95em]">
              {invoice.note}
            </p>
          )}
          {invoice.issuedBy && (
            <p className="mt-2 text-[0.95em]">
              <span className="inv-muted">Vystavil: </span>
              <span className="inv-strong">{invoice.issuedBy}</span>
            </p>
          )}
        </div>
      )}

      {appearance.watermark && (
        <div
          className="mt-6 text-center text-[0.8em]"
          style={{ color: "var(--paper-line)" }}
        >
          Vystaveno ve Fakturce
        </div>
      )}
    </div>
  );
}
