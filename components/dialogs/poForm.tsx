'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Package, Plus, Trash2, TriangleAlert } from 'lucide-react';
import * as React from 'react';
import { type SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { SelectionDialog } from '@/components/select-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc/client';

const lineSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  description: z.string().optional(),
  quantity: z.coerce.number().positive('Qty must be > 0'),
  unitCost: z.coerce.number().min(0, 'Unit cost must be >= 0'),
});

const schema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  date: z.string().min(1, 'Date is required'),
  expectedDate: z.string().optional(),
  currency: z
    .enum(['BHD', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'SAR', 'KWD', 'QAR', 'OMR'])
    .default('BHD'),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'At least one line is required'),
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

export function POFormDialog({ open, onOpenChange, po, onSuccess }: POFormDialogProps) {
  const isEdit = Boolean(po?.id);
  const utils = trpc.useUtils();
  const [itemPickerOpen, setItemPickerOpen] = React.useState(false);

  const { data: suppliersData } = trpc.suppliers.list.useQuery({ limit: 200 });
  const { data: warehousesData } = trpc.warehouses.list.useQuery({ limit: 200 });
  const { data: itemsData } = trpc.items.list.useQuery({ type: 'PRODUCT' });

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
    defaultValues: defaults(po, warehousesData),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const lines = watch('lines');

  const subtotal = React.useMemo(
    () =>
      (lines ?? []).reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0),
    [lines],
  );

  // Auto-select default warehouse when data loads
  React.useEffect(() => {
    if (!watch('warehouseId') && warehousesData) {
      const list = Array.isArray(warehousesData) ? warehousesData : (warehousesData?.data ?? []);
      const def = list.find((w: any) => w.isDefault);
      if (def) setValue('warehouseId', def.id);
    }
  }, [warehousesData, watch, setValue]);

  React.useEffect(() => {
    if (open) reset(defaults(po, warehousesData));
  }, [open, po, warehousesData, reset]);

  const createMutation = trpc.purchaseOrders.create.useMutation({
    onSuccess(data) {
      utils.purchaseOrders.list.invalidate();
      toast.success('Purchase order created', { description: data.serial });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error('Failed to create PO', { description: err.message });
    },
  });

  const updateMutation = trpc.purchaseOrders.update.useMutation({
    onSuccess(data) {
      utils.purchaseOrders.list.invalidate();
      toast.success('Purchase order updated', { description: data.serial });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error('Failed to update PO', { description: err.message });
    },
  });

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const onSubmit: SubmitHandler<POFormValues> = (values) => {
    const payload = {
      ...values,
      notes: values.notes || undefined,
      internalNotes: values.internalNotes || undefined,
      date: new Date(values.date),
      expectedDate: values.expectedDate ? new Date(values.expectedDate) : undefined,
      lines: values.lines
        .filter((l) => l.itemId)
        .map((l) => ({
          itemId: l.itemId,
          description: l.description || undefined,
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost),
        })),
    };

    if (isEdit && po?.id) {
      updateMutation.mutate({ id: po.id, version: po.version ?? 0, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const suppliers = Array.isArray(suppliersData) ? suppliersData : (suppliersData?.data ?? []);
  const warehouses = Array.isArray(warehousesData) ? warehousesData : (warehousesData?.data ?? []);
  const items = Array.isArray(itemsData) ? itemsData : (itemsData?.data ?? []);

  const itemsMap = React.useMemo(
    () => Object.fromEntries(items.map((i: any) => [i.id, i])),
    [items],
  );

  const pickerItems = React.useMemo(() => items.filter((i: any) => i.type === 'PRODUCT'), [items]);

  const handleItemsSelected = (selected: any[]) => {
    for (const item of selected) {
      append({
        itemId: item.id,
        quantity: 1,
        unitCost: Number(item.purchasePrice) || 0,
      });
    }
    setItemPickerOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
        <DialogContent className="sm:max-w-180">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit purchase order' : 'New purchase order'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update the details below and save.'
                : 'Fill in the details to create a new purchase order.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <ValidationAlert errors={errors as any} />

            <div className="space-y-4 max-h-100 overflow-y-auto pr-2">
              {/* Supplier + Warehouse */}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <Label htmlFor="supplierId">Supplier *</Label>
                  <Select
                    value={watch('supplierId')}
                    onValueChange={(v) => setValue('supplierId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <Label htmlFor="warehouseId">Warehouse *</Label>
                  <Select
                    value={watch('warehouseId')}
                    onValueChange={(v) => setValue('warehouseId', v)}
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

              {/* Dates + Currency */}
              <div className="grid grid-cols-3 gap-3">
                <Field>
                  <Label htmlFor="date">Date *</Label>
                  <Input id="date" type="date" {...register('date')} />
                </Field>
                <Field>
                  <Label htmlFor="expectedDate">Expected date</Label>
                  <Input id="expectedDate" type="date" {...register('expectedDate')} />
                </Field>
                <Field>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={watch('currency')}
                    onValueChange={(v) => setValue('currency', v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['BHD', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'KWD', 'QAR', 'OMR'].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Notes */}
              <Field>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" className="resize-none" rows={2} {...register('notes')} />
              </Field>

              {/* Lines */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Line Items *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setItemPickerOpen(true)}
                  >
                    <Package className="h-4 w-4 mr-1" /> Select items
                  </Button>
                </div>

                {fields.map((field, index) => {
                  const item = itemsMap[field.itemId] as any;
                  return (
                    <div
                      key={field.id}
                      className="flex items-start gap-2 border rounded-lg p-3 bg-muted/20"
                    >
                      <div className="flex-1 grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                          <Label className="text-xs">Item</Label>
                          <div className="h-9 flex items-center text-sm truncate">
                            {item ? (
                              <span className="font-medium">
                                {item.sku} — {item.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">Select item</span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Qty</Label>
                          <Input
                            type="number"
                            min={0.001}
                            step="any"
                            {...register(`lines.${index}.quantity` as const)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Unit cost</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.001"
                            {...register(`lines.${index}.unitCost` as const)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Total</Label>
                          <div className="h-9 flex items-center text-sm font-medium text-muted-foreground">
                            {(
                              (Number(watch(`lines.${index}.quantity`)) || 0) *
                              (Number(watch(`lines.${index}.unitCost`)) || 0)
                            ).toFixed(3)}
                          </div>
                        </div>
                        <div className="col-span-1 flex items-end pb-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {fields.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8 space-y-2">
                    <Package className="h-8 w-8 mx-auto opacity-30" />
                    <p>No items yet.</p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setItemPickerOpen(true)}
                    >
                      Browse product catalogue
                    </Button>
                  </div>
                )}
              </div>

              {/* Totals */}
              {fields.length > 0 && (
                <div className="flex justify-end border-t pt-3">
                  <div className="text-right space-y-1">
                    <div className="flex justify-between gap-8 text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">
                        {subtotal.toFixed(3)} {watch('currency')}
                      </span>
                    </div>
                    <div className="flex justify-between gap-8 text-base font-bold">
                      <span>Total</span>
                      <span>
                        {subtotal.toFixed(3)} {watch('currency')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Save changes' : 'Create PO'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Item selection dialog */}
      <SelectionDialog
        open={itemPickerOpen}
        onOpenChange={setItemPickerOpen}
        title="Select items to purchase"
        description="Choose the items you want to add to this purchase order."
        data={pickerItems}
        mode="multi"
        getItemId={(i: any) => i.id}
        onSelect={handleItemsSelected}
        searchFields={['sku', 'name', 'barcode']}
        cardRenderer={(item: any, selected: boolean) => (
          <div className="flex items-center gap-3 p-3">
            <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Package className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                <Badge variant="outline" className="text-[10px]">
                  {item.sku}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Unit: {item.unit} · Purchase price: {Number(item.purchasePrice).toFixed(3)}
              </p>
            </div>
            {selected && (
              <Badge className="shrink-0 bg-primary text-primary-foreground text-xs">
                Selected
              </Badge>
            )}
          </div>
        )}
        itemName="products"
        confirmLabel="Add to PO"
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
    (po: { id: string; version?: number } & Partial<POFormValues>, options?: OpenOptions) => {
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
  if (!ctx) throw new Error('usePOForm must be used inside <POFormProvider>');
  return ctx;
}

function defaults(
  po?: { id: string; version?: number } & Partial<POFormValues>,
  warehousesData?: any,
): POFormValues {
  const today = new Date().toISOString().slice(0, 10);
  const list = Array.isArray(warehousesData)
    ? warehousesData
    : ((warehousesData as any)?.data ?? []);
  const defaultWarehouse = list.find((w: any) => w.isDefault);
  return {
    supplierId: po?.supplierId ?? '',
    warehouseId: po?.warehouseId ?? defaultWarehouse?.id ?? '',
    date: po?.date ?? today,
    expectedDate: po?.expectedDate ?? undefined,
    currency: po?.currency ?? 'BHD',
    notes: po?.notes ?? undefined,
    internalNotes: po?.internalNotes ?? undefined,
    lines: po?.lines ?? [],
  };
}
