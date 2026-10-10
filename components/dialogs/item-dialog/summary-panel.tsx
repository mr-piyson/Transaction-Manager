"use client";

import { cn } from "@/lib/utils";
import type { ItemIssue, UseItemFormReturn } from "./use-item-form";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((w) => w[0]).join("");
  return (letters || "?").toUpperCase();
}

interface SummaryPanelProps {
  form: UseItemFormReturn;
  onJump: (issue: ItemIssue) => void;
}

export function SummaryPanel({ form, onJump }: SummaryPanelProps) {
  return (
    <aside
      aria-label="Item summary"
      className="flex flex-col gap-5 border-t bg-muted/30 p-5 lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-t-0"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/10 font-semibold text-primary">
          {initialsOf(form.master.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">
            {form.master.name.trim() || "Untitled item"}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {form.master.sku.trim() || "No SKU yet"}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        {form.master.type === "PRODUCT" ? (
          <>
            <dt className="text-muted-foreground">Counted in</dt>
            <dd className="text-right font-mono text-xs">
              {form.master.unit || "—"}
            </dd>
          </>
        ) : (
          <>
            <dt className="text-muted-foreground">Unit</dt>
            <dd className="text-right font-mono text-xs">
              {form.master.unit || "—"}
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">Sells for</dt>
        <dd className="text-right font-mono text-xs">
          {form.money.baseCurrency} {form.master.salesPrice.toFixed(3)}
        </dd>
        <dt className="text-muted-foreground">
          With {form.money.taxName} {form.money.taxPct}%
        </dt>
        <dd className="text-right font-mono text-xs">
          {form.money.baseCurrency} {form.money.taxInclusive.toFixed(3)}
        </dd>
        <dt className="text-muted-foreground">Best cost</dt>
        <dd className="text-right font-mono text-xs">
          {form.money.bestCost !== null
            ? `${form.money.baseCurrency} ${form.money.bestCost.toFixed(3)}`
            : "No price yet"}
        </dd>
        <dt className="text-muted-foreground">Margin</dt>
        <dd
          className={cn(
            "text-right font-mono text-xs",
            form.money.marginPct === null
              ? ""
              : form.money.marginPct < 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {form.money.marginPct === null
            ? "—"
            : `${form.money.marginPct.toFixed(1)}%`}
        </dd>
      </dl>

      <div className="space-y-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Ready to save
        </h4>
        <ul className="space-y-1.5 text-sm">
          {[
            [
              "Name and SKU",
              !!(form.master.name.trim() && form.master.sku.trim()),
            ],
            ["Base unit", !!(form.master.unit || form.master.unitId)],
            [
              "Sale price",
              form.master.salesPrice > 0 || !form.master.isSaleable,
            ],
            ["Suppliers", form.supplierDrafts.length > 0],
          ].map(([label, ok]) => (
            <li key={label as string} className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full border",
                  ok
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-muted-foreground/40",
                )}
              />
              <span className={cn(!ok && "text-muted-foreground")}>
                {label as string}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {form.tried && form.issues.length > 0 && (
        <div className="space-y-1.5 rounded-lg bg-destructive/10 p-3">
          <h4 className="text-sm font-medium text-destructive">
            {form.issues.length} {form.issues.length === 1 ? "thing" : "things"}{" "}
            to fix
          </h4>
          <ul className="space-y-1">
            {form.issues.map((issue: ItemIssue) => (
              <li key={issue.anchor + issue.message}>
                <button
                  type="button"
                  onClick={() => onJump(issue)}
                  className="text-left text-sm underline decoration-destructive underline-offset-2"
                >
                  {issue.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
