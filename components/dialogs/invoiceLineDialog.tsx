"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { InvoiceItemSelectDialog } from "@/components/dialogs/invoiceItemSelectDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  convertAmount,
  defaultUnitIdFor,
  factorForUnit,
  itemUnitOptions,
} from "@/lib/uom-client";

const lineEditSchema = z.object({
  mode: z.enum(["item", "manual"]).default("item"),
  itemId: z.string().nullish(),
  description: z.string().nullish(),
  quantity: z.coerce.number().positive("Qty must be > 0"),
  unitPrice: z.coerce.number().min(0, "Price must be >= 0"),
  unitId: z.string().nullish(),
  discountAmt: z.coerce.number().min(0).default(0),
  purchasePrice: z.coerce.number().min(0).nullish(),
  taxRateId: z.string().nullish(),
  taxRateSnapshot: z.coerce.number().nullish(),
  taxRateName: z.string().nullish(),
});

type LineEditValues = z.infer<typeof lineEditSchema>;

function initialToDefaults(initial: InvoiceLineData): LineEditValues {
  return {
    mode: initial.itemId ? "item" : "manual",
    itemId: initial.itemId || undefined,
    description: initial.description || undefined,
    quantity: initial.quantity,
    unitPrice: initial.unitPrice,
    unitId: initial.unitId || undefined,
    discountAmt: initial.discountAmt,
    purchasePrice: initial.purchasePrice ?? undefined,
    taxRateId: initial.taxRateId || undefined,
    taxRateSnapshot: initial.taxRateSnapshot ?? undefined,
    taxRateName: initial.taxRateName || undefined,
  };
}

export interface InvoiceLineData {
  itemId?: string | null;
  itemName?: string | null;
  itemSku?: string | null;
  itemImage?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  /** Selected unit; null = item Base Unit. */
  unitId?: string | null;
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
  /** Item ids used by sibling lines, so the picker can exclude duplicates. */
  otherExistingItemIds?: string[];
  onSave: (index: number, data: InvoiceLineData) => void;
}

export function InvoiceLineDialog({
  open,
  onOpenChange,
  index,
  initial,
  otherExistingItemIds,
  onSave,
}: InvoiceLineDialogProps) {
  const t = useTranslations();
  const [itemPickerOpen, setItemPickerOpen] = React.useState(false);
  const [adminAlertOpen, setAdminAlertOpen] = React.useState(false);
  const { data: me } = trpc.auth.me.useQuery();
  const isAdmin = me?.platformRole === "SUPER_ADMIN" || me?.orgRole === "OWNER";
  const { data: itemsData, isLoading: itemsLoading } = trpc.items.list.useQuery(
    { isSaleable: true, withStock: true },
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
    defaultValues: initialToDefaults(initial),
  });

  // `initial` is rebuilt as a fresh object literal on every parent render, so
  // keying this effect on it would re-seed the form (wiping in-progress input)
  // whenever the parent re-renders while the dialog is open. Only seed on the
  // closed -> open transition.
  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      reset(initialToDefaults(initial));
    }
    wasOpenRef.current = open;
  }, [open, initial, reset]);

  const watched = useWatch({ control });
  const itemId = watched?.itemId;
  const mode = watched?.mode ?? "item";
  const isManual = mode === "manual";
  const qty = Number(watched?.quantity) || 0;
  const price = Number(watched?.unitPrice) || 0;
  const discount = Number(watched?.discountAmt) || 0;
  const unitId = watched?.unitId ?? undefined;
  const lineSubtotal = qty * price;
  const lineTotal = lineSubtotal - discount;
  const taxRateId = watched?.taxRateId;
  const taxRatesMap = React.useMemo(
    () => Object.fromEntries(taxRates.map((tr: any) => [tr.id, tr])),
    [taxRates],
  );
  const taxRate = taxRatesMap[taxRateId || ""] as any;
  const lineTax = taxRate ? lineTotal * (Number(taxRate.rate) / 100) : 0;
  const catalogueItem = itemId ? (itemsMap[itemId] as any) : undefined;
  const unitOptions = React.useMemo(
    () => (isManual ? [] : itemUnitOptions(catalogueItem)),
    [isManual, catalogueItem],
  );
  const selectedOption = unitOptions.find((u) => u.unitId === unitId);
  const lineFactor = factorForUnit(catalogueItem, unitId);
  const baseCode = catalogueItem?.unit ?? "";
  // Fall back to the name/sku snapshot carried on the line so a line whose item
  // is excluded from the catalogue query still shows what it refers to.
  const selectedItem = catalogueItem
    ? catalogueItem
    : itemId
      ? { id: itemId, name: initial.itemName, sku: initial.itemSku }
      : undefined;
  const averageCost = !isManual ? Number(catalogueItem?.averageCost) || 0 : 0;
  // Average cost is stored per Base Unit — scale it to the selected unit.
  const unitAvgCost = averageCost * lineFactor;
  const lineCogs = isManual ? 0 : qty * unitAvgCost;
  const grossProfit = lineTotal - lineCogs;
  const margin = lineTotal > 0 ? (grossProfit / lineTotal) * 100 : 0;
  const belowAverageCost =
    !isManual && price > 0 && Boolean(selectedItem) && price < unitAvgCost;
  // Stock availability (base units) with an equivalent in the selected unit.
  const availableBase =
    !isManual && catalogueItem?.totalStock !== undefined
      ? Number(catalogueItem.totalStock) || 0
      : null;
  const requestedBase = qty * lineFactor;
  const overStock = availableBase !== null && requestedBase > availableBase;

  const onSubmit = (values: LineEditValues) => {
    const gateFactor = factorForUnit(
      itemsMap[values.itemId ?? ""],
      values.unitId,
    );
    const gateAvgCost =
      (Number(itemsMap[values.itemId ?? ""]?.averageCost) || 0) * gateFactor;
    const isBelow =
      !isManual && values.unitPrice > 0 && values.unitPrice < gateAvgCost;
    if (isBelow && !isAdmin) {
      setAdminAlertOpen(true);
      return;
    }
    // Re-derive the display snapshot from the picked item, falling back to the
    // one the line arrived with when the item is not in the catalogue query.
    const sameItem = Boolean(values.itemId) && values.itemId === initial.itemId;
    const picked = values.itemId ? (itemsMap[values.itemId] as any) : undefined;
    onSave(index, {
      itemId: values.itemId || null,
      itemName: picked?.name ?? (sameItem ? (initial.itemName ?? null) : null),
      itemSku: picked?.sku ?? (sameItem ? (initial.itemSku ?? null) : null),
      itemImage:
        picked?.image ?? (sameItem ? (initial.itemImage ?? null) : null),
      description: values.description || null,
      quantity: values.quantity,
      unitPrice: values.unitPrice,
      unitId: values.unitId || null,
      discountAmt: values.discountAmt,
      purchasePrice: values.purchasePrice || null,
      taxRateId: values.taxRateId || null,
      taxRateSnapshot: values.taxRateSnapshot ?? null,
      taxRateName: values.taxRateName || null,
    });
    onOpenChange(false);
  };

  /** Suggested purchase cost (COGS) per selected unit — mirrors server D2. */
  const suggestedPurchaseCost = (item: any, targetUnitId?: string) => {
    const factor = factorForUnit(item, targetUnitId);
    const avg = Number(item?.averageCost) || 0;
    if (avg > 0) return avg * factor;
    const supplierBase = Number(item?.supplierItems?.[0]?.basePrice);
    if (!Number.isFinite(supplierBase)) return 0;
    const purchFactor =
      Number(
        (item?.itemUoms ?? []).find((u: any) => u.isPurchaseDefault)?.factor ??
          1,
      ) || 1;
    // supplierBase is per purchase-default unit → per selected unit.
    return (supplierBase * factor) / purchFactor;
  };

  const handleItemPicked = (picked: any[]) => {
    const selected = picked[0] as any;
    if (!selected) {
      setItemPickerOpen(false);
      return;
    }
    const tr = taxRatesMap[selected?.taxRate?.id] as any;
    const defaultUnitId = defaultUnitIdFor(selected, "sale");
    const factor = factorForUnit(selected, defaultUnitId);
    setValue("mode", "item");
    setValue("itemId", selected.id);
    setValue("description", selected.description || undefined);
    setValue("unitId", defaultUnitId ?? undefined);
    // salesPrice / supplier basePrice are stored per Base Unit / purchase
    // default — express them in the selected unit.
    setValue(
      "unitPrice",
      Math.round((Number(selected.salesPrice) || 0) * factor * 1e6) / 1e6,
    );
    setValue(
      "purchasePrice",
      Math.round(suggestedPurchaseCost(selected, defaultUnitId) * 1e6) / 1e6,
    );
    setValue("taxRateId", selected.taxRate?.id);
    setValue("taxRateSnapshot", tr ? Number(tr.rate) : undefined);
    setValue("taxRateName", tr?.name || undefined);
    setItemPickerOpen(false);
  };

  const handleUnitChange = (nextUnitId: string) => {
    const oldFactor = lineFactor;
    const newFactor = factorForUnit(catalogueItem, nextUnitId);
    setValue("unitId", nextUnitId, { shouldDirty: true });
    if (oldFactor !== newFactor) {
      const nextPrice = convertAmount(price, oldFactor, newFactor);
      setValue("unitPrice", Math.round(nextPrice * 1e6) / 1e6, {
        shouldDirty: true,
      });
      const prevPurchase = Number(watched?.purchasePrice) || 0;
      if (prevPurchase > 0) {
        const nextPurchase = convertAmount(prevPurchase, oldFactor, newFactor);
        setValue("purchasePrice", Math.round(nextPurchase * 1e6) / 1e6, {
          shouldDirty: true,
        });
      }
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,100vh)] flex-col gap-4 overflow-hidden p-4 sm:max-w-md sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {t("invoices.lineItemTitle", { number: index + 1 })}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(onSubmit)(e);
          }}
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
              {!isManual && (
                <>
                  {averageCost > 0 && (
                    <span>
                      {t("invoices.avgCost")}:{" "}
                      <span className="font-medium text-foreground">
                        {unitAvgCost.toFixed(3)}
                      </span>
                    </span>
                  )}
                  <span>
                    {t("invoices.cogs")}:{" "}
                    <span className="font-medium text-foreground">
                      {lineCogs.toFixed(3)}
                    </span>
                  </span>
                  <span
                    className={
                      grossProfit >= 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {t("invoices.gp")}: {grossProfit.toFixed(3)} (
                    {margin.toFixed(1)}
                    %)
                  </span>
                </>
              )}
              {belowAverageCost && (
                <span className="w-full font-medium text-amber-600">
                  {t("invoices.belowAvgCostWarning")}
                </span>
              )}
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

            {/* Unit of measure (item lines only) */}
            {!isManual && unitOptions.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">{t("invoices.unit")}</Label>
                <Select value={unitId || ""} onValueChange={handleUnitChange}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder={t("invoices.unit")} />
                  </SelectTrigger>
                  <SelectContent className="max-w-[75vw]">
                    {unitOptions.map((u) => (
                      <SelectItem key={u.unitId} value={u.unitId}>
                        {u.code}
                        {u.isBase ? ` (${t("invoices.baseUnitLower")})` : ""}
                        {u.isSalesDefault ? " ★" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap items-center justify-between gap-x-3 text-xs text-muted-foreground">
                  <span>
                    {selectedOption && !selectedOption.isBase
                      ? `1 ${selectedOption.code} = ${selectedOption.factor} ${baseCode}`
                      : t("invoices.baseUnitHint")}
                  </span>
                  {availableBase !== null && (
                    <span
                      className={
                        overStock
                          ? "font-medium text-amber-600"
                          : "tabular-nums"
                      }
                    >
                      {t("invoices.available")}: {availableBase.toFixed(3)}{" "}
                      {baseCode}
                      {lineFactor !== 1 &&
                        ` · ≈ ${(availableBase / lineFactor).toFixed(3)} ${selectedOption?.code ?? ""}`}
                      {overStock && ` · ${t("invoices.exceedsStock")}`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Numeric fields: Qty, Unit price, Discount */}
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
                {!isManual && lineFactor !== 1 && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    → {(qty * lineFactor).toFixed(3)} {baseCode}
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
                <Label className="text-xs">{t("invoices.taxRate")}</Label>
                <Select
                  value={taxRateId || "none"}
                  onValueChange={(v) => {
                    const tr =
                      v === "none" ? undefined : (taxRatesMap[v] as any);
                    setValue("taxRateId", v === "none" ? undefined : v);
                    setValue(
                      "taxRateSnapshot",
                      tr ? Number(tr.rate) : undefined,
                    );
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
          existingItemIds={otherExistingItemIds ?? []}
          singleSelect
          onSelect={handleItemPicked}
        />

        {/* Admin approval required: line price below item average cost */}
        <AlertDialog open={adminAlertOpen} onOpenChange={setAdminAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("invoices.adminApprovalRequiredTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("invoices.adminApprovalRequiredDesc", {
                  price: price.toFixed(3),
                  averageCost: unitAvgCost.toFixed(3),
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>{t("common.ok")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
