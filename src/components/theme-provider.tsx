"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/**
 * Aplikuje motiv, akcent a písmo na <html> podle nastavení.
 * Reaguje i na změnu systémového režimu, když je zvoleno „systémové".
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const appearance = useStore((s) => s.settings.appearance);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-accent", appearance.accent);
    root.setAttribute("data-font", appearance.font);

    const apply = () => {
      const dark =
        appearance.theme === "dark" ||
        (appearance.theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
    };
    apply();

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (appearance.theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [appearance.theme, appearance.accent, appearance.font]);

  return children;
}
