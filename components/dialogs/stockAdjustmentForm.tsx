"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Package,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const schema = z.object({
  itemId: z.string().min(1, "Select an item"),
  warehouseId: z.string().min(1, "Select a warehouse"),
  reasonId: z.string().min(1, "Select a reason"),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine((v) => Number(v) > 0, "Quantity must be positive"),
  notes: z.string().max(500).optional(),
});

type StockAdjustmentFormValues = z.infer<typeof schema>;

export type { StockAdjustmentFormValues };

type AdjustmentReason = {
  id: string;
  name: string;
  direction: "INCREASE" | "DECREASE";
  isActive: boolean;
};

interface ValidationAlertProps {
  errors: Partial<
    Record<keyof StockAdjustmentFormValues, { message?: string }>
  >;
}

function ValidationAlert({ errors }: ValidationAlertProps) {
  const messages = Object.values(errors)
    .map((e) => e?.message)
    .filter(Boolean) as string[];
  if (messages.length === 0) return null;
  return (
    <Alert variant="destructive" className="mb-4">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>Please fix the following</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc pl-4 space-y-0.5 text-sm">
          {messages.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export interface StockAdjustmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected item / warehouse (e.g. opened from a stock row) */
  itemId?: string;
  warehouseId?: string;
  onSuccess?: () => void;
}

export function StockAdjustmentFormDialog({
  open,
  onOpenChange,
  itemId: presetItemId,
  warehouseId: presetWarehouseId,
  onSuccess,
}: StockAdjustmentFormDialogProps) {
  const t = useTranslations();
  const utils = trpc.useUtils();

  const [itemSearch, setItemSearch] = React.useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      itemId: "",
      warehouseId: "",
      reasonId: "",
      quantity: "",
      notes: undefined,
    },
  });

  const itemId = watch("itemId");
  const warehouseId = watch("warehouseId");
  const reasonId = watch("reasonId");
  const quantity = watch("quantity");

  React.useEffect(() => {
    if (open) {
      reset({
        itemId: presetItemId ?? "",
        warehouseId: presetWarehouseId ?? "",
        reasonId: "",
        quantity: "",
        notes: undefined,
      });
      setItemSearch("");
    }
  }, [open, presetItemId, presetWarehouseId, reset]);

  // Data
  const { data: reasons = [] } = trpc.stock.reasons.list.useQuery(undefined, {
    enabled: open,
  });
  const { data: warehouses = [] } = trpc.warehouses.list.useQuery(
    {},
    { enabled: open },
  );
  const { data: itemResults = [], isPending: itemsLoading } =
    trpc.items.list.useQuery(
      { search: itemSearch.trim() || undefined, withStock: true },
      { enabled: open && !presetItemId },
    );
  const { data: presetItem } = trpc.items.byId.useQuery(
    { id: presetItemId ?? "" },
    { enabled: open && !!presetItemId },
  );
  const { data: itemStock } = trpc.stock.byItem.useQuery(
    { itemId },
    { enabled: open && !!itemId },
  );

  const selectedItem = presetItem ?? itemResults.find((i) => i.id === itemId);
  const currentQty =
    itemStock?.stocks.find((s) => s.warehouse.id === warehouseId)?.quantity ??
    0;
  const qtyNum = Number(quantity) || 0;
  const selectedReason = reasons.find((r) => r.id === reasonId);
  const isDecrease = selectedReason?.direction === "DECREASE";

  const mutation = trpc.stock.recordAdjustment.useMutation({
    onSuccess: () => {
      utils.stock.list.invalidate();
      utils.stock.movements.invalidate();
      utils.stock.byItem.invalidate();
      utils.items.list.invalidate();
      toast.success(t("stock.adjustments.recorded"));
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(t("stock.adjustments.failed"), { description: err.message }),
  });

  const onSubmit: SubmitHandler<StockAdjustmentFormValues> = (values) => {
    mutation.mutate({
      itemId: values.itemId,
      warehouseId: values.warehouseId,
      reasonId: values.reasonId,
      quantity: Number(values.quantity),
      notes: values.notes || undefined,
    });
  };

  const decreaseReasons = reasons.filter((r) => r.direction === "DECREASE");
  const increaseReasons = reasons.filter((r) => r.direction === "INCREASE");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !mutation.isPending && onOpenChange(v)}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("stock.adjustments.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("stock.adjustments.dialogDesc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <ValidationAlert errors={errors} />

          <div className="space-y-4">
            {/* Item */}
            <Field>
              <Label htmlFor="adjust-item">{t("common.item")} *</Label>
              {presetItemId ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <Package className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">
                    {presetItem?.name ?? "…"}
                  </span>
                  {presetItem?.sku && (
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {presetItem.sku}
                    </span>
                  )}
                </div>
              ) : itemId ? (
                <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className="truncate font-medium">
                    {selectedItem?.name ?? "…"}
                    {selectedItem?.sku && (
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {selectedItem.sku}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    aria-label={t("common.clear")}
                    onClick={() => setValue("itemId", "")}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <input
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder={t("stock.adjustments.searchItems")}
                      className="w-full bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-md border">
                    {itemsLoading ? (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                        {t("common.loading")}
                      </div>
                    ) : itemResults.length === 0 ? (
                      <div className="flex flex-col items-center gap-1 px-3 py-6 text-sm text-muted-foreground">
                        <Package className="size-5 opacity-40" />
                        {t("items.noItems")}
                      </div>
                    ) : (
                      itemResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setValue("itemId", item.id)}
                          className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent/40"
                        >
                          <span className="min-w-0 truncate">
                            {item.name}
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              {item.sku}
                            </span>
                          </span>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {Number(item.totalStock ?? 0)} {item.unit ?? ""}
                          </Badge>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
              {errors.itemId && (
                <p className="text-destructive text-xs">
                  {errors.itemId.message}
                </p>
              )}
            </Field>

            {/* Warehouse + Reason */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <Label htmlFor="adjust-warehouse">
                  {t("common.warehouse")} *
                </Label>
                <Select
                  value={warehouseId}
                  onValueChange={(v) => setValue("warehouseId", v)}
                >
                  <SelectTrigger id="adjust-warehouse">
                    <SelectValue
                      placeholder={t("warehouses.selectWarehouse")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.warehouseId && (
                  <p className="text-destructive text-xs">
                    {errors.warehouseId.message}
                  </p>
                )}
              </Field>

              <Field>
                <Label htmlFor="adjust-reason">{t("stock.reason")} *</Label>
                <Select
                  value={reasonId}
                  onValueChange={(v) => setValue("reasonId", v)}
                >
                  <SelectTrigger id="adjust-reason">
                    <SelectValue
                      placeholder={t("stock.adjustments.selectReason")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>
                        {t("stock.adjustments.writeOffs")}
                      </SelectLabel>
                      {decreaseReasons.map((r: AdjustmentReason) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>
                        {t("stock.adjustments.increases")}
                      </SelectLabel>
                      {increaseReasons.map((r: AdjustmentReason) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {errors.reasonId && (
                  <p className="text-destructive text-xs">
                    {errors.reasonId.message}
                  </p>
                )}
              </Field>
            </div>

            {/* Quantity + resulting stock preview */}
            <Field>
              <Label htmlFor="adjust-qty">{t("common.quantity")} *</Label>
              <Input
                id="adjust-qty"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.000"
                aria-invalid={!!errors.quantity}
                {...register("quantity")}
              />
              {errors.quantity && (
                <p className="text-destructive text-xs">
                  {errors.quantity.message}
                </p>
              )}
              {selectedReason && itemId && warehouseId && (
                <p
                  className={cn(
                    "flex items-center gap-1 text-xs",
                    isDecrease
                      ? "text-destructive"
                      : "text-green-600 dark:text-green-400",
                  )}
                >
                  {isDecrease ? (
                    <ArrowDownRight className="size-3.5" />
                  ) : (
                    <ArrowUpRight className="size-3.5" />
                  )}
                  {Number(currentQty).toFixed(3)} →{" "}
                  {(isDecrease
                    ? Number(currentQty) - qtyNum
                    : Number(currentQty) + qtyNum
                  ).toFixed(3)}{" "}
                  {selectedItem?.unit ?? ""}
                </p>
              )}
            </Field>

            {/* Notes */}
            <Field>
              <Label htmlFor="adjust-notes">{t("common.notes")}</Label>
              <Textarea
                id="adjust-notes"
                rows={2}
                placeholder={t("stock.adjustments.notesPlaceholder")}
                {...register("notes")}
              />
            </Field>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("stock.adjustments.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Provider + Hook

interface OpenOptions {
  itemId?: string;
  warehouseId?: string;
  onSuccess?: () => void;
}

interface StockAdjustmentFormContextValue {
  openCreate: (options?: OpenOptions) => void;
}

const StockAdjustmentFormContext =
  React.createContext<StockAdjustmentFormContextValue | null>(null);

interface DialogState extends OpenOptions {
  open: boolean;
}

export function StockAdjustmentFormProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({
      open: true,
      itemId: options?.itemId,
      warehouseId: options?.warehouseId,
      onSuccess: options?.onSuccess,
    });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <StockAdjustmentFormContext.Provider value={{ openCreate }}>
      {children}
      <StockAdjustmentFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        itemId={state.itemId}
        warehouseId={state.warehouseId}
        onSuccess={state.onSuccess}
      />
    </StockAdjustmentFormContext.Provider>
  );
}

export function useStockAdjustmentForm(): StockAdjustmentFormContextValue {
  const ctx = React.useContext(StockAdjustmentFormContext);
  if (!ctx)
    throw new Error(
      "useStockAdjustmentForm must be used inside <StockAdjustmentFormProvider>",
    );
  return ctx;
}
