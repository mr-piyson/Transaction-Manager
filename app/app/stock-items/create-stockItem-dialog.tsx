'use client';

import * as z from 'zod';
import { useState } from 'react';
import { Loader2, Plus, Box, Banknote, QrCode, Hash, Layers, DollarSign } from 'lucide-react';
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

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toSmallestUnit } from '@/lib/utils';

export const stockItemSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  sku: z.string().min(3, 'SKU is required').optional().or(z.literal('')),
  barcode: z.string().optional(),
  type: z.enum(['PRODUCT', 'SERVICE']),
  description: z.string().optional(),
  unit: z.string().default('pcs'),
  minStock: z.coerce.number().int().default(0),
  purchasePrice: z.coerce.number().min(0, 'Purchase price must be positive'),
  salesPrice: z.coerce.number().min(0, 'Sales price must be positive'),
});

type StockItemValues = z.infer<typeof stockItemSchema>;

const DEFAULT_VALUES: StockItemValues = {
  name: '',
  sku: '',
  barcode: '',
  type: 'PRODUCT',
  description: '',
  unit: 'pcs',
  minStock: 0,
  purchasePrice: 0,
  salesPrice: 0,
};

export function CreateStockItemDialog({ onSuccess }: { onSuccess?: (item: any) => void }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const utils = trpc.useUtils();
  const createMutation = trpc.stockItems.createStockItem.useMutation();

  const generateSKU = (form: any) => {
    const name = form.getFieldValue('name') || '';
    const random = Math.floor(1000 + Math.random() * 9000);
    const prefix = name
      .slice(0, 3)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const generated = `${prefix || 'ITEM'}-${random}`;
    form.setFieldValue('sku', generated);
    if (!form.getFieldValue('barcode')) {
      form.setFieldValue('barcode', generated.replace(/-/g, ''));
    }
  };

  async function handleSubmit(values: StockItemValues) {
    try {
      // Convert display prices to database units (fils)
      const data = {
        ...values,
        type: activeTab,
        sku: values.sku || `SVC-${Math.random().toString(36).substring(7).toUpperCase()}`,
        purchasePrice: toSmallestUnit(values.purchasePrice, 'BHD'),
        salesPrice: toSmallestUnit(values.salesPrice, 'BHD'),
      };

      const newItem = await createMutation.mutateAsync(data as any);
      utils.stockItems.getStockItems.invalidate();
      setOpen(false);
      onSuccess?.(newItem);
      toast.success('Stock item created successfully');
    } catch (error: any) {
      toast.error('Failed to create stock item: ' + error.message);
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

      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-primary font-bold">
            <Box className="size-5" />
            New Master Item
          </DialogTitle>
          <DialogDescription>
            Register a new product or service in the master catalog.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as any)}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-6">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="PRODUCT" className="gap-2">
                <Box className="size-4" />
                Product
              </TabsTrigger>
              <TabsTrigger value="SERVICE" className="gap-2">
                <Layers className="size-4" />
                Service
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 pt-2">
            <AppForm
              schema={stockItemSchema}
              defaultValues={{ ...DEFAULT_VALUES, type: activeTab }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {(form) => (
                <>
                  <TabsContent value="PRODUCT" className="space-y-6 mt-0">
                    <FieldGroup>
                      <FormGroup columns={2}>
                        <FormInput
                          name="name"
                          label="Product Name"
                          placeholder="e.g. iPhone 15 Pro"
                          icon={<Box className="size-4" />}
                        />
                        <div className="relative">
                          <FormInput
                            name="sku"
                            label="Internal SKU"
                            placeholder="e.g. IPH-15-PRO"
                            icon={<QrCode className="size-4" />}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-6 text-[10px] uppercase font-bold text-primary hover:bg-primary/10"
                            onClick={() => generateSKU(form)}
                          >
                            Auto
                          </Button>
                        </div>
                      </FormGroup>
                    </FieldGroup>

                    <FieldGroup>
                      <FormGroup columns={2}>
                        <FormInput
                          name="purchasePrice"
                          label="Purchase Price"
                          type="number"
                          icon={<Banknote className="size-4" />}
                        />
                        <FormInput
                          name="salesPrice"
                          label="Sales Price"
                          type="number"
                          icon={<DollarSign className="size-4" />}
                        />
                      </FormGroup>
                    </FieldGroup>
                  </TabsContent>

                  <TabsContent value="SERVICE" className="space-y-6 mt-0">
                    <FormInput
                      name="name"
                      label="Service Name"
                      placeholder="e.g. Consulting, Installation"
                      icon={<Layers className="size-4" />}
                    />

                    <FormInput
                      name="salesPrice"
                      label="Service Rate / Fee"
                      type="number"
                      icon={<DollarSign className="size-4" />}
                    />
                  </TabsContent>

                  <FormInput
                    name="description"
                    label="Description"
                    placeholder="Details about this item..."
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
                            `Register ${activeTab === 'PRODUCT' ? 'Product' : 'Service'}`
                          )}
                        </Button>
                      )}
                    </form.Subscribe>
                  </DialogFooter>
                </>
              )}
            </AppForm>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
