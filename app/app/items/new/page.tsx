'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Header } from '@/app/app/App-Header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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

type FormValues = z.infer<typeof schema>;

function defaults(): FormValues {
  return {
    type: 'PRODUCT',
    sku: '',
    barcode: undefined,
    name: '',
    description: undefined,
    unit: 'pcs',
    isSaleable: true,
    isPurchasable: true,
    purchasePrice: 0,
    salesPrice: 0,
    minStock: 0,
    reorderPoint: 0,
    reorderQty: 0,
    categoryId: undefined,
    taxRateId: undefined,
  };
}

function ValidationAlert({ errors }: { errors: Partial<Record<keyof FormValues, { message?: string }>> }) {
  const messages = Object.values(errors).map((e) => e?.message).filter(Boolean) as string[];
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

export default function NewItemPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: categories, isLoading: catLoading } = trpc.items.list.useQuery({ limit: 200 });
  const { data: taxRates, isLoading: taxLoading } = trpc.settings.taxRates.list.useQuery();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(),
  });

  const selectedType = watch('type');
  const isService = selectedType === 'SERVICE';
  const isProduct = selectedType === 'PRODUCT';

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
      router.push('/app/items');
    },
    onError(err) {
      toast.error('Failed to create item', { description: err.message });
    },
  });

  const isPending = isSubmitting || createMutation.isPending;
  const hasErrors = Object.keys(errors).length > 0;

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const rest = { ...values };
    if (isService) {
      rest.purchasePrice = 0;
      rest.minStock = 0;
      rest.reorderPoint = 0;
      rest.reorderQty = 0;
    }
    createMutation.mutate(rest);
  };

  const categoryList = Array.isArray(categories) ? categories : (categories?.data ?? []);
  const taxRateList = Array.isArray(taxRates) ? taxRates : [];

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
              <Link href="/app/items" className="hover:text-foreground transition-colors">Items</Link>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-foreground font-medium">New</span>
            </nav>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl p-4 md:p-8 space-y-6">
          {hasErrors && <ValidationAlert errors={errors as any} />}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label htmlFor="type">
                        Type <span className="text-destructive">*</span>
                      </Label>
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
                      <Label htmlFor="unit">
                        Unit <span className="text-destructive">*</span>
                      </Label>
                      <Input id="unit" placeholder="pcs, kg, hr" {...register('unit')} />
                      {errors.unit && <p className="text-xs text-destructive mt-1">{errors.unit.message}</p>}
                    </Field>
                  </div>

                  <Field>
                    <Label htmlFor="name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input id="name" placeholder="Item name" aria-invalid={!!errors.name} {...register('name')} />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                  </Field>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label htmlFor="sku">
                        SKU <span className="text-destructive">*</span>
                      </Label>
                      <Input id="sku" placeholder="SKU-001" aria-invalid={!!errors.sku} {...register('sku')} />
                      {errors.sku && <p className="text-xs text-destructive mt-1">{errors.sku.message}</p>}
                    </Field>
                    <Field>
                      <Label htmlFor="barcode">Barcode</Label>
                      <Input id="barcode" placeholder="EAN/UPC" {...register('barcode')} />
                    </Field>
                  </div>

                  <Field>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" className="resize-none" rows={2} {...register('description')} />
                  </Field>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Pricing & Stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isProduct && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field>
                          <Label htmlFor="purchasePrice">Purchase Price</Label>
                          <Input id="purchasePrice" type="number" min={0} step="0.001" {...register('purchasePrice')} />
                          <p className="text-xs text-muted-foreground mt-1">Cost per unit from suppliers</p>
                        </Field>
                        <Field>
                          <Label htmlFor="salesPrice">Sales Price</Label>
                          <Input id="salesPrice" type="number" min={0} step="0.001" {...register('salesPrice')} />
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field>
                          <Label htmlFor="minStock">Min Stock Level</Label>
                          <Input id="minStock" type="number" min={0} {...register('minStock')} />
                        </Field>
                        <Field>
                          <Label htmlFor="reorderPoint">Reorder At</Label>
                          <Input id="reorderPoint" type="number" min={0} {...register('reorderPoint')} />
                        </Field>
                        <Field>
                          <Label htmlFor="reorderQty">Reorder Qty</Label>
                          <Input id="reorderQty" type="number" min={0} {...register('reorderQty')} />
                        </Field>
                      </div>
                    </>
                  )}

                  {isService && (
                    <Field>
                      <Label htmlFor="salesPrice">Sales Price</Label>
                      <Input id="salesPrice" type="number" min={0} step="0.001" {...register('salesPrice')} />
                    </Field>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Classification & Flags
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label htmlFor="categoryId">Category</Label>
                      <Select onValueChange={(v) => setValue('categoryId', v)} disabled={catLoading}>
                        <SelectTrigger>
                          <SelectValue placeholder={catLoading ? 'Loading...' : 'Select category'} />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryList.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <Label htmlFor="taxRateId">Tax Rate</Label>
                      <Select onValueChange={(v) => setValue('taxRateId', v)} disabled={taxLoading}>
                        <SelectTrigger>
                          <SelectValue placeholder={taxLoading ? 'Loading...' : 'Select tax rate'} />
                        </SelectTrigger>
                        <SelectContent>
                          {taxRateList.map((tr: any) => (
                            <SelectItem key={tr.id} value={tr.id}>{tr.name} ({Number(tr.rate)}%)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="flex flex-wrap gap-6 pt-2">
                    <div className="flex items-center gap-3">
                      <Checkbox id="isSaleable" checked={watch('isSaleable')} onCheckedChange={(checked) => setValue('isSaleable', checked === true)} />
                      <div>
                        <Label htmlFor="isSaleable" className="text-sm font-normal cursor-pointer">Sellable</Label>
                        <p className="text-xs text-muted-foreground">Available for sale to customers</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox id="isPurchasable" checked={watch('isPurchasable')} onCheckedChange={(checked) => setValue('isPurchasable', checked === true)} />
                      <div>
                        <Label htmlFor="isPurchasable" className="text-sm font-normal cursor-pointer">Purchasable</Label>
                        <p className="text-xs text-muted-foreground">Can be ordered from suppliers</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="sticky bottom-0 mt-6 -mx-4 md:-mx-8 p-4 md:p-6 bg-background/95 backdrop-blur-md border-t flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="min-w-32">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Item
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
