'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Package, Plus, Trash2, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { type SubmitHandler, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { calculateInvoiceTotals } from '@/lib/calculator';
import { SelectionDialog } from '@/components/select-dialog';
import { Header } from '@/app/app/App-Header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useCurrency } from '@/hooks/use-currency';
import { trpc } from '@/lib/trpc/client';

const invoiceLineSchema = z.object({
  id: z.string().optional(),
  itemId: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().positive('Qty must be > 0'),
  unitPrice: z.coerce.number().min(0, 'Price must be >= 0'),
  discountAmt: z.coerce.number().min(0).default(0),
  purchasePrice: z.coerce.number().min(0).optional(),
  taxRateId: z.string().optional(),
  taxRateSnapshot: z.coerce.number().optional(),
  taxRateName: z.string().optional(),
  sortOrder: z.number().int().default(0),
  departmentId: z.string().optional(),
});

const schema = z.object({
  type: z.enum(['QUOTE', 'INVOICE', 'CREDIT_NOTE', 'PROFORMA', 'DELIVERY_NOTE']).default('INVOICE'),
  date: z.string().min(1, 'Date is required'),
  dueDate: z.string().optional(),
  customerId: z.string().optional(),
  warehouseId: z.string().optional(),
  departmentId: z.string().optional(),
  currency: z.enum(['BHD', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'SAR', 'KWD', 'QAR', 'OMR']).default('BHD'),
  exchangeRate: z.coerce.number().positive().default(1),
  description: z.string().optional(),
  notes: z.string().optional(),
  termsText: z.string().optional(),
  internalNotes: z.string().optional(),
  isWalkIn: z.boolean().default(false),
  parentInvoiceId: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1, 'At least one line is required'),
});

type FormValues = z.infer<typeof schema>;

function defaults(currency: string, org?: { defaultTermsText?: string | null }): FormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    type: 'INVOICE',
    date: today,
    dueDate: undefined,
    customerId: '',
    warehouseId: '',
    departmentId: undefined,
    currency: currency as FormValues['currency'],
    exchangeRate: 1,
    description: undefined,
    notes: undefined,
    termsText: org?.defaultTermsText ?? undefined,
    internalNotes: undefined,
    isWalkIn: false,
    parentInvoiceId: undefined,
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

export default function NewInvoicePage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [itemPickerOpen, setItemPickerOpen] = React.useState(false);

  const { data: customersData, isLoading: customersLoading } = trpc.customers.list.useQuery({ limit: 200 });
  const { data: warehousesData, isLoading: warehousesLoading } = trpc.warehouses.list.useQuery({ limit: 200 });
  const { data: itemsData } = trpc.items.list.useQuery({ isSaleable: true });
  const { data: taxRatesData, isLoading: taxLoading } = trpc.settings.taxRates.list.useQuery();
  const { data: orgData } = trpc.settings.getOrg.useQuery();
  const { currency: orgCurrency } = useCurrency();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(orgCurrency, orgData ?? undefined),
  });

  const orgLoaded = React.useRef(false);
  React.useEffect(() => {
    if (orgData && !orgLoaded.current) {
      orgLoaded.current = true;
      if (!watch('termsText')) {
        setValue('termsText', (orgData as any)?.defaultTermsText ?? '');
      }
    }
  }, [orgData, watch, setValue]);

  const currency = watch('currency');

  const isInvoiceType = invoiceType === 'INVOICE';
  const needsCustomer = !['DELIVERY_NOTE'].includes(invoiceType);
  const needsWarehouse = isInvoiceType;

  const totals = React.useMemo(() => {
    if (!lines || lines.length === 0) {
      return { subtotal: 0, discountTotal: 0, taxTotal: 0, total: 0, costTotal: 0 };
    }
    return calculateInvoiceTotals(
      lines.map((l) => ({
        quantity: Number(l.quantity) || 0,
        unitPrice: Number(l.unitPrice) || 0,
        discountAmt: Number(l.discountAmt) || 0,
        taxRateSnapshot: Number(l.taxRateSnapshot) || 0,
        purchasePrice: Number(l.purchasePrice) || 0,
      })),
    );
  }, [lines]);

  React.useEffect(() => {
    if (!watch('warehouseId') && warehousesData) {
      const list = Array.isArray(warehousesData) ? warehousesData : (warehousesData?.data ?? []);
      const def = list.find((w: any) => w.isDefault);
      if (def) setValue('warehouseId', def.id);
    }
  }, [warehousesData, watch, setValue]);

  const createMutation = trpc.invoices.create.useMutation({
    onSuccess(data) {
      utils.invoices.list.invalidate();
      toast.success('Invoice created', { description: data.serial });
      router.push('/app/invoices');
    },
    onError(err) {
      toast.error('Failed to create invoice', { description: err.message });
    },
  });

  const isPending = isSubmitting || createMutation.isPending;
  const hasErrors = Object.keys(errors).length > 0;

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const payload = {
      type: values.type,
      date: new Date(values.date),
      dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
      customerId: values.isWalkIn ? undefined : values.customerId || undefined,
      warehouseId: values.warehouseId || undefined,
      departmentId: values.departmentId || undefined,
      currency: values.currency,
      exchangeRate: Number(values.exchangeRate) || 1,
      description: values.description || undefined,
      notes: values.notes || undefined,
      termsText: values.termsText || undefined,
      internalNotes: values.internalNotes || undefined,
      isWalkIn: values.isWalkIn,
      parentInvoiceId: values.parentInvoiceId || undefined,
      lines: values.lines
        .filter((l) => l.itemId)
        .map((l, idx) => ({
          id: l.id || undefined,
          itemId: l.itemId,
          description: l.description || undefined,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discountAmt: Number(l.discountAmt) || 0,
          purchasePrice: Number(l.purchasePrice) || undefined,
          taxRateId: l.taxRateId || undefined,
          taxRateSnapshot: l.taxRateSnapshot ? Number(l.taxRateSnapshot) : undefined,
          taxRateName: l.taxRateName || undefined,
          sortOrder: idx,
          departmentId: l.departmentId || undefined,
        })),
    };
    createMutation.mutate(payload);
  };

  const customers = Array.isArray(customersData) ? customersData : (customersData?.data ?? []);
  const warehouses = Array.isArray(warehousesData) ? warehousesData : (warehousesData?.data ?? []);
  const items = Array.isArray(itemsData) ? itemsData : (itemsData?.data ?? []);
  const taxRates = Array.isArray(taxRatesData) ? taxRatesData : [];

  const itemsMap = React.useMemo(() => Object.fromEntries(items.map((i: any) => [i.id, i])), [items]);
  const taxRatesMap = React.useMemo(() => Object.fromEntries(taxRates.map((tr: any) => [tr.id, tr])), [taxRates]);

  const handleItemsSelected = (selected: any[]) => {
    for (const item of selected) {
      const taxRateId = item.taxRate?.id;
      const taxRate = taxRatesMap[taxRateId];
      append({
        itemId: item.id,
        description: item.description || undefined,
        quantity: 1,
        unitPrice: Number(item.salesPrice) || 0,
        discountAmt: 0,
        purchasePrice: Number(item.purchasePrice) || 0,
        taxRateId: taxRateId,
        taxRateSnapshot: taxRate ? Number(taxRate.rate) : undefined,
        taxRateName: taxRate?.name || undefined,
        sortOrder: 0,
      });
    }
    setItemPickerOpen(false);
  };

  const invoiceTypeOptions = [
    { value: 'INVOICE', label: 'Invoice' },
    { value: 'QUOTE', label: 'Quote' },
    { value: 'CREDIT_NOTE', label: 'Credit Note' },
    { value: 'PROFORMA', label: 'Proforma' },
    { value: 'DELIVERY_NOTE', label: 'Delivery Note' },
  ];

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
              <Link href="/app/invoices" className="hover:text-foreground transition-colors">Invoices</Link>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-foreground font-medium">New</span>
            </nav>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl p-4 md:p-8 space-y-6">
          {hasErrors && <ValidationAlert errors={errors as any} />}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Document Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field>
                      <Label htmlFor="type">
                        Type <span className="text-destructive">*</span>
                      </Label>
                      <Select value={watch('type')} onValueChange={(v) => setValue('type', v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {invoiceTypeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <Field>
                      <Label htmlFor="exchangeRate">Exchange Rate</Label>
                      <Input id="exchangeRate" type="number" min={0.001} step="any" {...register('exchangeRate')} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label htmlFor="date">
                        Date <span className="text-destructive">*</span>
                      </Label>
                      <Input id="date" type="date" {...register('date')} />
                    </Field>
                    <Field>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input id="dueDate" type="date" {...register('dueDate')} />
                    </Field>
                  </div>
                </CardContent>
              </Card>

              {needsCustomer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      Customer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <Field>
                          <Label htmlFor="customerId">
                            {isWalkIn ? 'Customer Name' : 'Customer'} <span className="text-destructive">*</span>
                          </Label>
                          {isWalkIn ? (
                            <Input id="customerId" placeholder="Walk-in customer name" {...register('customerId')} />
                          ) : (
                            <Select value={watch('customerId') || ''} onValueChange={(v) => setValue('customerId', v)} disabled={customersLoading}>
                              <SelectTrigger>
                                <SelectValue placeholder={customersLoading ? 'Loading...' : 'Select customer'} />
                              </SelectTrigger>
                              <SelectContent>
                                {customers.map((c: any) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </Field>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Checkbox
                          id="isWalkIn"
                          checked={isWalkIn}
                          onCheckedChange={(checked) => {
                            setValue('isWalkIn', checked === true);
                            if (checked) setValue('customerId', '');
                          }}
                        />
                        <Label htmlFor="isWalkIn" className="text-sm font-normal cursor-pointer whitespace-nowrap">Walk-in</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {needsWarehouse && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      Warehouse
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Field>
                      <Label htmlFor="warehouseId">Warehouse</Label>
                      <Select value={watch('warehouseId') || ''} onValueChange={(v) => setValue('warehouseId', v)} disabled={warehousesLoading}>
                        <SelectTrigger>
                          <SelectValue placeholder={warehousesLoading ? 'Loading...' : 'Select warehouse'} />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((w: any) => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Stock will be deducted from this location</p>
                    </Field>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Description & Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field>
                    <Label htmlFor="description">Description / Subject</Label>
                    <Input id="description" placeholder="Invoice description" {...register('description')} />
                  </Field>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label htmlFor="notes">Notes (printed on document)</Label>
                      <Textarea id="notes" className="resize-none" rows={2} {...register('notes')} />
                    </Field>
                    <Field>
                      <Label htmlFor="internalNotes">Internal Notes</Label>
                      <Textarea id="internalNotes" className="resize-none" rows={2} {...register('internalNotes')} />
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
                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => { append({ itemId: '', quantity: 1, unitPrice: 0, discountAmt: 0, sortOrder: 0 }); }}>
                      <Plus className="h-4 w-4 mr-1" /> Add Line
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setItemPickerOpen(true)}>
                      <Package className="h-4 w-4 mr-1" /> Browse Items
                    </Button>
                  </div>

                  {fields.map((field, index) => {
                    const item = itemsMap[field.itemId || ''] as any;
                    const lineWatch = watch(`lines.${index}`);
                    const lineTaxRateId = watch(`lines.${index}.taxRateId`);
                    const taxRate = taxRatesMap[lineTaxRateId || ''] as any;
                    const qty = Number(lineWatch?.quantity) || 0;
                    const price = Number(lineWatch?.unitPrice) || 0;
                    const discount = Number(lineWatch?.discountAmt) || 0;
                    const lineTotal = qty * price - discount;
                    const lineTax = taxRate ? lineTotal * (Number(taxRate.rate) / 100) : 0;

                    return (
                      <div key={field.id} className="border rounded-lg p-4 bg-muted/20 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-4">
                              <Label className="text-xs text-muted-foreground">Item</Label>
                              <Select
                                value={field.itemId || ''}
                                onValueChange={(v) => {
                                  const selected = itemsMap[v] as any;
                                  const tr = taxRatesMap[selected?.taxRate?.id] as any;
                                  setValue(`lines.${index}.itemId`, v);
                                  if (selected) {
                                    setValue(`lines.${index}.unitPrice`, Number(selected.salesPrice) || 0);
                                    setValue(`lines.${index}.purchasePrice`, Number(selected.purchasePrice) || 0);
                                    setValue(`lines.${index}.taxRateId`, selected.taxRate?.id);
                                    setValue(`lines.${index}.taxRateSnapshot`, tr ? Number(tr.rate) : undefined);
                                    setValue(`lines.${index}.taxRateName`, tr?.name || undefined);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select item" />
                                </SelectTrigger>
                                <SelectContent>
                                  {items.map((i: any) => (
                                    <SelectItem key={i.id} value={i.id}>{i.sku} — {i.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="sm:col-span-2">
                              <Label className="text-xs text-muted-foreground">Qty</Label>
                              <Input type="number" min={0.001} step="any" {...register(`lines.${index}.quantity` as const)} />
                            </div>

                            <div className="sm:col-span-2">
                              <Label className="text-xs text-muted-foreground">Unit Price</Label>
                              <Input type="number" min={0} step="0.001" {...register(`lines.${index}.unitPrice` as const)} />
                            </div>

                            <div className="sm:col-span-2">
                              <Label className="text-xs text-muted-foreground">Discount</Label>
                              <Input type="number" min={0} step="0.001" {...register(`lines.${index}.discountAmt` as const)} />
                            </div>

                            <div className="sm:col-span-1">
                              <Label className="text-xs text-muted-foreground">Net</Label>
                              <div className="h-9 flex items-center text-sm font-semibold">{(lineTotal + lineTax).toFixed(3)}</div>
                            </div>

                            <div className="sm:col-span-1 flex items-end justify-end pb-1">
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="size-9">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-full max-w-56">
                            <Select
                              value={lineTaxRateId || 'none'}
                              onValueChange={(v) => {
                                const tr = v === 'none' ? undefined : (taxRatesMap[v] as any);
                                setValue(`lines.${index}.taxRateId`, v === 'none' ? undefined : v);
                                setValue(`lines.${index}.taxRateSnapshot`, tr ? Number(tr.rate) : undefined);
                                setValue(`lines.${index}.taxRateName`, tr?.name || undefined);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Tax rate" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No tax</SelectItem>
                                {taxRates.map((tr: any) => (
                                  <SelectItem key={tr.id} value={tr.id}>{tr.name} ({Number(tr.rate)}%)</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {taxRate && (
                            <span className="text-xs text-muted-foreground">Tax: {lineTax.toFixed(3)} {currency}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {fields.length === 0 && (
                    <div className="text-center py-10 space-y-3 border-2 border-dashed rounded-lg">
                      <Package className="h-10 w-10 mx-auto text-muted-foreground/40" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">No items yet</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Add line items to this document</p>
                      </div>
                      <div className="flex gap-2 justify-center">
                        <Button type="button" variant="secondary" size="sm" onClick={() => { append({ itemId: '', quantity: 1, unitPrice: 0, discountAmt: 0, sortOrder: 0 }); }}>
                          <Plus className="h-4 w-4 mr-1" /> Add Line
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => setItemPickerOpen(true)}>
                          <Package className="h-4 w-4 mr-1" /> Browse Items
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {fields.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" />
                      Document Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-end">
                      <div className="text-right space-y-1.5 min-w-56">
                        <div className="flex justify-between gap-8 text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">{totals.subtotal.toFixed(3)} {currency}</span>
                        </div>
                        <div className="flex justify-between gap-8 text-sm">
                          <span className="text-muted-foreground">Discount</span>
                          <span className="font-medium text-destructive">-{totals.discountTotal.toFixed(3)} {currency}</span>
                        </div>
                        <div className="flex justify-between gap-8 text-sm">
                          <span className="text-muted-foreground">Tax</span>
                          <span className="font-medium">+{totals.taxTotal.toFixed(3)} {currency}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between gap-8 text-base font-bold">
                          <span>Total</span>
                          <span>{totals.total.toFixed(3)} {currency}</span>
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
                    Terms & Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Field>
                    <Label htmlFor="termsText">Terms & Conditions</Label>
                    <Textarea id="termsText" className="resize-none" rows={2} {...register('termsText')} />
                    <p className="text-xs text-muted-foreground mt-1">Printed at the bottom of the document</p>
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
                Create {invoiceTypeOptions.find((o) => o.value === invoiceType)?.label ?? 'Invoice'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <SelectionDialog
        open={itemPickerOpen}
        onOpenChange={setItemPickerOpen}
        title="Select items"
        description="Choose items to add to this document."
        data={items.filter((i: any) => i.isSaleable)}
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
                <Badge variant="outline" className="text-[10px]">{item.sku}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Unit: {item.unit} · Price: {Number(item.salesPrice).toFixed(3)}</p>
            </div>
            {selected && <Badge className="shrink-0 bg-primary text-primary-foreground text-xs">Selected</Badge>}
          </div>
        )}
        itemName="items"
        confirmLabel="Add to invoice"
      />
    </div>
  );
}
