"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Client, Invoice, InvoiceStatus, Party, Settings } from "./types";
import {
  DEFAULT_ACCENT,
  DEFAULT_DOCUMENT_APPEARANCE,
  DEFAULT_FONT,
} from "./constants";
import { uid } from "./invoice";

export const DEFAULT_SETTINGS: Settings = {
  supplier: {
    name: "",
    person: "",
    street: "",
    city: "",
    zip: "",
    country: "Česká republika",
    ico: "",
    dic: "",
    phone: "",
    email: "",
    web: "",
    vatPayer: false,
    bank: { accountNumber: "", bankCode: "", iban: "" },
  },
  appearance: {
    theme: "system",
    accent: DEFAULT_ACCENT,
    font: DEFAULT_FONT,
    logo: undefined,
    document: DEFAULT_DOCUMENT_APPEARANCE,
  },
  invoice: {
    dueDays: 14,
    paymentMethod: "prikazem",
    currency: "CZK",
    rounding: "none",
    constantSymbol: "",
    qrPayment: true,
    qrMessage: "Úhrada faktury",
    footerNote: "",
    issuedBy: "",
  },
  numbering: {
    prefix: "",
    nextNumber: 1,
    pad: 3,
    includeYear: true,
  },
  onboarded: false,
};

/**
 * Doplní chybějící pole z výchozího nastavení. Používá se při načtení
 * z localStorage i při importu zálohy — starší soubory nemusí mít
 * novější volby (třeba vzhled dokumentu).
 */
export function normalizeSettings(raw: unknown): Settings {
  const input = (raw ?? {}) as Partial<Settings>;
  const appearance = input.appearance ?? DEFAULT_SETTINGS.appearance;
  return {
    ...DEFAULT_SETTINGS,
    ...input,
    supplier: {
      ...DEFAULT_SETTINGS.supplier,
      ...input.supplier,
      bank: { ...DEFAULT_SETTINGS.supplier.bank, ...input.supplier?.bank },
    },
    appearance: {
      ...DEFAULT_SETTINGS.appearance,
      ...appearance,
      document: {
        ...DEFAULT_DOCUMENT_APPEARANCE,
        ...appearance.document,
      },
    },
    invoice: { ...DEFAULT_SETTINGS.invoice, ...input.invoice },
    numbering: { ...DEFAULT_SETTINGS.numbering, ...input.numbering },
  };
}

interface StoreState {
  settings: Settings;
  clients: Client[];
  invoices: Invoice[];
  _hasHydrated: boolean;

  setHasHydrated: (v: boolean) => void;
  setSettings: (settings: Settings) => void;
  patchSettings: (patch: Partial<Settings>) => void;

  addClient: (data: Omit<Client, "id" | "createdAt">) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  removeClient: (id: string) => void;
  getClient: (id: string) => Client | undefined;

  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  removeInvoice: (id: string) => void;
  getInvoice: (id: string) => Invoice | undefined;
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  bumpNextNumber: () => void;

  importData: (data: Partial<Pick<StoreState, "settings" | "clients" | "invoices">>) => void;
  resetAll: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      clients: [],
      invoices: [],
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      setSettings: (settings) => set({ settings }),
      patchSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      addClient: (data) => {
        const client: Client = {
          ...data,
          id: uid(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ clients: [client, ...s.clients] }));
        return client;
      },
      updateClient: (id, patch) =>
        set((s) => ({
          clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeClient: (id) =>
        set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),
      getClient: (id) => get().clients.find((c) => c.id === id),

      addInvoice: (invoice) =>
        set((s) => ({ invoices: [invoice, ...s.invoices] })),
      updateInvoice: (id, patch) =>
        set((s) => ({
          invoices: s.invoices.map((i) =>
            i.id === id
              ? { ...i, ...patch, updatedAt: new Date().toISOString() }
              : i,
          ),
        })),
      removeInvoice: (id) =>
        set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) })),
      getInvoice: (id) => get().invoices.find((i) => i.id === id),
      setInvoiceStatus: (id, status) =>
        set((s) => ({
          invoices: s.invoices.map((i) =>
            i.id === id
              ? { ...i, status, updatedAt: new Date().toISOString() }
              : i,
          ),
        })),
      bumpNextNumber: () =>
        set((s) => ({
          settings: {
            ...s.settings,
            numbering: {
              ...s.settings.numbering,
              nextNumber: s.settings.numbering.nextNumber + 1,
            },
          },
        })),

      importData: (data) =>
        set((s) => ({
          settings: data.settings ? normalizeSettings(data.settings) : s.settings,
          clients: data.clients ?? s.clients,
          invoices: data.invoices ?? s.invoices,
        })),
      resetAll: () =>
        set({ settings: DEFAULT_SETTINGS, clients: [], invoices: [] }),
    }),
    {
      name: "fakturka-v1",
      version: 2,
      partialize: (s) => ({
        settings: s.settings,
        clients: s.clients,
        invoices: s.invoices,
      }),
      // Starší uložená nastavení nemají všechna pole (např. vzhled faktury).
      // Doplníme je z výchozích, ať aplikace nespadne na chybějícím klíči.
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<StoreState>;
        return {
          settings: normalizeSettings(state.settings),
          clients: state.clients ?? [],
          invoices: state.invoices ?? [],
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/** Odběratel jako Party snapshot pro fakturu. */
export function clientToParty(client: Client | Party): Party {
  return {
    name: client.name,
    person: client.person,
    street: client.street,
    city: client.city,
    zip: client.zip,
    country: client.country,
    ico: client.ico,
    dic: client.dic,
    phone: client.phone,
    email: client.email,
    web: client.web,
  };
}
