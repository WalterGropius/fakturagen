import { ReceiptText } from "lucide-react";
import { cn } from "@/lib/cn";

const sizes = {
  sm: { box: "size-7 rounded-lg", icon: "size-4", text: "text-lg" },
  md: { box: "size-9 rounded-xl", icon: "size-5", text: "text-xl" },
  lg: { box: "size-11 rounded-2xl", icon: "size-6", text: "text-2xl" },
};

export function LogoMark({
  size = "md",
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  const s = sizes[size];
  return (
    <span
      className={cn(
        "grid place-items-center bg-accent text-accent-foreground shadow-sm shadow-accent/25",
        s.box,
        className,
      )}
    >
      <ReceiptText className={s.icon} strokeWidth={2} />
    </span>
  );
}

export function Logo({
  size = "md",
  showText = true,
  className,
}: {
  size?: keyof typeof sizes;
  showText?: boolean;
  className?: string;
}) {
  const s = sizes[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showText && (
        <span
          className={cn(
            "font-display font-semibold tracking-tight text-foreground",
            s.text,
          )}
        >
          Fakturka
        </span>
      )}
    </span>
  );
}
