'use client';

import { JSX, useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Loader2,
  Plus,
  Box,
  Banknote,
  QrCode,
  Layers,
  DollarSign,
  Wrench,
  FileText,
  Tag,
  Info,
  Pencil,
} from 'lucide-react';
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
import { toSmallestUnit, cn, deformatMoney } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export const stockItemSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  type: z.enum(['PRODUCT', 'SERVICE']),
  description: z.string().optional(),
  purchasePrice: z.preprocess(
    (val) => Number(val),
    z.number().min(0, 'Purchase price cannot be negative'),
  ),
  salesPrice: z.preprocess(
    (val) => Number(val),
    z.number().min(0, 'Sales price cannot be negative'),
  ),
});

export type StockItemValues = z.infer<typeof stockItemSchema>;

interface CreateItemDialogProps {
  onSuccess?: (item: any) => void;
  children?: JSX.Element;
  item?: any; // If provided, the dialog acts as an edit dialog
}

export function CreateItemDialog({ children, onSuccess, item }: CreateItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'PRODUCT' | 'SERVICE'>(item?.type ?? 'PRODUCT');

  const utils = trpc.useUtils();
  const createMutation = trpc.items.create.useMutation();
  const updateMutation = trpc.items.update.useMutation();

  const isEdit = !!item;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<StockItemValues>({
    resolver: zodResolver(stockItemSchema) as any,
      defaultValues: {
        name: item?.name ?? '',
        sku: item?.sku ?? '',
        type: item?.type ?? 'PRODUCT',
        description: item?.description ?? '',
        purchasePrice: item ? Number(deformatMoney(Number(item.purchasePrice), 'BHD')) : 0,
        salesPrice: item ? Number(deformatMoney(Number(item.salesPrice), 'BHD')) : 0,
      },
    });
  
    useEffect(() => {
      if (item && open) {
        reset({
          name: item.name,
          sku: item.sku,
          type: item.type,
          description: item.description ?? '',
          purchasePrice: Number(deformatMoney(Number(item.purchasePrice), 'BHD')),
          salesPrice: Number(deformatMoney(Number(item.salesPrice), 'BHD')),
        });
        setActiveTab(item.type);
      } else if (!item && open) {
      reset({
        name: '',
        sku: '',
        type: 'PRODUCT',
        description: '',
        purchasePrice: 0,
        salesPrice: 0,
      });
      setActiveTab('PRODUCT');
    }
  }, [item, open, reset]);

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

    if (isEdit) {
      updateMutation.mutate(
        { id: item.id, ...data },
        {
          onSuccess: (updatedItem) => {
            utils.items.list.invalidate();
            setOpen(false);
            onSuccess?.(updatedItem);
            toast.success('Item updated successfully');
          },
          onError: (error) => {
            toast.error(`Update failed: ${error.message}`);
          },
        },
      );
    } else {
      createMutation.mutate(data as any, {
        onSuccess: (newItem) => {
          utils.items.list.invalidate();
          reset();
          setOpen(false);
          onSuccess?.(newItem);
          toast.success('Item created successfully');
        },
        onError: (error) => {
          toast.error(`Creation failed: ${error.message}`);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          children ?? (
            <Button
              variant={isEdit ? 'ghost' : 'default'}
              size={isEdit ? 'icon' : 'default'}
              className="gap-2 shadow-sm"
            >
              {isEdit ? <Pencil className="size-4" /> : <Plus className="size-4" />}
              {!isEdit && 'Add Master Item'}
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-xl border-none shadow-2xl bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              {isEdit ? <Pencil className="size-6" /> : <Box className="size-6" />}
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {isEdit ? 'Edit Item' : 'Item Master'}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'Update the details of this item.'
                  : 'Register a new product or service to your catalog.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            if (isEdit) return; // Don't allow changing type on edit
            const type = val as 'PRODUCT' | 'SERVICE';
            setActiveTab(type);
            setValue('type', type);
          }}
          className="mt-2"
        >
          <TabsList className="w-full grid grid-cols-2 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger
              value="PRODUCT"
              disabled={isEdit && activeTab !== 'PRODUCT'}
              className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Box className="size-4" /> Product
            </TabsTrigger>
            <TabsTrigger
              value="SERVICE"
              disabled={isEdit && activeTab !== 'SERVICE'}
              className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Wrench className="size-4" /> Service
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
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

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                className="min-w-40 rounded-xl shadow-lg shadow-primary/20"
              >
                {isSubmitting || createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="animate-spin size-4 mr-2" />
                ) : isEdit ? (
                  <Pencil className="size-4 mr-2" />
                ) : (
                  <Plus className="size-4 mr-2" />
                )}
                {isEdit
                  ? 'Update Item'
                  : `Register ${activeTab === 'PRODUCT' ? 'Product' : 'Service'}`}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1 rounded bg-muted text-muted-foreground">{icon}</div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
    </div>
  );
}

function ProductTab({ register, errors, activeTab, control }: any) {
  const handleGenerateSKU = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    const prefix = 'ITM';
    const generated = `${prefix}-${random}`;
    return generated;
  };

  if (activeTab !== 'PRODUCT') return null;

  return (
    <TabsContent value="PRODUCT" className="space-y-6 mt-0">
      <div>
        <SectionHeader title="General Information" icon={<Info className="size-3" />} />
        <div className="space-y-4">
          <Field data-invalid={!!errors.name}>
            <FieldLabel className="text-xs">Item Name</FieldLabel>
            <InputGroup className="bg-muted/30">
              <InputGroupInput
                {...register('name')}
                placeholder="Enter product name"
                className="bg-transparent border-none focus-visible:ring-0"
              />
              <InputGroupAddon className="bg-transparent border-none opacity-50">
                <Box className="size-4" />
              </InputGroupAddon>
            </InputGroup>
            <FieldError>{errors.name?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.description}>
            <FieldLabel className="text-xs">Description (Optional)</FieldLabel>
            <Input
              {...register('description')}
              placeholder="Briefly describe the item"
              className="bg-muted/30 border-none focus-visible:ring-1"
            />
            <FieldError>{errors.description?.message}</FieldError>
          </Field>
        </div>
      </div>

      <Separator className="opacity-50" />

      <div>
        <SectionHeader title="Pricing & Inventory" icon={<DollarSign className="size-3" />} />
        <FieldGroup className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.purchasePrice}>
            <FieldLabel className="text-xs">Cost Price</FieldLabel>
            <InputGroup className="bg-muted/30">
              <InputGroupInput
                type="number"
                step="0.001"
                {...register('purchasePrice')}
                placeholder="0.000"
                className="bg-transparent border-none focus-visible:ring-0"
              />
              <InputGroupAddon className="bg-transparent border-none text-xs font-mono opacity-50">
                BHD
              </InputGroupAddon>
            </InputGroup>
            <FieldError>{errors.purchasePrice?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.salesPrice}>
            <FieldLabel className="text-xs">Selling Price</FieldLabel>
            <InputGroup className="bg-muted/30">
              <InputGroupInput
                type="number"
                step="0.001"
                {...register('salesPrice')}
                placeholder="0.000"
                className="bg-transparent border-none focus-visible:ring-0"
              />
              <InputGroupAddon className="bg-transparent border-none text-xs font-mono opacity-50 text-primary font-bold">
                BHD
              </InputGroupAddon>
            </InputGroup>
            <FieldError>{errors.salesPrice?.message}</FieldError>
          </Field>
        </FieldGroup>

        <div className="mt-4">
          <Controller
            name="sku"
            control={control}
            render={({ field }) => (
              <Field data-invalid={!!errors.sku}>
                <FieldLabel className="text-xs">Internal SKU / Barcode</FieldLabel>
                <div className="relative">
                  <InputGroup className="bg-muted/30">
                    <InputGroupInput
                      {...field}
                      placeholder="e.g. ITM-1234"
                      className="bg-transparent border-none focus-visible:ring-0"
                    />
                    <InputGroupAddon className="bg-transparent border-none opacity-50">
                      <QrCode className="size-4" />
                    </InputGroupAddon>
                  </InputGroup>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-[10px] uppercase font-bold bg-background/50 hover:bg-background transition-colors border-none"
                    onClick={() => field.onChange(handleGenerateSKU())}
                  >
                    Generate
                  </Button>
                </div>
                <FieldError>{errors.sku?.message}</FieldError>
              </Field>
            )}
          />
        </div>
      </div>
    </TabsContent>
  );
}

function ServiceTab({ register, errors, activeTab }: any) {
  if (activeTab !== 'SERVICE') return null;

  return (
    <TabsContent value="SERVICE" className="space-y-6 mt-0">
      <div>
        <SectionHeader title="Service Details" icon={<Wrench className="size-3" />} />
        <div className="space-y-4">
          <Field data-invalid={!!errors.name}>
            <FieldLabel className="text-xs">Service Name</FieldLabel>
            <InputGroup className="bg-muted/30">
              <InputGroupInput
                {...register('name')}
                placeholder="Enter service name"
                className="bg-transparent border-none focus-visible:ring-0"
              />
              <InputGroupAddon className="bg-transparent border-none opacity-50">
                <FileText className="size-4" />
              </InputGroupAddon>
            </InputGroup>
            <FieldError>{errors.name?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.description}>
            <FieldLabel className="text-xs">Description (Optional)</FieldLabel>
            <Input
              {...register('description')}
              placeholder="What does this service include?"
              className="bg-muted/30 border-none focus-visible:ring-1"
            />
            <FieldError>{errors.description?.message}</FieldError>
          </Field>
        </div>
      </div>

      <Separator className="opacity-50" />

      <div>
        <SectionHeader title="Service Rate" icon={<DollarSign className="size-3" />} />
        <Field data-invalid={!!errors.salesPrice}>
          <FieldLabel className="text-xs">Standard Rate</FieldLabel>
          <InputGroup className="bg-muted/30">
            <InputGroupInput
              type="number"
              step="0.001"
              {...register('salesPrice')}
              placeholder="0.000"
              className="bg-transparent border-none focus-visible:ring-0"
            />
            <InputGroupAddon className="bg-transparent border-none text-xs font-mono text-primary font-bold">
              BHD
            </InputGroupAddon>
          </InputGroup>
          <FieldError>{errors.salesPrice?.message}</FieldError>
        </Field>
      </div>
    </TabsContent>
  );
}
