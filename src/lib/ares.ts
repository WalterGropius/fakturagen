// Klientský wrapper nad naším ARES proxy endpointem.

export interface AresCompany {
  ico: string;
  name: string;
  dic: string;
  street: string;
  city: string;
  zip: string;
  country: string;
}

export async function lookupAres(ico: string): Promise<AresCompany> {
  const clean = (ico || "").replace(/\D/g, "");
  if (clean.length !== 8) {
    throw new Error("IČO musí mít 8 číslic.");
  }
  const res = await fetch(`/api/ares/${clean}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Nepodařilo se načíst firmu z ARES.");
  }
  return data as AresCompany;
}
