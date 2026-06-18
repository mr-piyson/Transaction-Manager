'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronsUpDown, Loader2, Search, TriangleAlert, X } from 'lucide-react';
import * as React from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';

const schema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  supplierSku: z.string().optional(),
  supplierName: z.string().optional(),
  basePrice: z.coerce.number().min(0, 'Base price must be 0 or more'),
  currency: z.enum(['USD', 'BHD', 'EUR', 'GBP', 'JPY', 'AED', 'SAR', 'KWD', 'QAR', 'OMR']),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
  minOrderQty: z.coerce.number().min(1).default(1),
  notes: z.string().optional(),
});

export type SupplierItemFormValues = z.infer<typeof schema>;

interface ValidationAlertProps {
  errors: Partial<Record<keyof SupplierItemFormValues, { message?: string }>>;
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

export interface SupplierItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  supplierItem?: {
    id: string;
    itemId: string;
    itemName?: string;
    itemSku?: string;
  } & Partial<SupplierItemFormValues>;
  onSuccess?: () => void;
}

export function SupplierItemFormDialog({
  open,
  onOpenChange,
  supplierId,
  supplierItem,
  onSuccess,
}: SupplierItemFormDialogProps) {
  const isEdit = Boolean(supplierItem?.id);
  const utils = trpc.useUtils();
  const [itemSearch, setItemSearch] = React.useState('');
  const [itemPopoverOpen, setItemPopoverOpen] = React.useState(false);

  const { data: itemsData } = trpc.items.list.useQuery(
    { limit: 50, search: itemSearch || undefined },
    { enabled: open },
  );
  const items = Array.isArray(itemsData) ? itemsData : (itemsData?.data ?? []);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupplierItemFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(supplierItem),
  });

  const selectedItemId = watch('itemId');
  const selectedItem = items.find((i: any) => i.id === selectedItemId);

  React.useEffect(() => {
    if (open) reset(defaults(supplierItem));
  }, [open, supplierItem, reset]);

  const createMutation = trpc.suppliers.addSupplierItem.useMutation({
    onSuccess() {
      utils.suppliers.byId.invalidate({ id: supplierId });
      toast.success('Item added to supplier');
      onSuccess?.();
      onOpenChange(false);
    },
    onError(err) {
      toast.error('Failed to add item', { description: err.message });
    },
  });

  const updateMutation = trpc.suppliers.updateSupplierItem.useMutation({
    onSuccess() {
      utils.suppliers.byId.invalidate({ id: supplierId });
      toast.success('Supplier item updated');
      onSuccess?.();
      onOpenChange(false);
    },
    onError(err) {
      toast.error('Failed to update supplier item', { description: err.message });
    },
  });

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const onSubmit: SubmitHandler<SupplierItemFormValues> = (values) => {
    if (isEdit && supplierItem?.id) {
      updateMutation.mutate({ id: supplierItem.id, ...values });
    } else {
      createMutation.mutate({ supplierId, ...values });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit supplier item' : 'Add supplier item'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details below and save.'
              : 'Link an item to this supplier with pricing and lead time.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <ValidationAlert errors={errors} />

          <div className="space-y-4">
            {!isEdit && (
              <Field>
                <Label>Item *</Label>
                <Popover open={itemPopoverOpen} onOpenChange={setItemPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={itemPopoverOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedItem ? (
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{selectedItem.name}</span>
                          <span className="text-xs text-muted-foreground">({selectedItem.sku})</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Search and select an item...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search items..."
                        value={itemSearch}
                        onValueChange={setItemSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No items found.</CommandEmpty>
                        <CommandGroup>
                          {items.map((item: any) => (
                            <CommandItem
                              key={item.id}
                              value={item.id}
                              onSelect={(currentValue) => {
                                setValue('itemId', currentValue);
                                setItemPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedItemId === item.id ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              <span className="font-medium">{item.name}</span>
                              <span className="ml-2 text-xs text-muted-foreground">({item.sku})</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </Field>
            )}

            {isEdit && supplierItem && (
              <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/30">
                <span className="font-medium">{supplierItem.itemName}</span>
                <span className="text-xs text-muted-foreground">({supplierItem.itemSku})</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="supplierSku">Supplier SKU</Label>
                <Input
                  id="supplierSku"
                  placeholder="Vendor's SKU"
                  {...register('supplierSku')}
                />
              </Field>
              <Field>
                <Label htmlFor="supplierName">Supplier name (override)</Label>
                <Input
                  id="supplierName"
                  placeholder="Custom name for this supplier"
                  {...register('supplierName')}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field>
                <Label htmlFor="basePrice">Base price *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min={0}
                  step="0.001"
                  aria-invalid={!!errors.basePrice}
                  {...register('basePrice')}
                />
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
                    {['USD', 'BHD', 'EUR', 'GBP', 'JPY', 'AED', 'SAR', 'KWD', 'QAR', 'OMR'].map(
                      (c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <Label htmlFor="leadTimeDays">Lead time (days)</Label>
                <Input
                  id="leadTimeDays"
                  type="number"
                  min={0}
                  placeholder="e.g. 14"
                  {...register('leadTimeDays')}
                />
              </Field>
            </div>

            <Field>
              <Label htmlFor="minOrderQty">Min order qty</Label>
              <Input
                id="minOrderQty"
                type="number"
                min={1}
                step="1"
                {...register('minOrderQty')}
              />
            </Field>

            <Field>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                className="resize-none"
                rows={2}
                {...register('notes')}
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
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Add item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Provider + Hook

interface OpenOptions {
  onSuccess?: () => void;
}

interface SupplierItemFormContextValue {
  openCreate: (supplierId: string, options?: OpenOptions) => void;
  openEdit: (
    supplierId: string,
    item: {
      id: string;
      itemId: string;
      itemName?: string;
      itemSku?: string;
    } & Partial<SupplierItemFormValues>,
    options?: OpenOptions,
  ) => void;
}

const SupplierItemFormContext = React.createContext<SupplierItemFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  supplierId?: string;
  supplierItem?: any;
  onSuccess?: () => void;
}

export function SupplierItemFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((supplierId: string, options?: OpenOptions) => {
    setState({ open: true, supplierId, supplierItem: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback(
    (
      supplierId: string,
      item: any,
      options?: OpenOptions,
    ) => {
      setState({ open: true, supplierId, supplierItem: item, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <SupplierItemFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      {state.supplierId && (
        <SupplierItemFormDialog
          open={state.open}
          onOpenChange={handleOpenChange}
          supplierId={state.supplierId}
          supplierItem={state.supplierItem}
          onSuccess={state.onSuccess}
        />
      )}
    </SupplierItemFormContext.Provider>
  );
}

export function useSupplierItemForm(): SupplierItemFormContextValue {
  const ctx = React.useContext(SupplierItemFormContext);
  if (!ctx) throw new Error('useSupplierItemForm must be used inside <SupplierItemFormProvider>');
  return ctx;
}

function defaults(item?: any): SupplierItemFormValues {
  return {
    itemId: item?.itemId ?? '',
    supplierSku: item?.supplierSku ?? undefined,
    supplierName: item?.supplierName ?? undefined,
    basePrice: typeof item?.basePrice === 'number' ? item.basePrice : 0,
    currency: item?.currency ?? 'BHD',
    leadTimeDays: typeof item?.leadTimeDays === 'number' ? item.leadTimeDays : undefined,
    minOrderQty: typeof item?.minOrderQty === 'number' ? item.minOrderQty : 1,
    notes: item?.notes ?? undefined,
  };
}
