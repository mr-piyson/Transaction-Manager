'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calculator,
  Loader2,
  Package,
  Plus,
  Trash2,
  TriangleAlert,
  User,
  Pencil,
} from 'lucide-react';
import * as React from 'react';
import { type SubmitHandler, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { z } from 'zod';
import { calculateInvoiceTotals } from '@/lib/calculator';
import { RichtextEditor } from '@/components/richtext-editor';
import { CURRENCIES } from '@/lib/utils';
import { currencyCodeSchema } from '@/lib/validations';
import { SelectionDialog } from '@/components/select-dialog';
import { InvoiceLineDialog, type InvoiceLineData } from '@/components/dialogs/invoiceLineDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { DatePickerField } from '@/components/ui/date-picker';
import { toDateInputValue } from '@/lib/date';
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
  currency: currencyCodeSchema.default('BHD'),
  exchangeRate: z.coerce.number().positive().default(1),
  description: z.string().optional(),
  notes: z.string().optional(),
  termsText: z.string().optional(),
  internalNotes: z.string().optional(),
  isWalkIn: z.boolean().default(false),
  parentInvoiceId: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1, 'At least one line is required'),
});

export type InvoiceFormValues = z.infer<typeof schema>;

interface ValidationAlertProps {
  errors: Record<string, { message?: string } | undefined>;
}

function ValidationAlert({ errors }: ValidationAlertProps) {
  const t = useTranslations();
  const messages = Object.values(errors)
    .filter((e) => e?.message)
    .map((e) => e!.message!);
  if (messages.length === 0) return null;
  return (
    <Alert variant="destructive" className="mb-4">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>{t('invoices.fixFollowing')}</AlertTitle>
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

export interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: { id: string; version?: number } & Partial<InvoiceFormValues>;
  onSuccess?: (invoiceId: string) => void;
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: InvoiceFormDialogProps) {
  const t = useTranslations();
  const isEdit = Boolean(invoice?.id);
  const utils = trpc.useUtils();
  const [itemPickerOpen, setItemPickerOpen] = React.useState(false);
  const [editingLineIndex, setEditingLineIndex] = React.useState<number | null>(null);

  const { data: customersData } = trpc.customers.list.useQuery({ limit: 200 });
  const { data: warehousesData } = trpc.warehouses.list.useQuery({ limit: 200 });
  const { data: itemsData } = trpc.items.list.useQuery({ isSaleable: true });
  const { data: taxRatesData } = trpc.settings.taxRates.list.useQuery();
  const { data: orgData } = trpc.settings.getOrg.useQuery();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(invoice, warehousesData, orgData ?? undefined),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const lines = useWatch({ control, name: 'lines' }) ?? [];
  const invoiceType = watch('type');
  const isWalkIn = watch('isWalkIn');
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

  React.useEffect(() => {
    if (open) reset(defaults(invoice, warehousesData, orgData ?? undefined));
  }, [open, invoice, warehousesData, reset, orgData]);

  const createMutation = trpc.invoices.create.useMutation({
    onSuccess(data) {
      utils.invoices.list.invalidate();
      toast.success(t('invoices.invoiceCreated'), { description: data.serial });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error(t('invoices.failedToCreate'), { description: err.message });
    },
  });

  const updateMutation = trpc.invoices.update.useMutation({
    onSuccess(data) {
      utils.invoices.list.invalidate();
      toast.success(t('invoices.invoiceUpdated'), { description: data.serial });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error(t('invoices.failedToUpdate'), { description: err.message });
    },
  });

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const onSubmit: SubmitHandler<InvoiceFormValues> = (values) => {
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
      lines: values.lines.map((l, idx) => ({
        id: l.id || undefined,
        itemId: l.itemId || undefined,
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

    if (isEdit && invoice?.id) {
      updateMutation.mutate({ id: invoice.id, version: invoice.version ?? 0, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const customers = Array.isArray(customersData) ? customersData : (customersData?.data ?? []);
  const warehouses = Array.isArray(warehousesData) ? warehousesData : (warehousesData?.data ?? []);
  const items = Array.isArray(itemsData) ? itemsData : (itemsData?.data ?? []);
  const taxRates = Array.isArray(taxRatesData) ? taxRatesData : [];

  const itemsMap = React.useMemo(
    () => Object.fromEntries(items.map((i: any) => [i.id, i])),
    [items],
  );

  const taxRatesMap = React.useMemo(
    () => Object.fromEntries(taxRates.map((tr: any) => [tr.id, tr])),
    [taxRates],
  );

  const handleLineSave = (index: number, data: InvoiceLineData) => {
    if (index >= fields.length) {
      append({
        itemId: data.itemId || '',
        description: data.description || '',
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discountAmt: data.discountAmt,
        purchasePrice: data.purchasePrice ?? 0,
        taxRateId: data.taxRateId || '',
        taxRateSnapshot: data.taxRateSnapshot ?? undefined,
        taxRateName: data.taxRateName || '',
        sortOrder: 0,
      });
    } else {
      setValue(`lines.${index}.itemId`, data.itemId || undefined);
      setValue(`lines.${index}.description`, data.description || undefined);
      setValue(`lines.${index}.quantity`, data.quantity);
      setValue(`lines.${index}.unitPrice`, data.unitPrice);
      setValue(`lines.${index}.discountAmt`, data.discountAmt);
      setValue(`lines.${index}.purchasePrice`, data.purchasePrice ?? undefined);
      setValue(`lines.${index}.taxRateId`, data.taxRateId || undefined);
      setValue(`lines.${index}.taxRateSnapshot`, data.taxRateSnapshot ?? undefined);
      setValue(`lines.${index}.taxRateName`, data.taxRateName || undefined);
    }
  };

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
    { value: 'INVOICE', label: t('invoices.invoice') },
    { value: 'QUOTE', label: t('invoices.quote') },
    { value: 'CREDIT_NOTE', label: t('invoices.creditNote') },
    { value: 'DELIVERY_NOTE', label: t('invoices.deliveryNote') },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
        <DialogContent className="sm:max-w-200">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t('invoices.editInvoice') : t('invoices.createInvoice')}
            </DialogTitle>
            <DialogDescription>
              {isEdit ? t('invoices.editInvoiceDesc') : t('invoices.createInvoiceDesc')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <ValidationAlert errors={errors as any} />

            <div className="space-y-4 max-h-110 overflow-y-auto pr-2">
              {/* Type + Currency + Exchange Rate */}
              <div className="grid grid-cols-3 gap-3">
                <Field>
                  <Label htmlFor="type">{t('invoices.type')} *</Label>
                  <Select value={watch('type')} onValueChange={(v) => setValue('type', v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {invoiceTypeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <Label htmlFor="currency">{t('invoices.currency')}</Label>
                  <Select
                    value={watch('currency')}
                    onValueChange={(v) => setValue('currency', v as any)}
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
                <Field>
                  <Label htmlFor="exchangeRate">{t('invoices.exchangeRate')}</Label>
                  <Input
                    id="exchangeRate"
                    type="number"
                    min={0.001}
                    step="any"
                    {...register('exchangeRate')}
                  />
                </Field>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <Label htmlFor="date">{t('invoices.issueDate')} *</Label>
                  <DatePickerField id="date" {...register('date')} />
                </Field>
                <Field>
                  <Label htmlFor="dueDate">{t('invoices.dueDate')}</Label>
                  <DatePickerField id="dueDate" {...register('dueDate')} />
                </Field>
              </div>

              {/* Customer */}
              {needsCustomer && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Field>
                        <Label htmlFor="customerId">
                          {isWalkIn ? t('invoices.walkInCustomerName') : t('invoices.customer')}
                        </Label>
                        {isWalkIn ? (
                          <Input
                            id="customerId"
                            placeholder={t('invoices.walkInCustomerPlaceholder')}
                            {...register('customerId')}
                          />
                        ) : (
                          <Select
                            value={watch('customerId') || ''}
                            onValueChange={(v) => setValue('customerId', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('invoices.selectCustomer')} />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map((c: any) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </Field>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <Checkbox
                        id="isWalkIn"
                        checked={isWalkIn}
                        onCheckedChange={(checked) => {
                          setValue('isWalkIn', checked === true);
                          if (checked) setValue('customerId', '');
                        }}
                      />
                      <Label htmlFor="isWalkIn" className="text-sm font-normal cursor-pointer">
                        {t('invoices.walkInCustomer')}
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Warehouse (for INVOICE type) */}
              {needsWarehouse && (
                <Field>
                  <Label htmlFor="warehouseId">{t('invoices.warehouse')}</Label>
                  <Select
                    value={watch('warehouseId') || ''}
                    onValueChange={(v) => setValue('warehouseId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('invoices.selectWarehouse')} />
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
              )}

              {/* Description + Notes */}
              <Field>
                <Label htmlFor="description">{t('common.description')}</Label>
                <Input
                  id="description"
                  placeholder={t('invoices.descriptionPlaceholder')}
                  {...register('description')}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <Label htmlFor="notes">{t('invoices.notesPrinted')}</Label>
                  <Textarea id="notes" className="resize-none" rows={2} {...register('notes')} />
                </Field>
                <Field>
                  <Label htmlFor="internalNotes">{t('invoices.internalNotes')}</Label>
                  <Textarea
                    id="internalNotes"
                    className="resize-none"
                    rows={2}
                    {...register('internalNotes')}
                  />
                </Field>
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">{t('invoices.lineItems')} *</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingLineIndex(fields.length)}
                    >
                      <Plus className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">{t('invoices.addLine')}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setItemPickerOpen(true)}
                    >
                      <Package className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">{t('invoices.browse')}</span>
                    </Button>
                  </div>
                </div>

                {fields.map((field, index) => {
                  const isManual = !field.itemId;
                  const item = itemsMap[field.itemId || ''] as any;
                  const lineWatch = watch(`lines.${index}`);
                  const lineTaxRateId = watch(`lines.${index}.taxRateId`);
                  const taxRate = taxRatesMap[lineTaxRateId || ''] as any;
                  const qty = Number(lineWatch?.quantity) || 0;
                  const price = Number(lineWatch?.unitPrice) || 0;
                  const costBasis = Number(lineWatch?.purchasePrice) || 0;
                  const discount = Number(lineWatch?.discountAmt) || 0;
                  const lineSubtotal = qty * price;
                  const lineTotal = lineSubtotal - discount;
                  const lineTax = taxRate ? lineTotal * (Number(taxRate.rate) / 100) : 0;
                  const lineCogs = qty * costBasis;
                  const grossProfit = lineTotal - lineCogs;
                  const margin = lineTotal > 0 ? (grossProfit / lineTotal) * 100 : 0;

                  return (
                    <div key={field.id} className="border rounded-lg p-3 bg-muted/20 space-y-2">
                      {/* Compact card header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {isManual
                              ? lineWatch?.description || t('invoices.manualEntry')
                              : item?.name || field.itemId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {qty} × {price.toFixed(3)}
                            {discount > 0 && (
                              <span className="text-destructive ml-1">
                                (-{discount.toFixed(3)})
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold">
                            {(lineTotal + lineTax).toFixed(3)}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => setEditingLineIndex(index)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {/* Tax rate selector */}
                      <div className="flex items-center gap-2">
                        <div className="w-48">
                          <Select
                            value={lineTaxRateId || 'none'}
                            onValueChange={(v) => {
                              const tr = v === 'none' ? undefined : (taxRatesMap[v] as any);
                              setValue(`lines.${index}.taxRateId`, v === 'none' ? undefined : v);
                              setValue(
                                `lines.${index}.taxRateSnapshot`,
                                tr ? Number(tr.rate) : undefined,
                              );
                              setValue(`lines.${index}.taxRateName`, tr?.name || undefined);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('invoices.taxRate')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t('invoices.noTax')}</SelectItem>
                              {taxRates.map((tr: any) => (
                                <SelectItem key={tr.id} value={tr.id}>
                                  {tr.name} ({Number(tr.rate)}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {taxRate && (
                          <span className="text-xs text-muted-foreground">
                            {t('invoices.tax')}: {lineTax.toFixed(3)} {currency}
                          </span>
                        )}
                      </div>

                      {/* Profit info */}
                      {lineTotal > 0 && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground border-t pt-1.5">
                          <span>
                            {t('invoices.revenue')}:{' '}
                            <span className="font-medium text-foreground">
                              {lineTotal.toFixed(3)}
                            </span>
                          </span>
                          <span>
                            {t('invoices.cogs')}:{' '}
                            <span className="font-medium text-foreground">
                              {lineCogs.toFixed(3)}
                            </span>
                          </span>
                          <span className={grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {t('invoices.gp')}: {grossProfit.toFixed(3)} ({margin.toFixed(1)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {fields.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8 space-y-2 border rounded-lg">
                    <Package className="h-8 w-8 mx-auto opacity-30" />
                    <p>{t('invoices.noLineItems')}</p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingLineIndex(fields.length)}
                      >
                        <Plus className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">{t('invoices.addLine')}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setItemPickerOpen(true)}
                      >
                        <Package className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">{t('invoices.browseCatalogue')}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Totals */}
              {fields.length > 0 && (
                <div className="flex justify-end border-t pt-3">
                  <div className="text-right space-y-1 min-w-60">
                    <div className="flex justify-between gap-8 text-sm">
                      <span className="text-muted-foreground">{t('invoices.subtotal')}</span>
                      <span className="font-medium">
                        {totals.subtotal.toFixed(3)} {currency}
                      </span>
                    </div>
                    <div className="flex justify-between gap-8 text-sm">
                      <span className="text-muted-foreground">{t('invoices.discount')}</span>
                      <span className="font-medium text-destructive">
                        -{totals.discountTotal.toFixed(3)} {currency}
                      </span>
                    </div>
                    <div className="flex justify-between gap-8 text-sm">
                      <span className="text-muted-foreground">{t('invoices.tax')}</span>
                      <span className="font-medium">
                        +{totals.taxTotal.toFixed(3)} {currency}
                      </span>
                    </div>
                    <div className="flex justify-between gap-8 text-sm">
                      <span className="text-muted-foreground">{t('invoices.cogs')}</span>
                      <span className="font-medium">
                        {totals.costTotal.toFixed(3)} {currency}
                      </span>
                    </div>
                    <div className="flex justify-between gap-8 text-sm border-t pt-1">
                      <span>{t('invoices.grossProfit')}</span>
                      <span
                        className={
                          totals.total - totals.costTotal >= 0
                            ? 'text-green-600 font-medium'
                            : 'text-red-600 font-medium'
                        }
                      >
                        {(totals.total - totals.costTotal).toFixed(3)} {currency}
                        {totals.total > 0 && (
                          <span className="text-xs ms-1">
                            ({(((totals.total - totals.costTotal) / totals.total) * 100).toFixed(1)}
                            %)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between gap-8 text-base font-bold border-t pt-1">
                      <span>{t('invoices.total')}</span>
                      <span>
                        {totals.total.toFixed(3)} {currency}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Terms */}
              <Field>
                <Label htmlFor="termsText">{t('invoices.termsAndConditions')}</Label>
                <RichtextEditor
                  value={watch('termsText')}
                  onChange={(html) => setValue('termsText', html)}
                  placeholder={t('invoices.termsPlaceholder')}
                  minHeight="100px"
                />
              </Field>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isEdit
                  ? t('invoices.saveChanges')
                  : t('common.create', {
                      type:
                        invoiceTypeOptions.find((o) => o.value === invoiceType)?.label ??
                        t('invoices.invoice'),
                    })}
              </Button>
            </DialogFooter>
          </form>

          {/* Line edit / create dialog (nested inside invoice DialogContent so Radix layers properly) */}
          {editingLineIndex !== null && (
            <InvoiceLineDialog
              open={editingLineIndex !== null}
              onOpenChange={(v) => {
                if (!v) setEditingLineIndex(null);
              }}
              index={editingLineIndex}
              initial={
                editingLineIndex < fields.length
                  ? {
                      itemId: fields[editingLineIndex]?.itemId ?? null,
                      description: fields[editingLineIndex]?.description ?? null,
                      quantity: Number(fields[editingLineIndex]?.quantity) || 1,
                      unitPrice: Number(fields[editingLineIndex]?.unitPrice) || 0,
                      discountAmt: Number(fields[editingLineIndex]?.discountAmt) || 0,
                      purchasePrice: Number(fields[editingLineIndex]?.purchasePrice) || null,
                      taxRateId: fields[editingLineIndex]?.taxRateId ?? null,
                      taxRateSnapshot: Number(fields[editingLineIndex]?.taxRateSnapshot) || null,
                      taxRateName: fields[editingLineIndex]?.taxRateName ?? null,
                    }
                  : { quantity: 1, unitPrice: 0, discountAmt: 0, purchasePrice: 0 }
              }
              onSave={handleLineSave}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Item selection dialog */}
      <SelectionDialog
        open={itemPickerOpen}
        onOpenChange={setItemPickerOpen}
        title={t('invoices.selectItemsTitle')}
        description={t('invoices.selectItemsDesc')}
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
                <Badge variant="outline" className="text-[10px]">
                  {item.sku}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('invoices.unit')}: {item.unit} · {t('invoices.price')}:{' '}
                {Number(item.salesPrice).toFixed(3)}
              </p>
            </div>
            {selected && (
              <Badge className="shrink-0 bg-primary text-primary-foreground text-xs">
                {t('invoices.selected')}
              </Badge>
            )}
          </div>
        )}
        itemName={t('invoices.itemsLower')}
        confirmLabel={t('invoices.addToInvoice')}
      />
    </>
  );
}

// Provider + Hook

interface OpenOptions {
  onSuccess?: (id: string) => void;
  defaults?: Partial<InvoiceFormValues>;
}

interface InvoiceFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    invoice: { id: string; version?: number } & Partial<InvoiceFormValues>,
    options?: OpenOptions,
  ) => void;
}

const InvoiceFormContext = React.createContext<InvoiceFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  invoice?: { id: string; version?: number } & Partial<InvoiceFormValues>;
  onSuccess?: (id: string) => void;
}

export function InvoiceFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({
      open: true,
      invoice: options?.defaults ? (options.defaults as any) : undefined,
      onSuccess: options?.onSuccess,
    });
  }, []);

  const openEdit = React.useCallback(
    (
      invoice: { id: string; version?: number } & Partial<InvoiceFormValues>,
      options?: OpenOptions,
    ) => {
      setState({ open: true, invoice, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <InvoiceFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <InvoiceFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        invoice={state.invoice}
        onSuccess={state.onSuccess}
      />
    </InvoiceFormContext.Provider>
  );
}

export function useInvoiceForm(): InvoiceFormContextValue {
  const ctx = React.useContext(InvoiceFormContext);
  if (!ctx) throw new Error('useInvoiceForm must be used inside <InvoiceFormProvider>');
  return ctx;
}

function defaults(
  invoice?: { id: string; version?: number } & Partial<InvoiceFormValues>,
  warehousesData?: any,
  org?: { defaultTermsText?: string | null; currency?: string },
): InvoiceFormValues {
  const today = toDateInputValue(new Date());
  const list = Array.isArray(warehousesData)
    ? warehousesData
    : ((warehousesData as any)?.data ?? []);
  const defaultWarehouse = list.find((w: any) => w.isDefault);
  return {
    type: invoice?.type ?? 'INVOICE',
    date: invoice?.date ?? today,
    dueDate: invoice?.dueDate ?? undefined,
    customerId: invoice?.customerId ?? '',
    warehouseId: invoice?.warehouseId ?? defaultWarehouse?.id ?? '',
    departmentId: invoice?.departmentId ?? undefined,
    currency: (invoice?.currency ?? org?.currency ?? 'BHD') as any,
    exchangeRate: invoice?.exchangeRate ?? 1,
    description: invoice?.description ?? undefined,
    notes: invoice?.notes ?? undefined,
    termsText: invoice?.termsText ?? org?.defaultTermsText ?? undefined,
    internalNotes: invoice?.internalNotes ?? undefined,
    isWalkIn: invoice?.isWalkIn ?? false,
    parentInvoiceId: invoice?.parentInvoiceId ?? undefined,
    lines: invoice?.lines ?? [],
  };
}
