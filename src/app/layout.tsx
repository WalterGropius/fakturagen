import type { Metadata, Viewport } from "next";
import {
  Fraunces,
  Inter,
  Manrope,
  IBM_Plex_Sans,
  Geist,
  Geist_Mono,
} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
  display: "swap",
});
const plex = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});
const geistSans = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-sans",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Fakturka — faktury jednoduše a zdarma",
    template: "%s · Fakturka",
  },
  description:
    "Vystavte profesionální fakturu za pár vteřin. QR platba, načtení firmy z ARES, PDF na jedno kliknutí. Data zůstávají u vás v prohlížeči. Zdarma a open source.",
  applicationName: "Fakturka",
  authors: [{ name: "Fakturka" }],
  keywords: [
    "faktura",
    "fakturace",
    "faktura zdarma",
    "QR platba",
    "ARES",
    "OSVČ",
    "daňový doklad",
  ],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfbf8" },
    { media: "(prefers-color-scheme: dark)", color: "#242320" },
  ],
};

// Nastaví motiv, akcent a písmo ještě před vykreslením — bez probliknutí.
const noFlashScript = `(function(){try{var raw=localStorage.getItem('fakturka-v1');var t='system',a='terracotta',f='inter';var st=null;if(raw){var s=JSON.parse(raw);st=s&&s.state;var ap=st&&st.settings&&st.settings.appearance;if(ap){t=ap.theme||t;a=ap.accent||a;f=ap.font||f;}}var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var d=document.documentElement;d.classList.toggle('dark',dark);d.setAttribute('data-accent',a);d.setAttribute('data-font',f);if(location.pathname==='/'&&st&&st.invoices&&st.invoices.length>0){location.replace('/prehled');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="cs"
      suppressHydrationWarning
      data-accent="terracotta"
      data-font="inter"
      className={`${fraunces.variable} ${inter.variable} ${manrope.variable} ${plex.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
