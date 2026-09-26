"use client";

import { Package, Wrench } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Keeps the "paper" light across light AND dark app themes (same trick as the
// print page): the sheet redefines the surface tokens locally so inputs on it
// stay crisp instead of picking up the app's dark backgrounds.
export const PAPER_THEME = {
  colorScheme: "light",
  color: "#17141d",
  "--background": "#ffffff",
  "--foreground": "#17141d",
  "--muted": "#f3f3f5",
  "--muted-foreground": "#606067",
  "--border": "#e2e2e7",
  "--input": "#d9d9de",
  "--ring": "#2c2742",
  "--accent": "#e9e9ee",
  "--accent-foreground": "#17141d",
  "--popover": "#ffffff",
  "--popover-foreground": "#17141d",
  "--primary": "#2c2742",
  "--primary-foreground": "#fbfbfb",
  "--destructive": "#a82b2b",
} as React.CSSProperties;

export const paperSheetClass =
  "w-full min-w-0 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-border";

export function Thumb({
  item,
  isManual,
  className,
}: {
  item: any;
  isManual: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "size-9 shrink-0 overflow-hidden rounded-md border bg-muted",
        className,
      )}
    >
      {!isManual && item?.image ? (
        <img
          src={item.image}
          alt={item.name}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          {isManual ? (
            <Wrench className="size-4 text-muted-foreground/60" />
          ) : (
            <Package className="size-4 text-muted-foreground/60" />
          )}
        </div>
      )}
    </div>
  );
}

export function PaperLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

export function TotalsRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-8">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums font-medium", className)}>
        {children}
      </span>
    </div>
  );
}
