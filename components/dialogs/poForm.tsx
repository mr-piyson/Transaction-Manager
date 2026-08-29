"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { type SubmitHandler, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DateInputField } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/hooks/use-currency";
import { toDateInputValue } from "@/lib/date";
import { trpc } from "@/lib/trpc/client";
import { CURRENCIES } from "@/lib/utils";
import { currencyCodeSchema } from "@/lib/validations";
import { POItemSelectDialog } from "./poItemSelectDialog";
import { type POLineData, POLineDialog } from "./poLineDialog";
import { SupplierSelectDialog } from "./supplierSelectDialog";

const lineSchema = z.object({
  mode: z.enum(["item", "manual"]).optional(),
  itemId: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().positive("Qty must be > 0"),
  unitCost: z.coerce.number().min(0, "Unit cost must be >= 0"),
  taxRateId: z.string().optional(),
  taxRateSnapshot: z.coerce.number().optional(),
  taxRateName: z.string().optional(),
});

const schema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  date: z.string().min(1, "Date is required"),
  currency: currencyCodeSchema.default("BHD"),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  lines: z.array(lineSchema).min(1, "At least one line is required"),
});

export type POFormValues = z.infer<typeof schema>;

interface ValidationAlertProps {
  errors: Record<string, { message?: string } | undefined>;
}

function ValidationAlert({ errors }: ValidationAlertProps) {
  const messages = Object.values(errors)
    .filter((e) => e?.message)
    .map((e) => e!.message!);
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

export interface POFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po?: { id: string; version?: number } & Partial<POFormValues>;
  onSuccess?: (poId: string) => void;
}

export function POFormDialog({
  open,
  onOpenChange,
  po,
  onSuccess,
}: POFormDialogProps) {
  const isEdit = Boolean(po?.id);
  const utils = trpc.useUtils();
  const router = useRouter();
  const { currency: orgCurrency } = useCurrency();
  const [itemPickerOpen, setItemPickerOpen] = React.useState(false);
  const [supplierPickerOpen, setSupplierPickerOpen] = React.useState(false);
  const [editingLine, setEditingLine] = React.useState<{
    index: number;
    isNew?: boolean;
    data: POLineData;
  } | null>(null);

  const { data: suppliersData } = trpc.suppliers.list.useQuery({});
  const { data: warehousesData } = trpc.warehouses.list.useQuery({});

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<POFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(po, warehousesData, orgCurrency),
  });

  const selectedSupplierId = watch("supplierId");

  const { data: itemsData, isLoading: itemsLoading } = trpc.items.list.useQuery(
    {
      type: "PRODUCT",
      supplierId: selectedSupplierId || undefined,
      withStock: true,
    },
    { enabled: !!selectedSupplierId },
  );

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const lines = watch("lines");

  const subtotal = React.useMemo(
    () =>
      (lines ?? []).reduce(
        (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0),
        0,
      ),
    [lines],
  );

  const vatTotal = React.useMemo(
    () =>
      (lines ?? []).reduce((s, l) => {
        const lineSubtotal =
          (Number(l.quantity) || 0) * (Number(l.unitCost) || 0);
        const rate = Number(l.taxRateSnapshot) || 0;
        return s + lineSubtotal * (rate / 100);
      }, 0),
    [lines],
  );

  // Auto-select default warehouse when data loads
  React.useEffect(() => {
    if (!watch("warehouseId") && warehousesData) {
      const def = warehousesData.find((w: any) => w.isDefault);
      if (def) setValue("warehouseId", def.id);
    }
  }, [warehousesData, watch, setValue]);

  // Clear line items when supplier changes
  const prevSupplierRef = React.useRef(selectedSupplierId);
  React.useEffect(() => {
    if (
      prevSupplierRef.current &&
      selectedSupplierId !== prevSupplierRef.current
    ) {
      setValue("lines", []);
    }
    prevSupplierRef.current = selectedSupplierId;
  }, [selectedSupplierId, setValue]);

  React.useEffect(() => {
    if (open) reset(defaults(po, warehousesData, orgCurrency));
  }, [open, po, warehousesData, orgCurrency, reset]);

  const createMutation = trpc.purchaseOrders.create.useMutation({
    onSuccess(data) {
      utils.purchaseOrders.list.invalidate();
      toast.success("Purchase order created", { description: data.serial });
      onSuccess?.(data.id);
      onOpenChange(false);
      router.push(`/erp/purchase-orders/${data.id}`);
    },
    onError(err) {
      toast.error("Failed to create PO", { description: err.message });
    },
  });

  const updateMutation = trpc.purchaseOrders.update.useMutation({
    onSuccess(data) {
      utils.purchaseOrders.list.invalidate();
      toast.success("Purchase order updated", { description: data.serial });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error("Failed to update PO", { description: err.message });
    },
  });

  const isPending =
    isSubmitting || createMutation.isPending || updateMutation.isPending;

  const onSubmit: SubmitHandler<POFormValues> = (values) => {
    const payload = {
      ...values,
      notes: values.notes || undefined,
      internalNotes: values.internalNotes || undefined,
      date: new Date(values.date),
      lines: values.lines.map((l) => ({
        mode: l.mode,
        itemId: l.itemId,
        description: l.description || undefined,
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost),
        taxRateId: l.taxRateId || undefined,
        taxRateSnapshot: l.taxRateSnapshot ?? undefined,
        taxRateName: l.taxRateName || undefined,
      })),
    };

    if (isEdit && po?.id) {
      updateMutation.mutate({
        id: po.id,
        version: po.version ?? 0,
        ...payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const suppliers = suppliersData ?? [];
  const warehouses = warehousesData ?? [];
  const items = itemsData ?? [];

  const itemsMap = React.useMemo(
    () => Object.fromEntries(items.map((i: any) => [i.id, i])),
    [items],
  );

  const handleItemsSelected = (selected: any[]) => {
    for (const item of selected) {
      const supplierItem = item.supplierItems?.[0];
      const tr = item.taxRate as any;
      append({
        mode: "item",
        itemId: item.id,
        quantity: Number(supplierItem?.minOrderQty) || 1,
        unitCost: Number(supplierItem?.basePrice ?? item.purchasePrice) || 0,
        taxRateId: item.taxRate?.id,
        taxRateSnapshot: tr ? Number(tr.rate) : undefined,
        taxRateName: tr?.name || undefined,
      });
    }
    setItemPickerOpen(false);
    if (selected.length === 1) {
      const item = selected[0];
      const tr = item.taxRate as any;
      const supplierItem = item.supplierItems?.[0];
      setEditingLine({
        index: fields.length,
        data: {
          mode: "item",
          itemId: item.id,
          description: null,
          quantity: Number(supplierItem?.minOrderQty) || 1,
          unitCost: Number(supplierItem?.basePrice ?? item.purchasePrice) || 0,
          taxRateId: item.taxRate?.id,
          taxRateSnapshot: tr ? Number(tr.rate) : undefined,
          taxRateName: tr?.name || undefined,
        },
      });
    }
  };

  const handleAddManualLine = () => {
    setEditingLine({
      index: fields.length,
      isNew: true,
      data: {
        mode: "manual",
        itemId: null,
        description: "",
        quantity: 1,
        unitCost: 0,
      },
    });
  };

  const openLineEditor = (index: number) => {
    const line = (lines ?? [])[index] as any;
    setEditingLine({
      index,
      data: {
        mode: line?.mode ?? (line?.itemId ? "item" : "manual"),
        itemId: line?.itemId || null,
        description: line?.description || null,
        quantity: Number(line?.quantity) || 0,
        unitCost: Number(line?.unitCost) || 0,
        taxRateId: line?.taxRateId || null,
        taxRateSnapshot: line?.taxRateSnapshot ?? null,
        taxRateName: line?.taxRateName || null,
      },
    });
  };

  const handleLineSave = (index: number, data: POLineData) => {
    if (editingLine?.isNew) {
      append(data as any);
    } else {
      setValue(`lines.${index}` as const, data as any);
    }
    setEditingLine(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
        <DialogContent
          className="sm:max-w-180 gap-0 p-0 h-[100dvh] sm:h-auto sm:max-h-[85vh] max-w-full sm:rounded-lg flex flex-col"
          onInteractOutside={(event) => {
            const target = (event as any).detail?.originalEvent?.target;
            if (
              target instanceof Element &&
              target.closest("[data-picker-dialog]")
            ) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader className="shrink-0 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
            <DialogTitle>
              {isEdit ? "Edit purchase order" : "New purchase order"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the details below and save."
                : "Fill in the details to create a new purchase order."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col flex-1 min-h-0"
          >
            <ValidationAlert errors={errors as any} />

            <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 space-y-4">
              {/* Order details */}
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div className="sm:col-span-4">
                  <Field>
                    <Label htmlFor="date">Date *</Label>
                    <DateInputField
                      control={control}
                      name="date"
                      rules={{ required: "Date is required" }}
                      required
                      showTodayButton
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={watch("currency")}
                      onValueChange={(v) => setValue("currency", v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CURRENCIES).map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field>
                    <Label htmlFor="supplierId">Supplier *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal h-9"
                      onClick={() => setSupplierPickerOpen(true)}
                    >
                      {watch("supplierId") ? (
                        suppliers.find((s: any) => s.id === watch("supplierId"))
                          ?.name || "Select supplier"
                      ) : (
                        <span className="text-muted-foreground">
                          Select supplier
                        </span>
                      )}
                    </Button>
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field>
                    <Label htmlFor="warehouseId">Warehouse *</Label>
                    <Select
                      value={watch("warehouseId")}
                      onValueChange={(v) => setValue("warehouseId", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w: any) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>

              {/* Lines */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-base font-semibold">
                    Line Items *
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddManualLine}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Manual entry
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setItemPickerOpen(true)}
                      disabled={!selectedSupplierId}
                      title={
                        !selectedSupplierId
                          ? "Select a supplier first"
                          : undefined
                      }
                    >
                      <Package className="h-4 w-4 mr-1" /> Select items
                    </Button>
                  </div>
                </div>

                {fields.map((field, index) => {
                  const line = (lines ?? [])[index] as any;
                  const item = line?.itemId ? itemsMap[line.itemId] : undefined;
                  const isManual = !line?.itemId;
                  const qty = Number(line?.quantity) || 0;
                  const cost = Number(line?.unitCost) || 0;
                  const lineSubtotal = qty * cost;
                  const lineVat =
                    lineSubtotal * ((Number(line?.taxRateSnapshot) || 0) / 100);
                  return (
                    <div
                      key={field.id}
                      className="border rounded-lg p-2.5 sm:p-3 bg-muted/20 flex items-center gap-3"
                    >
                      {item?.image ? (
                        <div className="size-9 sm:size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="size-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="size-9 sm:size-10 shrink-0 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                          <Package className="size-4 text-muted-foreground/40" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {item ? (
                            <span className="font-medium text-sm truncate">
                              {item.sku} — {item.name}
                            </span>
                          ) : (
                            <span className="font-medium text-sm truncate">
                              {line?.description || "Manual entry"}
                            </span>
                          )}
                          {isManual && (
                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                              Manual
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {qty} × {cost.toFixed(3)}
                          {Number(line?.taxRateSnapshot) > 0 && (
                            <span className="ml-1">
                              · VAT {Number(line?.taxRateSnapshot)}%
                            </span>
                          )}{" "}
                          ={" "}
                          <span className="font-medium text-foreground tabular-nums">
                            {(lineSubtotal + lineVat).toFixed(3)}
                          </span>{" "}
                          {watch("currency")}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => openLineEditor(index)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}

                {fields.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8 space-y-2">
                    <Package className="h-8 w-8 mx-auto opacity-30" />
                    <p>No lines yet.</p>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleAddManualLine}
                      >
                        Add manual entry
                      </Button>
                      {selectedSupplierId && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setItemPickerOpen(true)}
                        >
                          Browse product catalogue
                        </Button>
                      )}
                    </div>
                    {!selectedSupplierId && (
                      <p className="text-xs text-muted-foreground/60">
                        Select a supplier first to browse available items.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Totals */}
              {fields.length > 0 && (
                <div className="border-t pt-3">
                  <div className="flex justify-end">
                    <div className="w-full sm:w-64 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium tabular-nums">
                          {subtotal.toFixed(3)} {watch("currency")}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">VAT</span>
                        <span className="font-medium tabular-nums">
                          {vatTotal.toFixed(3)} {watch("currency")}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-bold border-t pt-1">
                        <span>Total</span>
                        <span className="tabular-nums">
                          {(subtotal + vatTotal).toFixed(3)} {watch("currency")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <Field>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  className="resize-none"
                  rows={2}
                  {...register("notes")}
                />
              </Field>
            </div>

            <DialogFooter className="shrink-0 px-4 py-3 border-t sm:px-6 sm:py-4 flex-col sm:flex-row gap-2 sm:gap-0 sm:mt-6">
              <span className="text-sm text-muted-foreground">
                {isPending ? "Saving..." : ""}
              </span>
              <div className="flex gap-2 sm:ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEdit ? "Save changes" : "Create PO"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <POItemSelectDialog
        open={itemPickerOpen}
        onOpenChange={setItemPickerOpen}
        items={items}
        isLoading={itemsLoading}
        existingItemIds={fields
          .map((f) => f.itemId)
          .filter((id): id is string => !!id)}
        onSelect={handleItemsSelected}
      />

      <POLineDialog
        open={!!editingLine}
        onOpenChange={(v) => !v && setEditingLine(null)}
        index={editingLine?.index ?? 0}
        initial={
          editingLine?.data ?? {
            mode: "manual",
            quantity: 1,
            unitCost: 0,
          }
        }
        items={items}
        itemsLoading={itemsLoading}
        existingItemIds={(lines ?? [])
          .map((l: any) => l.itemId)
          .filter(
            (id: any, i: number) =>
              id && (editingLine === null || i !== editingLine.index),
          )}
        onSave={handleLineSave}
      />

      <SupplierSelectDialog
        open={supplierPickerOpen}
        onOpenChange={setSupplierPickerOpen}
        suppliers={suppliers}
        isLoading={false}
        onSelect={(supplier) => {
          setValue("supplierId", supplier.id);
        }}
      />
    </>
  );
}

// Provider + Hook

interface OpenOptions {
  onSuccess?: (id: string) => void;
}

interface POFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    po: { id: string; version?: number } & Partial<POFormValues>,
    options?: OpenOptions,
  ) => void;
}

const POFormContext = React.createContext<POFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  po?: { id: string; version?: number } & Partial<POFormValues>;
  onSuccess?: (id: string) => void;
}

export function POFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, po: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (
      po: { id: string; version?: number } & Partial<POFormValues>,
      options?: OpenOptions,
    ) => {
      setState({ open: true, po, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <POFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <POFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        po={state.po}
        onSuccess={state.onSuccess}
      />
    </POFormContext.Provider>
  );
}

export function usePOForm(): POFormContextValue {
  const ctx = React.useContext(POFormContext);
  if (!ctx) throw new Error("usePOForm must be used inside <POFormProvider>");
  return ctx;
}

function defaults(
  po?: { id: string; version?: number } & Partial<POFormValues>,
  warehousesData?: any,
  orgCurrency?: string,
): POFormValues {
  const today = toDateInputValue(new Date());
  const list = warehousesData ?? [];
  const defaultWarehouse = list.find((w: any) => w.isDefault);
  return {
    supplierId: po?.supplierId ?? "",
    warehouseId: po?.warehouseId ?? defaultWarehouse?.id ?? "",
    date: po?.date ?? today,
    currency: (po?.currency ?? orgCurrency ?? "BHD") as any,
    notes: po?.notes ?? undefined,
    internalNotes: po?.internalNotes ?? undefined,
    lines: po?.lines ?? [],
  };
}
