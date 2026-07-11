import type { Invoice } from "./types";
import { isOverdue } from "./format";

export type StatusTone = "neutral" | "accent" | "success" | "warning" | "danger";

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  overdue: boolean;
}

/** Vrátí popisek a barvu stavu faktury (včetně „po splatnosti"). */
export function statusMeta(invoice: Invoice): StatusMeta {
  if (invoice.status === "paid") {
    return { label: "Zaplaceno", tone: "success", overdue: false };
  }
  if (invoice.status === "draft") {
    return { label: "Rozpracováno", tone: "neutral", overdue: false };
  }
  // issued
  if (isOverdue(invoice.dueDate, invoice.status)) {
    return { label: "Po splatnosti", tone: "danger", overdue: true };
  }
  return { label: "Vystaveno", tone: "warning", overdue: false };
}

export const STATUS_FILTERS: {
  value: "all" | Invoice["status"] | "overdue";
  label: string;
}[] = [
  { value: "all", label: "Vše" },
  { value: "draft", label: "Rozpracované" },
  { value: "issued", label: "Vystavené" },
  { value: "paid", label: "Zaplacené" },
  { value: "overdue", label: "Po splatnosti" },
];
