'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Package, Plus, Trash2, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { type SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { SelectionDialog } from '@/components/select-dialog';
import { Header } from '@/app/app/App-Header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCurrency } from '@/hooks/use-currency';
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
  currency: z.enum(['BHD', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'SAR', 'KWD', 'QAR', 'OMR']).default('BHD'),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  lines: z.array(lineSchema).min(1, 'At least one line is required'),
});

type FormValues = z.infer<typeof schema>;

function defaults(currency: string): FormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    supplierId: '',
    warehouseId: '',
    date: today,
    expectedDate: undefined,
    currency: currency as FormValues['currency'],
    notes: undefined,
    internalNotes: undefined,
    lines: [],
  };
}

type FieldErrors = Record<string, { message?: string } | undefined>;

function ValidationAlert({ errors }: { errors: FieldErrors }) {
  const messages = Object.values(errors).filter((e) => e?.message).map((e) => e!.message!);
  if (messages.length === 0) return null;
  return (
    <Alert variant="destructive">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>{messages.length} field{messages.length > 1 ? 's' : ''} need attention</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc pl-4 space-y-0.5 text-sm">
          {messages.map((msg) => <li key={msg}>{msg}</li>)}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [itemPickerOpen, setItemPickerOpen] = React.useState(false);

  const { data: suppliersData, isLoading: suppliersLoading } = trpc.suppliers.list.useQuery({ limit: 200 });
  const { data: warehousesData, isLoading: warehousesLoading } = trpc.warehouses.list.useQuery({ limit: 200 });
  const { currency } = useCurrency();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(currency),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const selectedSupplierId = watch('supplierId');
  const lines = watch('lines');

  const { data: itemsData, isLoading: itemsLoading } = trpc.items.list.useQuery(
    { type: 'PRODUCT', supplierId: selectedSupplierId || undefined, withStock: true },
    { enabled: !!selectedSupplierId },
  );

  const subtotal = React.useMemo(
    () => (lines ?? []).reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0),
    [lines],
  );

  React.useEffect(() => {
    if (!watch('warehouseId') && warehousesData) {
      const list = Array.isArray(warehousesData) ? warehousesData : (warehousesData?.data ?? []);
      const def = list.find((w: any) => w.isDefault);
      if (def) setValue('warehouseId', def.id);
    }
  }, [warehousesData, watch, setValue]);

  const createMutation = trpc.purchaseOrders.create.useMutation({
    onSuccess(data) {
      utils.purchaseOrders.list.invalidate();
      toast.success('Purchase order created', { description: data.serial });
      router.push('/app/purchase-orders');
    },
    onError(err) {
      toast.error('Failed to create PO', { description: err.message });
    },
  });

  const isPending = isSubmitting || createMutation.isPending;
  const hasErrors = Object.keys(errors).length > 0;

  const onSubmit: SubmitHandler<FormValues> = (values) => {
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
    createMutation.mutate(payload);
  };

  const suppliers = Array.isArray(suppliersData) ? suppliersData : (suppliersData?.data ?? []);
  const warehouses = Array.isArray(warehousesData) ? warehousesData : (warehousesData?.data ?? []);
  const items = Array.isArray(itemsData) ? itemsData : (itemsData?.data ?? []);

  const itemsMap = React.useMemo(
    () => Object.fromEntries(items.map((i: any) => [i.id, i])),
    [items],
  );

  const handleItemsSelected = (selected: any[]) => {
    for (const item of selected) {
      const supplierItem = item.supplierItems?.[0];
      append({
        itemId: item.id,
        quantity: Number(supplierItem?.minOrderQty) || 1,
        unitCost: Number(supplierItem?.basePrice ?? item.purchasePrice) || 0,
      });
    }
    setItemPickerOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/20">
      <Header
        leftContent={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
              <ArrowLeft className="size-5" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Link href="/app/purchase-orders" className="hover:text-foreground transition-colors">Purchase Orders</Link>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-foreground font-medium">New</span>
            </nav>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl p-4 md:p-8 space-y-6">
          {hasErrors && <ValidationAlert errors={errors as any} />}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Supplier & Warehouse
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label htmlFor="supplierId">
                        Supplier <span className="text-destructive">*</span>
                      </Label>
                      <Select value={watch('supplierId')} onValueChange={(v) => setValue('supplierId', v)} disabled={suppliersLoading}>
                        <SelectTrigger>
                          <SelectValue placeholder={suppliersLoading ? 'Loading...' : 'Select supplier'} />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <Label htmlFor="warehouseId">
                        Warehouse <span className="text-destructive">*</span>
                      </Label>
                      <Select value={watch('warehouseId')} onValueChange={(v) => setValue('warehouseId', v)} disabled={warehousesLoading}>
                        <SelectTrigger>
                          <SelectValue placeholder={warehousesLoading ? 'Loading...' : 'Select warehouse'} />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((w: any) => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Dates & Currency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field>
                      <Label htmlFor="date">
                        Order Date <span className="text-destructive">*</span>
                      </Label>
                      <Input id="date" type="date" {...register('date')} />
                    </Field>
                    <Field>
                      <Label htmlFor="expectedDate">Expected Delivery</Label>
                      <Input id="expectedDate" type="date" {...register('expectedDate')} />
                    </Field>
                    <Field>
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={watch('currency')} onValueChange={(v) => setValue('currency', v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['BHD', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'KWD', 'QAR', 'OMR'].map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Line Items
                    {fields.length > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs">{fields.length} item{fields.length > 1 ? 's' : ''}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setItemPickerOpen(true)}
                      disabled={!selectedSupplierId}
                      title={!selectedSupplierId ? 'Select a supplier first' : undefined}
                    >
                      <Package className="h-4 w-4 mr-1.5" /> Browse Products
                    </Button>
                  </div>

                  {fields.map((field, index) => {
                    const item = itemsMap[field.itemId] as any;
                    return (
                      <div key={field.id} className="border rounded-lg p-4 bg-muted/20 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-5">
                              <Label className="text-xs text-muted-foreground">Item</Label>
                              <div className="h-9 flex items-center text-sm truncate">
                                {item ? (
                                  <span className="font-medium">{item.sku} — {item.name}</span>
                                ) : (
                                  <span className="text-muted-foreground italic">Select item through browse</span>
                                )}
                              </div>
                            </div>
                            <div className="sm:col-span-2">
                              <Label className="text-xs text-muted-foreground">Qty</Label>
                              <Input type="number" min={0.001} step="any" {...register(`lines.${index}.quantity` as const)} />
                            </div>
                            <div className="sm:col-span-2">
                              <Label className="text-xs text-muted-foreground">Unit Cost</Label>
                              <Input type="number" min={0} step="0.001" {...register(`lines.${index}.unitCost` as const)} />
                            </div>
                            <div className="sm:col-span-2">
                              <Label className="text-xs text-muted-foreground">Total</Label>
                              <div className="h-9 flex items-center text-sm font-semibold">
                                {((Number(watch(`lines.${index}.quantity`)) || 0) * (Number(watch(`lines.${index}.unitCost`)) || 0)).toFixed(3)}
                              </div>
                            </div>
                            <div className="sm:col-span-1 flex items-end justify-end pb-1">
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="size-9">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {fields.length === 0 && (
                    <div className="text-center py-10 space-y-3 border-2 border-dashed rounded-lg">
                      <Package className="h-10 w-10 mx-auto text-muted-foreground/40" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">No items yet</p>
                        {!selectedSupplierId ? (
                          <p className="text-xs text-muted-foreground/60 mt-1">Select a supplier first to browse available products</p>
                        ) : (
                          <p className="text-xs text-muted-foreground/60 mt-1">Click &quot;Browse Products&quot; to add items to this order</p>
                        )}
                      </div>
                      {selectedSupplierId && (
                        <Button type="button" variant="secondary" size="sm" onClick={() => setItemPickerOpen(true)}>
                          <Package className="h-4 w-4 mr-1.5" /> Browse Products
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {fields.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-end">
                      <div className="text-right space-y-1.5 min-w-48">
                        <div className="flex justify-between gap-8 text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">{subtotal.toFixed(3)} {watch('currency')}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between gap-8 text-base font-bold">
                          <span>Total</span>
                          <span>{subtotal.toFixed(3)} {watch('currency')}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Field>
                    <Label htmlFor="notes">Supplier Notes</Label>
                    <Textarea id="notes" className="resize-none" rows={2} {...register('notes')} />
                    <p className="text-xs text-muted-foreground mt-1">Printed on the PO sent to the supplier</p>
                  </Field>
                </CardContent>
              </Card>
            </div>

            <div className="sticky bottom-0 mt-6 -mx-4 md:-mx-8 p-4 md:p-6 bg-background/95 backdrop-blur-md border-t flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || fields.length === 0} className="min-w-32">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create PO
              </Button>
            </div>
          </form>
        </div>
      </div>

      <SelectionDialog
        open={itemPickerOpen}
        onOpenChange={setItemPickerOpen}
        title="Select items to purchase"
        description="Choose the items you want to add to this purchase order."
        data={items}
        isLoading={!!selectedSupplierId && itemsLoading}
        mode="multi"
        getItemId={(i: any) => i.id}
        onSelect={handleItemsSelected}
        searchFields={['sku', 'name', 'barcode']}
        emptyIcon={<Package className="size-8 text-muted-foreground/50" />}
        emptyTitle={!selectedSupplierId ? 'No supplier selected' : 'No items found for this supplier'}
        emptyDescription={!selectedSupplierId ? 'Please select a supplier first, then browse items.' : 'Try adjusting your search or check supplier catalogue.'}
        cardRenderer={(item: any, selected: boolean) => {
          const si = item.supplierItems?.[0];
          const stockTotal = item.totalStock;
          return (
            <div className="flex items-center gap-3 p-3">
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Package className="size-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{item.name}</p>
                  <Badge variant="outline" className="text-[10px] leading-none">{item.sku}</Badge>
                  {si?.supplierSku && si.supplierSku !== item.sku && (
                    <Badge variant="secondary" className="text-[10px] leading-none">{si.supplierSku}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>Unit: {item.unit}</span>
                  <span>·</span>
                  <span>Price: {Number(si?.basePrice ?? item.purchasePrice).toFixed(3)}</span>
                  {stockTotal !== undefined && (
                    <>
                      <span>·</span>
                      <span className={stockTotal <= (item.reorderPoint ?? 0) ? 'text-destructive font-medium' : undefined}>
                        Stock: {stockTotal}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {selected && (
                <Badge className="shrink-0 bg-primary text-primary-foreground text-xs">Selected</Badge>
              )}
            </div>
          );
        }}
        itemName="products"
        confirmLabel="Add to PO"
      />
    </div>
  );
}
