'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, TriangleAlert } from 'lucide-react';
import * as React from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

const schema = z.object({
  type: z.enum(['PRODUCT', 'SERVICE']),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  isSaleable: z.boolean(),
  isPurchasable: z.boolean(),
  purchasePrice: z.coerce.number().min(0).default(0),
  salesPrice: z.coerce.number().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  reorderPoint: z.coerce.number().int().min(0).default(0),
  reorderQty: z.coerce.number().int().min(0).default(0),
  categoryId: z.string().optional(),
  taxRateId: z.string().optional(),
});

export type ItemFormValues = z.infer<typeof schema>;

interface ValidationAlertProps {
  errors: Partial<Record<keyof ItemFormValues, { message?: string }>>;
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

export interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: { id: string } & Partial<ItemFormValues>;
  onSuccess?: (itemId: string) => void;
}

export function ItemFormDialog({ open, onOpenChange, item, onSuccess }: ItemFormDialogProps) {
  const isEdit = Boolean(item?.id);
  const utils = trpc.useUtils();
  const { data: categories } = trpc.items.list.useQuery({ limit: 200 });
  const { data: taxRates } = trpc.settings.taxRates.list.useQuery();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(item),
  });

  const selectedType = watch('type');
  const isService = selectedType === 'SERVICE';
  const isProduct = selectedType === 'PRODUCT';

  React.useEffect(() => {
    if (open) reset(defaults(item));
  }, [open, item, reset]);

  // Reset type-specific fields when type changes
  const handleTypeChange = (type: string) => {
    setValue('type', type as 'PRODUCT' | 'SERVICE');
    if (type === 'SERVICE') {
      setValue('purchasePrice', 0);
      setValue('minStock', 0);
      setValue('reorderPoint', 0);
      setValue('reorderQty', 0);
      setValue('isPurchasable', false);
    }
  };

  const createMutation = trpc.items.create.useMutation({
    onSuccess(data) {
      utils.items.list.invalidate();
      toast.success('Item created', { description: data.name });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error('Failed to create item', { description: err.message });
    },
  });

  const updateMutation = trpc.items.update.useMutation({
    onSuccess(data) {
      utils.items.list.invalidate();
      toast.success('Item updated', { description: data.name });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error('Failed to update item', { description: err.message });
    },
  });

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const onSubmit: SubmitHandler<ItemFormValues> = (values) => {
    const { ...rest } = values;

    if (isService) {
      rest.purchasePrice = 0;
      rest.minStock = 0;
      rest.reorderPoint = 0;
      rest.reorderQty = 0;
    }

    const payload = rest;

    if (isEdit && item?.id) {
      updateMutation.mutate({ id: item.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const categoryList = Array.isArray(categories) ? categories : (categories?.data ?? []);
  const taxRateList = Array.isArray(taxRates) ? taxRates : [];

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-160">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit item' : 'New item'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details below and save.'
              : 'Fill in the details to create a new item.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <ValidationAlert errors={errors} />

          <div className="space-y-4 max-h-100 overflow-y-auto pr-2">
            {/* Type + Unit */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="type">Type *</Label>
                <Select value={selectedType} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRODUCT">Product</SelectItem>
                    <SelectItem value="SERVICE">Service</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <Label htmlFor="unit">Unit *</Label>
                <Input id="unit" placeholder="pcs, kg, hr" {...register('unit')} />
              </Field>
            </div>

            {/* Name */}
            <Field>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Item name"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
            </Field>

            {/* SKU + Barcode */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  placeholder="SKU-001"
                  aria-invalid={!!errors.sku}
                  {...register('sku')}
                />
              </Field>
              <Field>
                <Label htmlFor="barcode">Barcode</Label>
                <Input id="barcode" placeholder="EAN/UPC" {...register('barcode')} />
              </Field>
            </div>

            {/* Description */}
            <Field>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                className="resize-none"
                rows={2}
                {...register('description')}
              />
            </Field>

            {/* Product-only fields */}
            {isProduct && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <Label htmlFor="purchasePrice">Purchase price</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      min={0}
                      step="0.001"
                      {...register('purchasePrice')}
                    />
                  </Field>
                  <Field>
                    <Label htmlFor="salesPrice">Sales price</Label>
                    <Input
                      id="salesPrice"
                      type="number"
                      min={0}
                      step="0.001"
                      {...register('salesPrice')}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Field>
                    <Label htmlFor="minStock">Min stock</Label>
                    <Input id="minStock" type="number" min={0} {...register('minStock')} />
                  </Field>
                  <Field>
                    <Label htmlFor="reorderPoint">Reorder at</Label>
                    <Input id="reorderPoint" type="number" min={0} {...register('reorderPoint')} />
                  </Field>
                  <Field>
                    <Label htmlFor="reorderQty">Reorder qty</Label>
                    <Input id="reorderQty" type="number" min={0} {...register('reorderQty')} />
                  </Field>
                </div>
              </>
            )}

            {/* Service-only fields */}
            {isService && (
              <Field>
                <Label htmlFor="salesPrice">Sales price</Label>
                <Input
                  id="salesPrice"
                  type="number"
                  min={0}
                  step="0.001"
                  {...register('salesPrice')}
                />
              </Field>
            )}

            {/* Category + Tax */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="categoryId">Category</Label>
                <Select onValueChange={(v) => setValue('categoryId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryList.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <Label htmlFor="taxRateId">Tax rate</Label>
                <Select onValueChange={(v) => setValue('taxRateId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tax rate" />
                  </SelectTrigger>
                  <SelectContent>
                    {taxRateList.map((tr: any) => (
                      <SelectItem key={tr.id} value={tr.id}>
                        {tr.name} ({Number(tr.rate)}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* Flags */}
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isSaleable"
                  checked={watch('isSaleable')}
                  onCheckedChange={(checked) => setValue('isSaleable', checked === true)}
                />
                <Label htmlFor="isSaleable" className="text-sm font-normal">
                  Sellable
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isPurchasable"
                  checked={watch('isPurchasable')}
                  onCheckedChange={(checked) => setValue('isPurchasable', checked === true)}
                />
                <Label htmlFor="isPurchasable" className="text-sm font-normal">
                  Purchasable
                </Label>
              </div>
            </div>
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
              {isEdit ? 'Save changes' : 'Create item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Provider + Hook

interface OpenOptions {
  onSuccess?: (id: string) => void;
}

interface ItemFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (item: { id: string } & Partial<ItemFormValues>, options?: OpenOptions) => void;
}

const ItemFormContext = React.createContext<ItemFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  item?: { id: string } & Partial<ItemFormValues>;
  onSuccess?: (id: string) => void;
}

export function ItemFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, item: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (item: { id: string } & Partial<ItemFormValues>, options?: OpenOptions) => {
      setState({ open: true, item, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <ItemFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <ItemFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        item={state.item}
        onSuccess={state.onSuccess}
      />
    </ItemFormContext.Provider>
  );
}

export function useItemForm(): ItemFormContextValue {
  const ctx = React.useContext(ItemFormContext);
  if (!ctx) throw new Error('useItemForm must be used inside <ItemFormProvider>');
  return ctx;
}

function defaults(item?: { id: string } & Partial<ItemFormValues>): ItemFormValues {
  return {
    type: item?.type ?? 'PRODUCT',
    sku: item?.sku ?? '',
    barcode: item?.barcode ?? undefined,
    name: item?.name ?? '',
    description: item?.description ?? undefined,
    unit: item?.unit ?? 'pcs',
    isSaleable: item?.isSaleable ?? true,
    isPurchasable: item?.isPurchasable ?? true,
    purchasePrice: typeof item?.purchasePrice === 'number' ? item.purchasePrice : 0,
    salesPrice: typeof item?.salesPrice === 'number' ? item.salesPrice : 0,
    minStock: typeof item?.minStock === 'number' ? item.minStock : 0,
    reorderPoint: typeof item?.reorderPoint === 'number' ? item.reorderPoint : 0,
    reorderQty: typeof item?.reorderQty === 'number' ? item.reorderQty : 0,
    categoryId: item?.categoryId ?? undefined,
    taxRateId: item?.taxRateId ?? undefined,
  };
}
