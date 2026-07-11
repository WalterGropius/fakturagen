import Link from "next/link";
import {
  Building2,
  QrCode,
  FileDown,
  ShieldCheck,
  Users,
  BarChart3,
  Upload,
  Palette,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { GithubIcon } from "@/components/github-icon";

const FEATURES = [
  {
    icon: Building2,
    title: "Načtení z ARES",
    text: "Zadáte IČO a název, adresu i DIČ doplníme z rejstříku za vás.",
  },
  {
    icon: QrCode,
    title: "QR platba",
    text: "Ke každé faktuře přidáme QR kód, který klient naskenuje a rovnou zaplatí.",
  },
  {
    icon: FileDown,
    title: "PDF na jedno kliknutí",
    text: "Úhledný daňový doklad připravený k odeslání e-mailem i k tisku.",
  },
  {
    icon: ShieldCheck,
    title: "Data zůstávají u vás",
    text: "Nic neputuje na server. Faktury i klienti se ukládají jen do vašeho prohlížeče.",
  },
  {
    icon: Users,
    title: "Klienti po ruce",
    text: "Odběratele uložíte jednou a příště je vyberete na jedno kliknutí.",
  },
  {
    icon: BarChart3,
    title: "Přehledy a grafy",
    text: "Vidíte tržby po měsících, zaplacené i nezaplacené faktury.",
  },
  {
    icon: Upload,
    title: "Import starých faktur",
    text: "Nahrajete staré PDF a máme je v přehledu i statistikách.",
  },
  {
    icon: Palette,
    title: "Vlastní vzhled",
    text: "Logo, barvu a písmo si sladíte s vaší značkou.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Nastavíte dodavatele",
    text: "Své údaje a číslo účtu zadáte jen jednou. Fakturka si je zapamatuje.",
  },
  {
    n: "2",
    title: "Přidáte položky",
    text: "Popis, množství, cenu a sazbu DPH. Součty i DPH počítáme za vás.",
  },
  {
    n: "3",
    title: "Stáhnete PDF",
    text: "Hotovou fakturu i s QR platbou pošlete klientovi. Číslo se posune samo.",
  },
];

function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#funkce" className="transition-colors hover:text-foreground">
            Funkce
          </a>
          <a href="#jak" className="transition-colors hover:text-foreground">
            Jak to funguje
          </a>
          <a href="#soukromi" className="transition-colors hover:text-foreground">
            Soukromí
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/prehled"
            className="hidden rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Spustit aplikaci
          </Link>
          <Link
            href="/faktura/nova"
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/25 transition-all hover:brightness-110"
          >
            Vytvořit fakturu
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroInvoiceMock() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -right-6 -top-6 hidden size-24 rounded-full bg-accent/10 blur-2xl sm:block" />
      <div className="rotate-1 rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/[0.06] transition-transform hover:rotate-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-lg font-semibold">Faktura</div>
            <div className="text-xs text-muted-foreground">2026007</div>
          </div>
          <div className="rounded-lg bg-success-soft px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-success">
            Zaplaceno
          </div>
        </div>
        <div className="mt-4 space-y-2 text-xs">
          <div className="flex justify-between border-b border-border/60 pb-2 text-muted-foreground">
            <span>Návrh loga</span>
            <span className="tabular text-foreground">8 000 Kč</span>
          </div>
          <div className="flex justify-between border-b border-border/60 pb-2 text-muted-foreground">
            <span>Webová grafika</span>
            <span className="tabular text-foreground">12 500 Kč</span>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between">
          <div className="grid size-16 place-items-center rounded-lg bg-foreground/[0.04] text-muted-foreground">
            <QrCode className="size-9" strokeWidth={1.4} />
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Celkem k úhradě
            </div>
            <div className="font-display text-2xl font-bold text-accent">
              20 500 Kč
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <TopNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-gradient-to-b from-accent-soft/60 to-transparent" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-accent" />
              Zdarma · bez registrace · open source
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Faktura hotová
              <br />
              za jednu minutu.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
              Fakturka je vzdušný fakturační nástroj pro OSVČ a malé firmy.
              Načtěte odběratele z ARES, přidejte QR platbu a stáhněte hotové
              PDF. Vše běží u vás v prohlížeči.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/faktura/nova"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/25 transition-all hover:brightness-110"
              >
                Vytvořit fakturu zdarma
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/prehled"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Otevřít přehled
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["Bez účtu a hesel", "QR platba i ARES", "Žádná data na serveru"].map(
                (t) => (
                  <span key={t} className="inline-flex items-center gap-1.5">
                    <Check className="size-4 text-accent" strokeWidth={2.5} />
                    {t}
                  </span>
                ),
              )}
            </div>
          </div>
          <HeroInvoiceMock />
        </div>
      </section>

      {/* Funkce */}
      <section id="funkce" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Vše, co k fakturaci potřebujete
          </h2>
          <p className="mt-3 text-muted-foreground">
            Nic navíc, nic zbytečného. Jen nástroje, které vám ušetří čas.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md hover:shadow-black/[0.04]"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
                <Icon className="size-5" strokeWidth={2} />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Jak to funguje */}
      <section id="jak" className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Tři kroky k hotové faktuře
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <div className="grid size-11 place-items-center rounded-full bg-accent font-display text-lg font-bold text-accent-foreground">
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Soukromí */}
      <section id="soukromi" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent-soft/70 to-card p-8 sm:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <ShieldCheck className="size-6" />
              </div>
              <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight">
                Soukromí není příplatek
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Fakturka nemá účty, přihlašování ani databázi. Vaše faktury,
                klienti a nastavení žijí pouze v tomto zařízení. Chcete přejít na
                jiný počítač nebo mít zálohu? Stačí data exportovat do souboru a
                zase načíst.
              </p>
              <a
                href="https://github.com/WalterGropius/fakturagen"
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
              >
                <GithubIcon className="size-4" />
                Prohlédnout zdrojový kód
              </a>
            </div>
            <ul className="space-y-3">
              {[
                "Žádná registrace ani hesla",
                "Data se neposílají na žádný server",
                "Export a import jedním kliknutím",
                "Otevřený kód, který si můžete ověřit",
              ].map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-4 py-3 text-sm font-medium text-foreground"
                >
                  <Check className="size-4 shrink-0 text-accent" strokeWidth={2.5} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl bg-foreground px-8 py-14 text-center text-background">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Vystavte první fakturu ještě dnes
          </h2>
          <p className="mx-auto mt-3 max-w-md text-background/70">
            Bez registrace, bez závazků. Za minutu máte hotovo.
          </p>
          <Link
            href="/faktura/nova"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all hover:brightness-110"
          >
            Vytvořit fakturu
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            Vytvořeno s péčí o jednoduchost. Open source.
          </p>
          <a
            href="https://github.com/WalterGropius/fakturagen"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <GithubIcon className="size-5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
