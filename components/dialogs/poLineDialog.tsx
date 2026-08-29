"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Package, Save } from "lucide-react";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
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
import { POItemSelectDialog } from "./poItemSelectDialog";

const lineEditSchema = z
  .object({
    mode: z.enum(["item", "manual"]).default("item"),
    itemId: z.string().optional(),
    description: z.string().optional(),
    quantity: z.coerce.number().positive("Qty must be > 0"),
    unitCost: z.coerce.number().min(0, "Unit cost must be >= 0"),
    taxRateId: z.string().optional(),
    taxRateSnapshot: z.coerce.number().optional(),
    taxRateName: z.string().optional(),
  })
  .refine((l) => l.mode !== "item" || !!l.itemId, {
    message: "Select an item",
    path: ["itemId"],
  });

type LineEditValues = z.infer<typeof lineEditSchema>;

export interface POLineData {
  mode?: "item" | "manual";
  itemId?: string | null;
  description?: string | null;
  quantity: number;
  unitCost: number;
  taxRateId?: string | null;
  taxRateSnapshot?: number | null;
  taxRateName?: string | null;
}

interface POLineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  index: number;
  initial: POLineData;
  items: any[];
  itemsLoading: boolean;
  existingItemIds: string[];
  onSave: (index: number, data: POLineData) => void;
}

export function POLineDialog({
  open,
  onOpenChange,
  index,
  initial,
  items,
  itemsLoading,
  existingItemIds,
  onSave,
}: POLineDialogProps) {
  const [itemPickerOpen, setItemPickerOpen] = React.useState(false);
  const { data: taxRatesData } = trpc.settings.taxRates.list.useQuery();
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
      unitCost: initial.unitCost,
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
        unitCost: initial.unitCost,
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
  const cost = Number(watched?.unitCost) || 0;
  const lineSubtotal = qty * cost;
  const taxRateId = watched?.taxRateId;
  const taxRatesMap = React.useMemo(
    () => Object.fromEntries(taxRates.map((tr: any) => [tr.id, tr])),
    [taxRates],
  );
  const taxRate = taxRatesMap[taxRateId || ""] as any;
  const lineTax = taxRate ? lineSubtotal * (Number(taxRate.rate) / 100) : 0;

  const onSubmit = (values: LineEditValues) => {
    onSave(index, {
      mode: values.mode,
      itemId: values.itemId || null,
      description: values.description || null,
      quantity: values.quantity,
      unitCost: values.unitCost,
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
    const supplierItem = selected.supplierItems?.[0];
    const tr = taxRatesMap[selected?.taxRate?.id] as any;
    setValue("mode", "item");
    setValue("itemId", selected.id);
    setValue("description", selected.description || undefined);
    setValue(
      "unitCost",
      Number(supplierItem?.basePrice ?? selected.purchasePrice) || 0,
    );
    setValue("taxRateId", selected.taxRate?.id);
    setValue("taxRateSnapshot", tr ? Number(tr.rate) : undefined);
    setValue("taxRateName", tr?.name || undefined);
    setItemPickerOpen(false);
  };

  const handleModeChange = (value: string) => {
    if (value === "manual") {
      setValue("mode", "manual");
      setValue("itemId", undefined as any);
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
      <DialogContent
        data-picker-dialog
        className="flex max-h-[min(92dvh,100vh)] flex-col gap-4 overflow-hidden p-4 sm:max-w-md sm:p-6"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>PO line {index + 1}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {/* Totals preview */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              <span>
                Subtotal:{" "}
                <span className="font-medium text-foreground">
                  {lineSubtotal.toFixed(3)}
                </span>
              </span>
              <span>
                VAT:{" "}
                <span className="font-medium text-foreground">
                  +{lineTax.toFixed(3)}
                </span>
              </span>
              <span className="text-sm font-bold text-foreground border-t pt-0.5 w-full">
                Total: {(lineSubtotal + lineTax).toFixed(3)}
              </span>
            </div>

            {/* Line mode: Item (inventory) vs Manual (no inventory) */}
            <div className="space-y-1.5">
              <Label className="text-xs">Line type</Label>
              <RadioGroup
                value={mode}
                onValueChange={handleModeChange}
                className="grid grid-cols-2 gap-2"
              >
                <Label
                  htmlFor={`po-line-mode-item-${index}`}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
                >
                  <RadioGroupItem
                    value="item"
                    id={`po-line-mode-item-${index}`}
                  />
                  <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                  Item (stock)
                </Label>
                <Label
                  htmlFor={`po-line-mode-manual-${index}`}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
                >
                  <RadioGroupItem
                    value="manual"
                    id={`po-line-mode-manual-${index}`}
                  />
                  Manual (no stock)
                </Label>
              </RadioGroup>
            </div>

            {/* Item selector / Description */}
            {isManual ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input
                  placeholder="Describe this purchase entry..."
                  {...register("description")}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Item</Label>
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
                    <span className="text-muted-foreground">Select item</span>
                  )}
                </Button>
                {errors.itemId && (
                  <p className="text-xs text-destructive">
                    {errors.itemId.message}
                  </p>
                )}
              </div>
            )}

            {/* Numeric fields: Qty, Unit cost */}
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <div className="space-y-1.5">
                <Label className="text-xs">Qty</Label>
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
                <Label className="text-xs">Unit cost</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.001"
                  {...register("unitCost")}
                />
                {errors.unitCost && (
                  <p className="text-xs text-destructive">
                    {errors.unitCost.message}
                  </p>
                )}
              </div>
            </div>

            {isManual && (
              <p className="text-xs text-muted-foreground">
                Manual lines don&apos;t update inventory or affect item average
                cost when received.
              </p>
            )}

            {/* VAT rate */}
            <div className="space-y-1.5">
              <Label className="text-xs">VAT rate</Label>
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
                  <SelectValue placeholder="VAT rate" />
                </SelectTrigger>
                <SelectContent className="max-w-[75vw]">
                  <SelectItem value="none">No VAT</SelectItem>
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
              Cancel
            </Button>
            <Button type="submit" className="flex-1 max-sm:flex-1">
              <Save className="h-4 w-4 mr-1.5" /> Save line
            </Button>
          </DialogFooter>
        </form>

        <POItemSelectDialog
          open={itemPickerOpen}
          onOpenChange={setItemPickerOpen}
          items={items}
          isLoading={itemsLoading}
          existingItemIds={existingItemIds}
          singleSelect
          onSelect={handleItemPicked}
        />
      </DialogContent>
    </Dialog>
  );
}
