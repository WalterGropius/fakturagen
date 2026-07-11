"use client";

import Image from "next/image";
import type { Invoice } from "@/lib/types";
import { invoiceTotals } from "@/lib/invoice";
import { invoiceSpayd, czAccountToIban, formatIban } from "@/lib/payment";
import { formatMoney, formatDate, formatNumber } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { QrPlatba } from "./qr-platba";

function paymentLabel(v: string): string {
  return PAYMENT_METHODS.find((p) => p.value === v)?.label ?? v;
}

function DetailLine({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-1.5 text-[12.5px] leading-snug">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function InvoiceDocument({
  invoice,
  logo,
  className,
}: {
  invoice: Invoice;
  logo?: string;
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

  return (
    <div
      className={cn(
        "invoice-paper @container mx-auto w-full max-w-[820px] bg-white p-6 text-neutral-900 @md:p-10 print:p-0",
        className,
      )}
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
          <div>
            <div className="font-display text-xl font-semibold leading-tight text-neutral-900">
              {supplier.name || "Dodavatel"}
            </div>
            {supplier.person && (
              <div className="text-[13px] text-neutral-500">
                {supplier.person}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl font-semibold leading-none tracking-tight text-neutral-900">
            Faktura
          </div>
          <div className="mt-1 text-[13px] text-neutral-500">
            {invoice.vatPayer ? "daňový doklad" : "č. dokladu"}
          </div>
          <div className="mt-2 text-lg font-semibold tabular text-[color:var(--accent)]">
            {invoice.number}
          </div>
        </div>
      </div>

      <div className="my-6 h-px bg-neutral-200" />

      {/* Dodavatel / Odběratel */}
      <div className="grid grid-cols-1 gap-6 @sm:grid-cols-2 @sm:gap-8">
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            Dodavatel
          </div>
          <div className="text-[13px] font-semibold text-neutral-900">
            {supplier.name}
          </div>
          <div className="text-[12.5px] leading-relaxed text-neutral-600">
            {supplier.street && <div>{supplier.street}</div>}
            <div>
              {[supplier.zip, supplier.city].filter(Boolean).join(" ")}
            </div>
            {supplier.country && supplier.country !== "Česká republika" && (
              <div>{supplier.country}</div>
            )}
          </div>
          <div className="mt-2 space-y-0.5">
            <DetailLine label="IČO:" value={supplier.ico} />
            <DetailLine
              label="DIČ:"
              value={supplier.vatPayer ? supplier.dic : undefined}
            />
            {!supplier.vatPayer && (
              <div className="text-[12px] text-neutral-500">
                Neplátce DPH
              </div>
            )}
          </div>
          <div className="mt-2 space-y-0.5">
            <DetailLine label="Tel.:" value={supplier.phone} />
            <DetailLine label="E-mail:" value={supplier.email} />
            <DetailLine label="Web:" value={supplier.web} />
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
            Odběratel
          </div>
          <div className="text-[13px] font-semibold text-neutral-900">
            {client.name || "—"}
          </div>
          {client.person && (
            <div className="text-[12.5px] text-neutral-600">{client.person}</div>
          )}
          <div className="text-[12.5px] leading-relaxed text-neutral-600">
            {client.street && <div>{client.street}</div>}
            <div>{[client.zip, client.city].filter(Boolean).join(" ")}</div>
            {client.country && client.country !== "Česká republika" && (
              <div>{client.country}</div>
            )}
          </div>
          <div className="mt-2 space-y-0.5">
            <DetailLine label="IČO:" value={client.ico} />
            <DetailLine label="DIČ:" value={client.dic} />
          </div>
        </div>
      </div>

      {/* Platební údaje */}
      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-1.5 rounded-xl bg-neutral-50 px-4 py-3.5 @sm:grid-cols-2 @2xl:grid-cols-3">
        <DetailLine label="Forma úhrady:" value={paymentLabel(invoice.paymentMethod)} />
        <DetailLine label="Datum vystavení:" value={formatDate(invoice.issueDate)} />
        <DetailLine label="Č. účtu:" value={accountLine} />
        <DetailLine label="Datum splatnosti:" value={formatDate(invoice.dueDate)} />
        {iban && (
          <div className="flex gap-1.5 text-[12.5px] leading-snug">
            <span className="text-muted-foreground">IBAN:</span>
            <span className="font-medium tabular text-foreground">
              {formatIban(iban)}
            </span>
          </div>
        )}
        <DetailLine label="DUZP:" value={formatDate(invoice.taxDate)} />
        <DetailLine label="Variabilní symbol:" value={invoice.variableSymbol} />
        <DetailLine label="Konstantní symbol:" value={invoice.constantSymbol} />
        <DetailLine label="Č. objednávky:" value={invoice.orderNumber} />
      </div>

      {/* Položky */}
      <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-[10px] uppercase tracking-[0.1em] text-neutral-400">
            <th className="py-2 pr-2 font-semibold">Popis</th>
            <th className="py-2 px-2 text-right font-semibold">Množství</th>
            <th className="py-2 px-2 text-right font-semibold">J. cena</th>
            {hasDiscount && (
              <th className="py-2 px-2 text-right font-semibold">Sleva</th>
            )}
            {invoice.vatPayer && (
              <th className="py-2 px-2 text-right font-semibold">DPH</th>
            )}
            <th className="py-2 pl-2 text-right font-semibold">Celkem</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => {
            const gross = item.quantity * item.unitPrice;
            const base = gross * (1 - (item.discount || 0) / 100);
            return (
              <tr
                key={item.id}
                className="border-b border-neutral-100 align-top"
              >
                <td className="py-2.5 pr-2 text-neutral-800">
                  {item.description || "—"}
                </td>
                <td className="py-2.5 px-2 text-right tabular text-neutral-600 whitespace-nowrap">
                  {formatNumber(item.quantity, item.quantity % 1 === 0 ? 0 : 2)}{" "}
                  {item.unit}
                </td>
                <td className="py-2.5 px-2 text-right tabular text-neutral-600 whitespace-nowrap">
                  {money(item.unitPrice)}
                </td>
                {hasDiscount && (
                  <td className="py-2.5 px-2 text-right tabular text-neutral-600">
                    {item.discount ? `${item.discount} %` : "—"}
                  </td>
                )}
                {invoice.vatPayer && (
                  <td className="py-2.5 px-2 text-right tabular text-neutral-600">
                    {item.vatRate} %
                  </td>
                )}
                <td className="py-2.5 pl-2 text-right tabular font-medium text-neutral-900 whitespace-nowrap">
                  {money(base)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {/* Součty + QR */}
      <div className="mt-6 flex flex-col-reverse gap-6 @lg:flex-row @lg:items-start @lg:justify-between">
        {/* QR + rekapitulace vlevo */}
        <div className="flex flex-1 flex-wrap items-start gap-5">
          {spayd && (
            <div className="text-center">
              <QrPlatba value={spayd} size={116} />
              <div className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                QR platba
              </div>
            </div>
          )}
          {invoice.vatPayer && totals.breakdown.length > 0 && (
            <div className="min-w-[220px]">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                Rekapitulace DPH
              </div>
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="text-neutral-400">
                    <th className="py-1 text-left font-medium">Sazba</th>
                    <th className="py-1 text-right font-medium">Základ</th>
                    <th className="py-1 text-right font-medium">DPH</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {totals.breakdown.map((r) => (
                    <tr key={r.rate} className="text-neutral-600">
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

        {/* Celková částka vpravo */}
        <div className="w-full @lg:w-72">
          <div className="space-y-1.5 text-[13px]">
            {invoice.vatPayer && (
              <>
                <div className="flex justify-between text-neutral-600">
                  <span>Základ bez DPH</span>
                  <span className="tabular">{money(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>DPH celkem</span>
                  <span className="tabular">{money(totals.vatTotal)}</span>
                </div>
              </>
            )}
            {totals.rounding !== 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Zaokrouhlení</span>
                <span className="tabular">{money(totals.rounding)}</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[color:var(--accent-soft)] px-4 py-3">
            <span className="text-[13px] font-semibold text-neutral-700">
              Celkem k úhradě
            </span>
            <span className="font-display text-xl font-bold tabular text-[color:var(--accent)]">
              {money(totals.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Patička */}
      {(invoice.note || invoice.issuedBy) && (
        <div className="mt-8 border-t border-neutral-200 pt-4">
          {invoice.note && (
            <p className="max-w-lg text-[12px] leading-relaxed text-neutral-500">
              {invoice.note}
            </p>
          )}
          {invoice.issuedBy && (
            <p className="mt-3 text-[12px] text-neutral-600">
              Vystavil: <span className="font-medium">{invoice.issuedBy}</span>
            </p>
          )}
        </div>
      )}

      <div className="mt-6 text-center text-[10px] text-neutral-300">
        Vystaveno ve Fakturce · fakturka
      </div>
    </div>
  );
}
