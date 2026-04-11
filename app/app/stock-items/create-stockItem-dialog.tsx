'use client';

import * as z from 'zod';
import { useState } from 'react';
import { Loader2, Plus, Box, Banknote, QrCode, Hash, Layers } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { AppForm, FormInput, FormGroup } from '@/components/Form';

export const stockItemSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  sku: z.string().min(3, 'SKU is required'),
  type: z.enum(['PRODUCT', 'SERVICE']),
  description: z.string().optional(),
  unit: z.string().default('pcs'),
  minStock: z.coerce.number().int().default(0),
});

type StockItemValues = z.infer<typeof stockItemSchema>;

const DEFAULT_VALUES: StockItemValues = {
  name: '',
  sku: '',
  type: 'PRODUCT',
  description: '',
  unit: 'pcs',
  minStock: 0,
};

export function CreateStockItemDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const createMutation = trpc.stockItems.createStockItem.useMutation();

  async function handleSubmit(values: StockItemValues) {
    try {
      await createMutation.mutateAsync({
        ...values,
        purchasePrice: 0, // Master prices set later or in detail
        salesPrice: 0,
      });
      utils.stockItems.getStockItems.invalidate();
      setOpen(false);
      onSuccess?.();
      toast.success('Stock item created successfully');
    } catch (error) {
      toast.error('Failed to create stock item');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="default" className="gap-2">
            <Plus className="size-4" />
            Add Master Item
          </Button>
        }
      ></DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-bold">
            <Box className="size-5" />
            New Master Item
          </DialogTitle>
          <DialogDescription>
            Register a new product or service in the master catalog.
          </DialogDescription>
        </DialogHeader>

        <AppForm
          schema={stockItemSchema}
          defaultValues={DEFAULT_VALUES}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {(form) => (
            <>
              <FieldGroup>
                <FormGroup columns={2}>
                  <FormInput
                    name="name"
                    label="Item Name"
                    placeholder="e.g. iPhone 15 Pro"
                    icon={<Box className="size-4" />}
                  />
                  <FormInput
                    name="sku"
                    label="Internal SKU"
                    placeholder="e.g. IPH-15-BLK"
                    icon={<QrCode className="size-4" />}
                  />
                </FormGroup>
              </FieldGroup>

              <FieldGroup>
                <FormGroup columns={2}>
                  <FormInput
                    name="unit"
                    label="Unit"
                    placeholder="e.g. pcs, kg, box"
                    icon={<Layers className="size-4" />}
                  />
                  <FormInput
                    name="minStock"
                    label="Min Stock Alert"
                    type="number"
                    icon={<Hash className="size-4" />}
                  />
                </FormGroup>
              </FieldGroup>

              <FormInput
                name="description"
                label="General Description"
                placeholder="Specifications..."
              />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <form.Subscribe selector={(s: any) => s.isSubmitting}>
                  {(isSubmitting: boolean) => (
                    <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                      {isSubmitting || createMutation.isPending ? (
                        <Loader2 className="animate-spin size-4 mr-2" />
                      ) : (
                        'Register Item'
                      )}
                    </Button>
                  )}
                </form.Subscribe>
              </DialogFooter>
            </>
          )}
        </AppForm>
      </DialogContent>
    </Dialog>
  );
}
