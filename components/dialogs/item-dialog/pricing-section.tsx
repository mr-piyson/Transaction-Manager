"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ANCHORS, type UseItemFormReturn } from "./use-item-form";

interface PricingSectionProps {
  form: UseItemFormReturn;
  canManage: boolean;
}

export function PricingSection({ form, canManage }: PricingSectionProps) {
  const { master, taxRates, money, setMasterField, errorFor } = form;

  const priceError = errorFor(ANCHORS.price);
  const editable = canManage;

  const priceHint = (() => {
    if (money.bestCost !== null && master.salesPrice > 0) {
      if (master.salesPrice < money.bestCost) {
        return {
          text: `Below your best supplier cost of ${money.baseCurrency} ${money.bestCost.toFixed(3)}.`,
          warn: true,
        };
      }
      const margin = (
        ((master.salesPrice - money.bestCost) / master.salesPrice) *
        100
      ).toFixed(1);
      return { text: `Margin ${margin}% on best cost.`, warn: false };
    }
    return { text: "", warn: false };
  })();

  const taxHint =
    master.salesPrice > 0 && money.taxPct > 0
      ? `With tax: ${money.baseCurrency} ${money.taxInclusive.toFixed(3)}`
      : "";

  return (
    <section
      id="sec-pricing"
      data-section="pricing"
      className="scroll-mt-4 space-y-5 border-b py-6"
    >
      <div>
        <h3 className="text-lg font-medium">Pricing and tax</h3>
        <p className="text-sm text-muted-foreground">
          What you charge. Cost comes from the supplier prices below.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={ANCHORS.price}>
          <Label htmlFor={ANCHORS.price}>
            {master.type === "PRODUCT" ? "Sale price" : "Sale price"}
          </Label>
          <div
            className={cn(
              "flex items-stretch rounded-md border",
              priceError && "border-destructive",
            )}
          >
            <span className="flex items-center rounded-l-md border-r bg-muted px-3 font-mono text-xs text-muted-foreground">
              {money.baseCurrency}
            </span>
            <Input
              id={ANCHORS.price}
              type="number"
              min={0}
              step={0.001}
              placeholder="0.000"
              className="rounded-l-none border-0 font-mono focus-visible:ring-0"
              value={master.salesPrice}
              disabled={!editable}
              onChange={(e) =>
                setMasterField("salesPrice", Number(e.target.value) || 0)
              }
            />
          </div>
          {priceError && (
            <p className="text-sm text-destructive">{priceError}</p>
          )}
          {!priceError && priceHint.text && (
            <p
              className={cn(
                "text-xs",
                priceHint.warn
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground",
              )}
            >
              {priceHint.text}
            </p>
          )}
        </Field>

        <Field>
          <Label htmlFor="item-field-tax">Tax rate</Label>
          <Select
            items={taxRates.map((t: any) => ({
              value: t.id,
              label: `${t.name} (${Number(t.rate)}%)`,
            }))}
            value={master.taxRateId ?? ""}
            disabled={!editable}
            onValueChange={(v) => setMasterField("taxRateId", v || undefined)}
          >
            <SelectTrigger id="item-field-tax">
              <SelectValue placeholder="No tax rate" />
            </SelectTrigger>
            <SelectContent>
              {taxRates.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({Number(t.rate)}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {taxHint && (
            <p className="text-xs text-muted-foreground">{taxHint}</p>
          )}
        </Field>

        <label
          htmlFor="item-field-saleable"
          className="flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3"
        >
          <span className="font-medium">
            Can be sold
            <small className="block text-xs font-normal text-muted-foreground">
              Shows up on quotes and invoices
            </small>
          </span>
          <Switch
            id="item-field-saleable"
            checked={master.isSaleable}
            disabled={!editable}
            onCheckedChange={(v) => setMasterField("isSaleable", v)}
          />
        </label>

        <label
          htmlFor="item-field-purchasable"
          className="flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3"
        >
          <span className="font-medium">
            Can be purchased
            <small className="block text-xs font-normal text-muted-foreground">
              Shows up on purchase orders
            </small>
          </span>
          <Switch
            id="item-field-purchasable"
            checked={master.isPurchasable}
            disabled={!editable}
            onCheckedChange={(v) => setMasterField("isPurchasable", v)}
          />
        </label>
      </div>
    </section>
  );
}
