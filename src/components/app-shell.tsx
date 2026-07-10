"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  FileText,
  Users,
  Settings,
  Plus,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { Logo } from "./logo";
import { GithubIcon } from "./github-icon";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/prehled", label: "Přehled", icon: LayoutGrid },
  { href: "/faktury", label: "Faktury", icon: FileText },
  { href: "/klienti", label: "Klienti", icon: Users },
  { href: "/nastaveni", label: "Nastavení", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent-soft text-accent"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4.5", active && "text-accent")} strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle() {
  const theme = useStore((s) => s.settings.appearance.theme);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, [theme]);

  const toggle = () => {
    const next = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";
    useStore.setState((s) => ({
      settings: {
        ...s.settings,
        appearance: { ...s.settings.appearance, theme: next },
      },
    }));
    setIsDark(next === "dark");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Přepnout světlý/tmavý režim"
      className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {isDark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-2 pt-2">
        <Link href="/prehled" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      <Link
        href="/faktura/nova"
        onClick={onNavigate}
        className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm shadow-accent/25 transition-all hover:brightness-110 active:brightness-95"
      >
        <Plus className="size-4.5" strokeWidth={2.4} />
        Nová faktura
      </Link>

      <NavLinks onNavigate={onNavigate} />

      <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
        <a
          href="https://github.com/WalterGropius/fakturagen"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <GithubIcon className="size-4" />
          Open source
        </a>
        <ThemeToggle />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Zavřít mobilní menu při změně stránky
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-card/40 lg:block">
        <SidebarInner />
      </aside>

      {/* Mobile top bar */}
      <div className="no-print fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md lg:hidden">
        <Logo size="sm" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Otevřít menu"
          className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            aria-label="Zavřít menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 border-r border-border bg-card shadow-xl animate-in">
            <button
              onClick={() => setOpen(false)}
              aria-label="Zavřít"
              className="absolute right-3 top-4 z-10 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="size-5" />
            </button>
            <SidebarInner onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Content */}
      <main className="min-w-0 flex-1 pt-14 lg:pt-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
