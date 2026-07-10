"use client";

import { useState } from "react";
import { Building2, Loader2, TriangleAlert } from "lucide-react";
import { lookupAres, type AresCompany } from "@/lib/ares";
import { Input } from "./ui";
import { cn } from "@/lib/cn";

/**
 * Pole pro IČO s tlačítkem „Načíst z ARES". Po úspěchu zavolá onLoaded.
 */
export function AresLookup({
  ico,
  onIcoChange,
  onLoaded,
  className,
  placeholder = "IČO — např. 27074358",
}: {
  ico: string;
  onIcoChange: (v: string) => void;
  onLoaded: (company: AresCompany) => void;
  className?: string;
  placeholder?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const run = async () => {
    setError(null);
    setOk(false);
    setLoading(true);
    try {
      const company = await lookupAres(ico);
      onLoaded(company);
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Načtení selhalo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Input
          value={ico}
          inputMode="numeric"
          placeholder={placeholder}
          onChange={(e) => {
            onIcoChange(e.target.value.replace(/\D/g, "").slice(0, 8));
            setOk(false);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              run();
            }
          }}
        />
        <button
          type="button"
          onClick={run}
          disabled={loading || ico.replace(/\D/g, "").length !== 8}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50",
          )}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Building2 className="size-4" />
          )}
          Načíst z ARES
        </button>
      </div>
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-danger">
          <TriangleAlert className="size-3.5" /> {error}
        </p>
      )}
      {ok && !error && (
        <p className="mt-1.5 text-xs text-success">Údaje z ARES doplněny.</p>
      )}
    </div>
  );
}
