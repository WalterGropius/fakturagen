# Fakturka

**Elegantní český generátor faktur.** Vystavte profesionální fakturu za pár vteřin — s QR platbou, načtením firmy z ARES a PDF na jedno kliknutí. Všechna data zůstávají u vás v prohlížeči. Zdarma a open source.

> Žádné účty, žádná databáze, žádné odesílání dat na server. Fakturka běží celá ve vašem prohlížeči.

## Funkce

- 🧾 **Průvodce fakturou ve třech krocích** — odběratel → položky → platba, s živým náhledem
- 🏢 **Načtení z ARES** — zadáte IČO a název, adresu i DIČ doplníme z obchodního rejstříku
- 📱 **QR platba** — QR kód (formát SPAYD / „QR Platba") se generuje lokálně z čísla účtu
- 🏦 **Automatický IBAN** — z českého čísla účtu (i s předčíslím) spočítáme IBAN
- 📄 **PDF / tisk** — čistý daňový doklad na formát A4 s dokonalou českou diakritikou
- 👥 **Klienti** — uložené odběratele použijete na jedno kliknutí
- 📊 **Přehled s grafem** — tržby po měsících, zaplacené i nezaplacené faktury
- 📥 **Import starých PDF faktur** — nahrajete staré doklady, my z nich vytáhneme údaje a přidáme je do statistik (idempotentně, bez duplicit)
- 🎨 **Vlastní vzhled** — motiv (světlý/tmavý), akcentní barva, písmo a vlastní logo
- 🔢 **Automatické číslování** — číslo faktury se navrhne samo, jde ale přepsat
- 💾 **Export / import dat** — zálohu si stáhnete do souboru a kdykoli načtete zpět

## Jak to funguje

Fakturka je **local-first** aplikace. Faktury, klienti i nastavení se ukládají do `localStorage`
vašeho prohlížeče (přes [zustand](https://github.com/pmndrs/zustand) `persist`). Nikam se neodesílají.

- **IBAN a QR platba** se počítají čistě lokálně v prohlížeči — český účet se převede na IBAN
  (ISO 13616) a z něj se sestaví SPAYD řetězec, ze kterého vznikne QR kód. Žádné externí API.
- **ARES** je jediné volání ven: kvůli CORS ho zprostředkovává tenký serverový proxy endpoint
  (`/api/ares/[ico]`), který jen přepošle veřejný dotaz na `ares.gov.cz` a normalizuje odpověď.
  Nic se neukládá.
- **Import PDF** čte soubory přímo v prohlížeči přes [pdf.js](https://mozilla.github.io/pdf.js/)
  a heuristikou z textu vytáhne číslo, data, částku a odběratele. Idempotenci zajišťuje otisk
  obsahu (SHA-256) a kontrola čísla faktury.

## Vývoj

```bash
npm install
npm run dev      # vývojový server na http://localhost:3000
npm run build    # produkční build
npm start        # spuštění produkčního buildu
```

Aplikace je připravená k nasazení na **Vercel** — stačí propojit repozitář, žádná konfigurace
ani proměnné prostředí nejsou potřeba.

## Technologie

- [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/) — CSS-first téma, container queries
- [zustand](https://github.com/pmndrs/zustand) — stav a `localStorage`
- [Recharts](https://recharts.org/) — graf tržeb
- [qrcode.react](https://github.com/zpao/qrcode.react) — QR platba
- [pdf.js](https://mozilla.github.io/pdf.js/) — čtení importovaných PDF
- [lucide-react](https://lucide.dev/) — ikony

## Struktura

```
src/
├─ app/
│  ├─ (app)/            # aplikace se sidebarem (přehled, faktury, klienti, nastavení)
│  ├─ api/ares/[ico]/   # proxy na ARES
│  ├─ page.tsx          # landing page
│  └─ layout.tsx        # motiv, písma, metadata
├─ components/          # UI, invoice-document, invoice-editor, graf, …
└─ lib/                 # store, výpočty faktur, IBAN + SPAYD, ARES, import PDF
```

## Soukromí

Fakturka nemá účty ani databázi. Vaše data žijí pouze ve vašem zařízení. Chcete přejít na jiný
počítač nebo mít zálohu? V nastavení si vše exportujete do jednoho JSON souboru a zase načtete.

## Licence

[MIT](./LICENSE) — používejte, upravujte a sdílejte volně.
