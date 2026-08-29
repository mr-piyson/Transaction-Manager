"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { InvoiceItemSelectDialog } from "@/components/dialogs/invoiceItemSelectDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";

const lineEditSchema = z.object({
  mode: z.enum(["item", "manual"]).default("item"),
  itemId: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().positive("Qty must be > 0"),
  unitPrice: z.coerce.number().min(0, "Price must be >= 0"),
  discountAmt: z.coerce.number().min(0).default(0),
  purchasePrice: z.coerce.number().min(0).optional(),
  taxRateId: z.string().optional(),
  taxRateSnapshot: z.coerce.number().optional(),
  taxRateName: z.string().optional(),
});

type LineEditValues = z.infer<typeof lineEditSchema>;

export interface InvoiceLineData {
  itemId?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  discountAmt: number;
  purchasePrice?: number | null;
  taxRateId?: string | null;
  taxRateSnapshot?: number | null;
  taxRateName?: string | null;
}

interface InvoiceLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  index: number;
  initial: InvoiceLineData;
  onSave: (index: number, data: InvoiceLineData) => void;
}

export function InvoiceLineDialog({
  open,
  onOpenChange,
  index,
  initial,
  onSave,
}: InvoiceLineDialogProps) {
  const t = useTranslations();
  const [itemPickerOpen, setItemPickerOpen] = React.useState(false);
  const { data: itemsData, isLoading: itemsLoading } = trpc.items.list.useQuery(
    { isSaleable: true },
  );
  const { data: categoriesData } = trpc.categories.list.useQuery();
  const { data: taxRatesData } = trpc.settings.taxRates.list.useQuery();

  const items: any[] = itemsData ?? [];
  const categories: any[] = categoriesData ?? [];
  const taxRates: any[] = taxRatesData ?? [];

  const itemsMap = React.useMemo(
    () => Object.fromEntries(items.map((i: any) => [i.id, i])),
    [items],
  );

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<LineEditValues>({
    resolver: zodResolver(lineEditSchema) as any,
    defaultValues: {
      mode: initial.itemId ? "item" : "manual",
      itemId: initial.itemId || undefined,
      description: initial.description || undefined,
      quantity: initial.quantity,
      unitPrice: initial.unitPrice,
      discountAmt: initial.discountAmt,
      purchasePrice: initial.purchasePrice ?? undefined,
      taxRateId: initial.taxRateId || undefined,
      taxRateSnapshot: initial.taxRateSnapshot ?? undefined,
      taxRateName: initial.taxRateName || undefined,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        mode: initial.itemId ? "item" : "manual",
        itemId: initial.itemId || undefined,
        description: initial.description || undefined,
        quantity: initial.quantity,
        unitPrice: initial.unitPrice,
        discountAmt: initial.discountAmt,
        purchasePrice: initial.purchasePrice ?? undefined,
        taxRateId: initial.taxRateId || undefined,
        taxRateSnapshot: initial.taxRateSnapshot ?? undefined,
        taxRateName: initial.taxRateName || undefined,
      });
    }
  }, [open, initial, reset]);

  const watched = useWatch({ control });
  const itemId = watched?.itemId;
  const mode = watched?.mode ?? "item";
  const isManual = mode === "manual";
  const qty = Number(watched?.quantity) || 0;
  const price = Number(watched?.unitPrice) || 0;
  const costBasis = Number(watched?.purchasePrice) || 0;
  const discount = Number(watched?.discountAmt) || 0;
  const lineSubtotal = qty * price;
  const lineTotal = lineSubtotal - discount;
  const taxRateId = watched?.taxRateId;
  const taxRatesMap = React.useMemo(
    () => Object.fromEntries(taxRates.map((tr: any) => [tr.id, tr])),
    [taxRates],
  );
  const taxRate = taxRatesMap[taxRateId || ""] as any;
  const lineTax = taxRate ? lineTotal * (Number(taxRate.rate) / 100) : 0;
  const lineCogs = qty * costBasis;
  const grossProfit = lineTotal - lineCogs;
  const margin = lineTotal > 0 ? (grossProfit / lineTotal) * 100 : 0;

  const onSubmit = (values: LineEditValues) => {
    onSave(index, {
      itemId: values.itemId || null,
      description: values.description || null,
      quantity: values.quantity,
      unitPrice: values.unitPrice,
      discountAmt: values.discountAmt,
      purchasePrice: values.purchasePrice || null,
      taxRateId: values.taxRateId || null,
      taxRateSnapshot: values.taxRateSnapshot ?? null,
      taxRateName: values.taxRateName || null,
    });
    onOpenChange(false);
  };

  const handleItemPicked = (picked: any[]) => {
    const selected = picked[0] as any;
    if (!selected) {
      setItemPickerOpen(false);
      return;
    }
    const tr = taxRatesMap[selected?.taxRate?.id] as any;
    setValue("mode", "item");
    setValue("itemId", selected.id);
    setValue("description", selected.description || undefined);
    setValue("unitPrice", Number(selected.salesPrice) || 0);
    setValue("purchasePrice", Number(selected.purchasePrice) || 0);
    setValue("taxRateId", selected.taxRate?.id);
    setValue("taxRateSnapshot", tr ? Number(tr.rate) : undefined);
    setValue("taxRateName", tr?.name || undefined);
    setItemPickerOpen(false);
  };

  const handleModeChange = (value: string) => {
    if (value === "manual") {
      setValue("mode", "manual");
      setValue("itemId", undefined as any);
      setValue("unitPrice", 0);
      setValue("purchasePrice", 0);
      setValue("taxRateId", undefined);
      setValue("taxRateSnapshot", undefined);
      setValue("taxRateName", undefined);
    } else {
      setValue("mode", "item");
    }
  };

  const selectedItem = itemId ? (itemsMap[itemId] as any) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,100vh)] flex-col gap-4 overflow-hidden p-4 sm:max-w-md sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {t("invoices.lineItemTitle", { number: index + 1 })}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {/* Profit preview */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              <span>
                {t("invoices.subtotal")}:{" "}
                <span className="font-medium text-foreground">
                  {lineSubtotal.toFixed(3)}
                </span>
              </span>
              <span>
                {t("invoices.discount")}:{" "}
                <span className="font-medium text-destructive">
                  -{discount.toFixed(3)}
                </span>
              </span>
              <span>
                {t("invoices.tax")}:{" "}
                <span className="font-medium text-foreground">
                  +{lineTax.toFixed(3)}
                </span>
              </span>
              <span>
                {t("invoices.cogs")}:{" "}
                <span className="font-medium text-foreground">
                  {lineCogs.toFixed(3)}
                </span>
              </span>
              <span
                className={grossProfit >= 0 ? "text-green-600" : "text-red-600"}
              >
                {t("invoices.gp")}: {grossProfit.toFixed(3)} (
                {margin.toFixed(1)}
                %)
              </span>
              <span className="text-sm font-bold text-foreground border-t pt-0.5 w-full">
                {t("common.total")}: {(lineTotal + lineTax).toFixed(3)}
              </span>
            </div>

            {/* Line mode: Item (stock) vs Manual (service) */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("invoices.lineType")}</Label>
              <RadioGroup
                value={mode}
                onValueChange={handleModeChange}
                className="grid grid-cols-2 gap-2"
              >
                <Label
                  htmlFor={`line-mode-item-${index}`}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
                >
                  <RadioGroupItem value="item" id={`line-mode-item-${index}`} />
                  <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {t("invoices.itemMode")}
                </Label>
                <Label
                  htmlFor={`line-mode-manual-${index}`}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
                >
                  <RadioGroupItem
                    value="manual"
                    id={`line-mode-manual-${index}`}
                  />
                  {t("invoices.manualMode")}
                </Label>
              </RadioGroup>
            </div>

            {/* Item selector / Description */}
            {isManual ? (
              <div className="space-y-1.5">
                <Label className="text-xs">{t("common.description")}</Label>
                <Input
                  placeholder={t("invoices.describeLineItem")}
                  {...register("description")}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">{t("invoices.item")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setItemPickerOpen(true)}
                >
                  <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {selectedItem ? (
                    <span className="min-w-0 flex-1 truncate text-left">
                      {selectedItem.sku} — {selectedItem.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("invoices.selectItem")}
                    </span>
                  )}
                </Button>
              </div>
            )}

            {/* Numeric fields: Qty, Unit price, Discount, Unit cost */}
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("invoices.qty")}</Label>
                <Input
                  type="number"
                  min={0.001}
                  step="any"
                  {...register("quantity")}
                />
                {errors.quantity && (
                  <p className="text-xs text-destructive">
                    {errors.quantity.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("invoices.unitPrice")}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.001"
                  {...register("unitPrice")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("invoices.discount")}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.001"
                  {...register("discountAmt")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("invoices.cost")}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.001"
                  {...register("purchasePrice")}
                />
              </div>
            </div>

            {/* Tax rate */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("invoices.taxRate")}</Label>
              <Select
                value={taxRateId || "none"}
                onValueChange={(v) => {
                  const tr = v === "none" ? undefined : (taxRatesMap[v] as any);
                  setValue("taxRateId", v === "none" ? undefined : v);
                  setValue("taxRateSnapshot", tr ? Number(tr.rate) : undefined);
                  setValue("taxRateName", tr?.name || undefined);
                }}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder={t("invoices.taxRate")} />
                </SelectTrigger>
                <SelectContent className="max-w-[75vw]">
                  <SelectItem value="none">{t("invoices.noTax")}</SelectItem>
                  {taxRates.map((tr: any) => (
                    <SelectItem key={tr.id} value={tr.id}>
                      {tr.name} ({Number(tr.rate)}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t pt-3 max-sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1 max-sm:flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="flex-1 max-sm:flex-1">
              <Calculator className="h-4 w-4 mr-1.5" /> {t("invoices.saveLine")}
            </Button>
          </DialogFooter>
        </form>

        {/* Item picker (nested inside DialogContent so Radix layers properly) */}
        <InvoiceItemSelectDialog
          open={itemPickerOpen}
          onOpenChange={setItemPickerOpen}
          items={items}
          categories={categories}
          isLoading={itemsLoading}
          existingItemIds={itemId ? [itemId] : []}
          singleSelect
          onSelect={handleItemPicked}
        />
      </DialogContent>
    </Dialog>
  );
}
