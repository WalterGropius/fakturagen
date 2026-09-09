"use client";

import { useSyncExternalStore } from "react";
import { useStore } from "./store";

// Store se nemění — pouze potřebujeme jinou hodnotu na serveru a v prohlížeči.
const subscribe = () => () => {};

/**
 * Vrátí true, jakmile se store načte z localStorage.
 *
 * useSyncExternalStore vrací na serveru `false` a v prohlížeči `true`, takže
 * první vykreslení sedí se serverovým HTML a hydratace neprotestuje — a to
 * bez setState v efektu, který by vyvolal kaskádu překreslení.
 */
export function useHydrated(): boolean {
  const hasHydrated = useStore((s) => s._hasHydrated);
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return mounted && hasHydrated;
}
