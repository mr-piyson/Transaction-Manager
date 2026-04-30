'use client';

import { JSX, useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Plus,
  Search,
  Hash,
  Banknote,
  FileText,
  PackagePlus,
  Check,
  Box,
  Wrench,
} from 'lucide-react';
import * as z from 'zod';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { trpc } from '@/lib/trpc/client';
import { CreateItemDialog } from '../../items/create-item-dialog';
import { ItemSelectionDialog } from '../../invoices/new/invoice-line-dialog';

const purchaseLineSchema = z.object({
  description: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unitCost: z.coerce.number().min(0, 'Price cannot be negative'),
  itemId: z.string().optional(),
});

type PurchaseLineValues = z.infer<typeof purchaseLineSchema>;

interface PurchaseLineDialogProps {
  onSuccess: (line: any) => void;
  children?: JSX.Element;
  initialValues?: any;
  title?: string;
  mode?: 'create' | 'edit';
}

export function PurchaseLineDialog({
  onSuccess,
  children,
  initialValues,
  title,
  mode = 'create',
}: PurchaseLineDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(initialValues?.itemRef || null);

  const { data: items, isLoading: isLoadingItems } = trpc.items.list.useQuery({});

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PurchaseLineValues>({
    defaultValues: {
      description: initialValues?.description || '',
      quantity: initialValues?.quantity || 1,
      unitCost: initialValues?.unitCost || 0,
      itemId: initialValues?.itemId || undefined,
    },
  });

  useEffect(() => {
    if (initialValues) {
      reset({
        description: initialValues.description || '',
        quantity: initialValues.quantity || 1,
        unitCost: initialValues.unitCost || 0,
        itemId: initialValues.itemId || undefined,
      });
      setSelectedItem(initialValues.itemRef || null);
    }
  }, [initialValues, reset]);

  const watchQuantity = watch('quantity');
  const watchPrice = watch('unitCost');
  const lineTotal = useMemo(() => watchQuantity * watchPrice, [watchQuantity, watchPrice]);

  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    setValue('description', item.name);
    // Purchase price defaults to purchasePrice, not salesPrice!
    setValue('unitCost', Number(item.purchasePrice) / 1000);
    setValue('itemId', item.id);
  };

  const onSubmit = (values: PurchaseLineValues) => {
    if (!values.itemId) {
        // Must select an item for PO
        return;
    }
    onSuccess({
      ...initialValues,
      id: mode === 'create' ? Math.random().toString(36).substr(2, 9) : initialValues?.id,
      ...values,
      taxAmt: 0, // Simplified for now, unless you have tax field
      total: lineTotal,
      itemRef: selectedItem,
    });

    if (mode === 'create') {
      reset();
      setSelectedItem(null);
    }
    setOpen(false);
  };

  const dialogTitle = title || (mode === 'create' ? 'Add Order Line' : 'Edit Order Line');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          children ?? (
            <Button variant="outline" className="gap-2 border-dashed">
              <Plus className="size-4" />
              Add Line Item
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <FileText className="size-5" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>
            Search existing master items to add to the purchase order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Item Selection
              </FieldLabel>
              <ItemSelectionDialog
                data={items ?? []}
                isLoading={isLoadingItems}
                onSelect={(item) => handleSelectItem(item)}
                searchFields={['name', 'sku']}
                getItemId={(item) => item.id}
              >
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-11 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  {selectedItem ? (
                    <div className="flex flex-col items-start overflow-hidden">
                        <span className="font-medium truncate">{selectedItem.name}</span>
                    </div>
                  ) : (
                    <>
                        <Search className="mr-2 size-4 text-muted-foreground shrink-0" />
                        <div className="flex flex-col items-start overflow-hidden">
                            <span className="font-medium truncate">Search products...</span>
                        </div>
                    </>
                  )}
                </Button>
              </ItemSelectionDialog>
            </div>

            <CreateItemDialog onSuccess={handleSelectItem}>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-11 w-11 shrink-0"
                title="Create New Master Item"
              >
                <PackagePlus className="size-4" />
              </Button>
            </CreateItemDialog>
          </div>
        </div>

        <hr className="my-2" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field data-invalid={!!errors.description}>
            <FieldLabel>Description (Optional override)</FieldLabel>
            <Input {...register('description')} placeholder="e.g. Specification or brand" />
            <FieldError>{errors.description?.message}</FieldError>
          </Field>

          <FieldGroup className="grid grid-cols-2 gap-4">
            <Field data-invalid={!!errors.quantity}>
              <FieldLabel>Quantity</FieldLabel>
              <InputGroup>
                <InputGroupInput type="number" step="1" {...register('quantity')} />
                <InputGroupAddon>
                  <Hash className="size-4" />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.quantity?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.unitCost}>
              <FieldLabel>Unit Cost</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  type="number"
                  step="0.001"
                  {...register('unitCost')}
                  placeholder="0.000"
                />
                <InputGroupAddon>BHD</InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.unitCost?.message}</FieldError>
            </Field>
          </FieldGroup>

          <div className="bg-muted/50 p-3 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium">Total for this line:</span>
            <span className="text-lg font-bold text-primary">
              {lineTotal.toFixed(3)} <small className="text-[10px]">BD</small>
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedItem} className="gap-2">
              <Check className="size-4" />
              Confirm
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
