"use client";

import { cn } from "@/lib/utils";
import type { SectionKey, UseItemFormReturn } from "./use-item-form";

export interface RailSection {
  key: SectionKey;
  label: string;
}

export const RAIL_SECTIONS: RailSection[] = [
  { key: "identity", label: "Identity" },
  { key: "units", label: "Units & stock" },
  { key: "pricing", label: "Pricing & tax" },
  { key: "suppliers", label: "Suppliers" },
];

export type SectionHealth = "ok" | "bad" | "";

export function sectionHealth(
  form: UseItemFormReturn,
  key: SectionKey,
): SectionHealth {
  if (form.tried && form.issues.some((i) => i.section === key)) return "bad";
  if (key === "identity") {
    return form.master.name.trim() && form.master.sku.trim() ? "ok" : "";
  }
  if (key === "units") {
    return form.master.unit || form.master.unitId ? "ok" : "";
  }
  if (key === "pricing") {
    return form.master.salesPrice > 0 && form.master.taxRateId ? "ok" : "";
  }
  return form.supplierDrafts.length ? "ok" : "";
}

function sectionMeta(form: UseItemFormReturn, key: SectionKey): string {
  if (key === "units" && form.master.type === "PRODUCT") {
    return String(form.uomDrafts.length);
  }
  if (key === "suppliers") {
    return form.supplierDrafts.length ? String(form.supplierDrafts.length) : "";
  }
  return "";
}

interface SectionRailProps {
  form: UseItemFormReturn;
  active: SectionKey;
  disabledSections: SectionKey[];
  onSelect: (key: SectionKey) => void;
}

export function SectionRail({
  form,
  active,
  disabledSections,
  onSelect,
}: SectionRailProps) {
  return (
    <nav
      aria-label="Item sections"
      className="flex shrink-0 flex-row gap-1 overflow-x-auto border-b bg-background px-2 py-2 lg:w-52 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:px-3 lg:py-4"
    >
      {RAIL_SECTIONS.map((section) => {
        const disabled = disabledSections.includes(section.key);
        const health = sectionHealth(form, section.key);
        const meta = sectionMeta(form, section.key);
        return (
          <button
            key={section.key}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(section.key)}
            className={cn(
              "flex flex-none items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium transition-colors lg:w-full",
              "text-muted-foreground hover:bg-muted",
              active === section.key && "bg-muted text-foreground",
              disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
            )}
          >
            <span
              className={cn(
                "size-2.5 shrink-0 rounded-full border-[1.5px] border-muted-foreground/40",
                health === "ok" && "border-emerald-500 bg-emerald-500",
                health === "bad" && "border-destructive bg-destructive",
              )}
            />
            <span className="whitespace-nowrap">{section.label}</span>
            {meta && (
              <em className="ml-auto hidden font-mono text-xs not-italic text-muted-foreground lg:inline">
                {meta}
              </em>
            )}
          </button>
        );
      })}
    </nav>
  );
}
