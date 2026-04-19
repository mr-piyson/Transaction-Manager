'use client';

import { JSX, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Box, Banknote, QrCode, Layers, DollarSign, Wrench } from 'lucide-react';
import { toast } from 'sonner';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { trpc } from '@/lib/trpc/client';
import { toSmallestUnit } from '@/lib/utils';

export const stockItemSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  type: z.enum(['PRODUCT', 'SERVICE']),
  description: z.string().optional(),
  purchasePrice: z.coerce.number().positive('Purchase price must be positive'),
  salesPrice: z.coerce.number().positive('Sales price must be positive'),
});

export type StockItemValues = z.infer<typeof stockItemSchema>;

interface CreateItemDialogProps {
  onSuccess?: (item: any) => void;
  children?: JSX.Element;
}

export function CreateItemDialog({ children, onSuccess }: CreateItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');

  const utils = trpc.useUtils();
  const createMutation = trpc.items.createItem.useMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StockItemValues>({
    defaultValues: {
      name: '',
      sku: '',
      barcode: '',
      type: 'PRODUCT',
      description: '',
      purchasePrice: 0,
      salesPrice: 0,
    },
  });

  const onSubmit = async (values: StockItemValues) => {
    const data = {
      ...values,
      type: activeTab,
      sku:
        values.sku ||
        (activeTab === 'SERVICE'
          ? `SVC-${Math.random().toString(36).substring(7).toUpperCase()}`
          : undefined),
      purchasePrice: toSmallestUnit(values.purchasePrice, 'BHD'),
      salesPrice: toSmallestUnit(values.salesPrice, 'BHD'),
    };

    createMutation.mutate(data as any, {
      onSuccess: (newItem) => {
        utils.items.getItems.invalidate();
        reset();
        setOpen(false);
        onSuccess?.(newItem);
        toast.success('Stock item created successfully');
      },
      onError: (error) => {
        toast.error(`Failed: ${error.message}`);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          children ?? (
            <Button variant="default" className="gap-2">
              <Plus className="size-4" />
              Add Master Item
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary text-2xl font-bold">
            <Box className="size-5" />
            Purchase New Item
          </DialogTitle>
          <DialogDescription>Register a new product or service.</DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            const type = val as 'PRODUCT' | 'SERVICE';
            setActiveTab(type);
            setValue('type', type);
          }}
        >
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="PRODUCT" className="gap-2">
              <Box className="size-4" /> Product
            </TabsTrigger>
            <TabsTrigger value="SERVICE" className="gap-2">
              <Wrench className="size-4" /> Service
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <ProductTab
              register={register}
              errors={errors}
              activeTab={activeTab}
              control={control}
            />
            <ServiceTab
              register={register}
              errors={errors}
              activeTab={activeTab}
              control={control}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className="min-w-36"
              >
                {isSubmitting || createMutation.isPending ? (
                  <Loader2 className="animate-spin size-4" />
                ) : (
                  `Register ${activeTab === 'PRODUCT' ? 'Product' : 'Service'}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ProductTab({ register, errors, activeTab, control }: any) {
  const handleGenerateSKU = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    const prefix = 'ITM';
    const generated = `${prefix}-${random}`;
    return generated;
  };
  return (
    <TabsContent value="PRODUCT" className="space-y-4 mt-0">
      {/* Name */}
      <Field data-invalid={!!errors.name}>
        <FieldLabel>Item Name</FieldLabel>
        <InputGroup>
          <InputGroupInput
            {...register('name')}
            placeholder={activeTab === 'PRODUCT' ? 'product name' : 'service name'}
          />
          <InputGroupAddon>
            <Box />
          </InputGroupAddon>
        </InputGroup>
        <FieldError>{errors.name?.message}</FieldError>
      </Field>

      {/* Group */}
      <FieldGroup className="grid grid-cols-2 gap-4">
        {/* Purchase Price */}
        <Field data-invalid={!!errors.purchasePrice}>
          <FieldLabel>Purchase Price</FieldLabel>
          <InputGroup>
            <InputGroupInput
              type="number"
              step="0.001"
              {...register('purchasePrice')}
              placeholder="0.000"
            />
            <InputGroupAddon>
              <Banknote />
            </InputGroupAddon>
          </InputGroup>
          <FieldError>{errors.purchasePrice?.message}</FieldError>
        </Field>

        {/* sales price */}
        <Field data-invalid={!!errors.salesPrice}>
          <FieldLabel>Sales Price</FieldLabel>
          <InputGroup>
            <InputGroupInput
              type="number"
              step="0.001"
              {...register('salesPrice')}
              placeholder="0.000"
            />
            <InputGroupAddon>
              <Banknote />
            </InputGroupAddon>
          </InputGroup>
          <FieldError>{errors.salesPrice?.message}</FieldError>
        </Field>
      </FieldGroup>

      {/* Description */}
      <FieldGroup className="grid grid-cols-2 gap-4">
        <Field data-invalid={!!errors.description}>
          <FieldLabel>Description</FieldLabel>
          <Input {...register('description')} placeholder="Details about this item..." />
          <FieldError>{errors.description?.message}</FieldError>
        </Field>
        <Controller
          name="sku"
          control={control}
          render={({ field }) => (
            <Field data-invalid={!!errors.sku}>
              <FieldLabel>Internal SKU</FieldLabel>
              <div className="relative">
                <InputGroup>
                  <InputGroupInput {...field} placeholder="e.g. IPH-1234" />
                  <InputGroupAddon>
                    <QrCode />
                  </InputGroupAddon>
                </InputGroup>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-[10px] uppercase font-bold text-primary"
                  onClick={() => field.onChange(handleGenerateSKU())}
                >
                  Auto
                </Button>
              </div>
              <FieldError>{errors.sku?.message}</FieldError>
            </Field>
          )}
        />
      </FieldGroup>
    </TabsContent>
  );
}

function ServiceTab({ register, errors, activeTab, control }: any) {
  return (
    <TabsContent value="SERVICE" className="space-y-4 mt-0">
      {/* Sales Price */}
      <Field data-invalid={!!errors.salesPrice}>
        {/* Name */}
        <Field data-invalid={!!errors.name}>
          <FieldLabel>Item Name</FieldLabel>
          <InputGroup>
            <InputGroupInput
              {...register('name')}
              placeholder={activeTab === 'PRODUCT' ? 'product name' : 'service name'}
            />
            <InputGroupAddon>
              <Box />
            </InputGroupAddon>
          </InputGroup>
          <FieldError>{errors.name?.message}</FieldError>
        </Field>

        {/* Service Rate */}
        <FieldLabel>{activeTab === 'PRODUCT' ? 'Sales Price' : 'Service Rate'}</FieldLabel>

        <InputGroup>
          <InputGroupInput
            type="number"
            step="0.001"
            {...register('salesPrice')}
            placeholder="0.000"
          />
          <InputGroupAddon>BHD</InputGroupAddon>
        </InputGroup>
        <FieldError>{errors.salesPrice?.message}</FieldError>
      </Field>

      {/* Description */}
      <Field data-invalid={!!errors.description}>
        <FieldLabel>Description</FieldLabel>
        <Input {...register('description')} placeholder="Details about this item..." />
        <FieldError>{errors.description?.message}</FieldError>
      </Field>
    </TabsContent>
  );
}
