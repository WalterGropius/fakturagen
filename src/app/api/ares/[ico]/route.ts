import { NextResponse } from "next/server";

// Proxy na veřejné ARES API (ekonomické subjekty). Volá se ze serveru,
// aby nedocházelo k CORS problémům. Žádná data se neukládají.
const ARES_URL =
  "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty";

interface AresSidlo {
  nazevUlice?: string;
  cisloDomovni?: number;
  cisloOrientacni?: number;
  cisloOrientacniPismeno?: string;
  nazevObce?: string;
  nazevCastiObce?: string;
  nazevMestskeCastiObvodu?: string;
  psc?: number;
  nazevStatu?: string;
  textovaAdresa?: string;
}

interface AresResponse {
  ico?: string;
  obchodniJmeno?: string;
  dic?: string;
  sidlo?: AresSidlo;
}

function formatPsc(psc?: number): string {
  if (!psc) return "";
  const s = String(psc).padStart(5, "0");
  return `${s.slice(0, 3)} ${s.slice(3)}`;
}

function buildStreet(sidlo?: AresSidlo): string {
  if (!sidlo) return "";
  if (sidlo.nazevUlice && sidlo.cisloDomovni) {
    const orient = sidlo.cisloOrientacni
      ? `/${sidlo.cisloOrientacni}${sidlo.cisloOrientacniPismeno ?? ""}`
      : "";
    return `${sidlo.nazevUlice} ${sidlo.cisloDomovni}${orient}`;
  }
  if (sidlo.nazevUlice) return sidlo.nazevUlice;
  // Bez názvu ulice (malé obce) — použij číslo domu u názvu obce
  if (sidlo.cisloDomovni && sidlo.nazevObce) {
    return `${sidlo.nazevObce} ${sidlo.cisloDomovni}`;
  }
  return "";
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ ico: string }> },
) {
  const { ico: rawIco } = await ctx.params;
  const ico = (rawIco || "").replace(/\D/g, "");

  if (ico.length !== 8) {
    return NextResponse.json(
      { error: "IČO musí mít 8 číslic." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${ARES_URL}/${ico}`, {
      headers: { Accept: "application/json", "User-Agent": "Fakturka/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) {
      return NextResponse.json(
        { error: "Firma s tímto IČO nebyla v ARES nalezena." },
        { status: 404 },
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: "ARES je momentálně nedostupný. Zkuste to prosím později." },
        { status: 502 },
      );
    }

    const data = (await res.json()) as AresResponse;
    const sidlo = data.sidlo;

    const normalized = {
      ico: data.ico ?? ico,
      name: data.obchodniJmeno ?? "",
      dic: data.dic ?? "",
      street: buildStreet(sidlo),
      city: sidlo?.nazevObce ?? "",
      zip: formatPsc(sidlo?.psc),
      country: sidlo?.nazevStatu ?? "Česká republika",
    };

    return NextResponse.json(normalized, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return NextResponse.json(
      { error: "Nepodařilo se spojit s ARES. Vyplňte údaje ručně." },
      { status: 502 },
    );
  }
}
