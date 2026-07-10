"use client";

import { useEffect, useState } from "react";
import { useStore } from "./store";

/** Vrátí true, jakmile se store načte z localStorage (kvůli SSR hydrataci). */
export function useHydrated(): boolean {
  const hasHydrated = useStore((s) => s._hasHydrated);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && hasHydrated;
}
