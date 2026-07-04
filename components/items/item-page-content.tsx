'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Box,
  Camera,
  Check,
  Cuboid,
  Download,
  Edit,
  ExternalLink,
  Hash,
  Info,
  Layers,
  Loader2,
  Maximize2,
  Package,
  Printer,
  QrCode,
  Save,
  Scale,
  ShoppingCart,
  Tag,
  Trash,
  Truck,
  Upload,
  Wand2,
  Weight,
  Wrench,
  X,
} from 'lucide-react';
import Barcode from 'react-barcode';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
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
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { itemFormSchema, getItemFormDefaults } from '@/lib/validations/item';
import type { ItemFormValues } from '@/lib/validations/item';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ItemPageContentProps {
  item?: Record<string, any>;
  defaultMode?: 'view' | 'edit';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_CONFIG = {
  PRODUCT: {
    icon: Box,
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  },
  SERVICE: {
    icon: Wrench,
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  },
} as const;

function StockLevelIndicator({
  current,
  reorderPoint,
  minStock,
}: {
  current: number;
  reorderPoint: number;
  minStock: number;
}) {
  if (current <= 0) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="size-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-xs font-medium text-destructive">Out of stock</span>
      </div>
    );
  }
  if (current <= minStock) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="size-2 rounded-full bg-destructive" />
        <span className="text-xs font-medium text-destructive">Below minimum</span>
      </div>
    );
  }
  if (current <= reorderPoint) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="size-2 rounded-full bg-yellow-500" />
        <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
          Reorder soon
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="size-2 rounded-full bg-green-500" />
      <span className="text-xs font-medium text-green-600 dark:text-green-400">In stock</span>
    </div>
  );
}

function downloadImage(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

// ---------------------------------------------------------------------------
// ItemPageContent
// ---------------------------------------------------------------------------

export function ItemPageContent({ item, defaultMode }: ItemPageContentProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useTranslations();
  const isCreate = !item;
  const [isEditing, setIsEditing] = React.useState(defaultMode === 'edit' || isCreate);
  const { data: categories } = trpc.items.list.useQuery({ limit: 200 });
  const { data: categoryTree } = trpc.categories.listTree.useQuery();
  const { data: taxRates } = trpc.settings.taxRates.list.useQuery();
  const generateSku = trpc.categories.generateSku.useMutation();
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const barcodeRef = React.useRef<HTMLDivElement>(null);

  const families = categoryTree ?? [];
  const { data: units } = trpc.units.list.useQuery();

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema) as any,
    defaultValues: getItemFormDefaults(
      item
        ? {
            type: item.type as 'PRODUCT' | 'SERVICE',
            sku: item.sku,
            barcode: item.barcode ?? undefined,
            name: item.name,
            description: item.description ?? undefined,
            image: item.image ?? undefined,
            unit: item.unit,
            isSaleable: item.isSaleable,
            isPurchasable: item.isPurchasable,
            purchasePrice: Number(item.purchasePrice),
            salesPrice: Number(item.salesPrice),
            minStock: item.minStock,
            reorderPoint: item.reorderPoint,
            reorderQty: item.reorderQty,
            categoryId: item.categoryId ?? undefined,
            familyId: item.family?.id ?? undefined,
            classId: item.class?.id ?? undefined,
            commodityId: item.commodity?.id ?? undefined,
            taxRateId: item.taxRateId ?? undefined,
          }
        : undefined,
    ),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const selectedType = watch('type');
  const selectedFamilyId = watch('familyId');
  const selectedClassId = watch('classId');
  const currentImage = watch('image');
  const isService = selectedType === 'SERVICE';
  const isProduct = selectedType === 'PRODUCT';

  const selectedFamily = families.find((f: any) => f.id === selectedFamilyId);
  const classes = (selectedFamily as any)?.classes ?? [];
  const selectedClass = classes.find((c: any) => c.id === selectedClassId);
  const commodities = (selectedClass as any)?.commodities ?? [];

  React.useEffect(() => {
    if (!selectedFamilyId) {
      setValue('classId', undefined);
      setValue('commodityId', undefined);
    }
  }, [selectedFamilyId, setValue]);

  React.useEffect(() => {
    if (!selectedClassId) {
      setValue('commodityId', undefined);
    }
  }, [selectedClassId, setValue]);

  React.useEffect(() => {
    if (commodities.length === 1) {
      setValue('commodityId', commodities[0].id);
    }
  }, [commodities, setValue]);

  const createMutation = trpc.items.create.useMutation({
    onSuccess(data) {
      utils.items.list.invalidate();
      toast.success('Item created', { description: data.name });
      router.push(`/erp/items/${data.id}`);
    },
    onError(err) {
      toast.error('Failed to create item', { description: err.message });
    },
  });

  const updateMutation = trpc.items.update.useMutation({
    onSuccess(data) {
      utils.items.list.invalidate();
      utils.items.byId.invalidate({ id: data.id });
      toast.success('Item updated', { description: data.name });
      setIsEditing(false);
    },
    onError(err) {
      toast.error('Failed to update item', { description: err.message });
    },
  });

  const deleteMutation = trpc.items.delete.useMutation({
    onSuccess: () => {
      utils.items.list.invalidate();
      toast.success(t('items.itemDeleted'));
      router.push('/erp/items');
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending =
    isSubmitting || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

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

  const handleGenerateSku = () => {
    const familyCode = (selectedFamily as any)?.code;
    const classCode = (selectedClass as any)?.code;
    generateSku.mutate(
      { familyCode, classCode },
      {
        onSuccess: (data) => setValue('sku', data.sku),
        onError: (err) => toast.error('Failed to generate SKU', { description: err.message }),
      },
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setValue('image', data.storagePath);
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setValue('image', undefined);
  };

  const startEdit = () => {
    if (item) {
      reset(
        getItemFormDefaults({
          type: item.type as 'PRODUCT' | 'SERVICE',
          sku: item.sku,
          barcode: item.barcode ?? undefined,
          name: item.name,
          description: item.description ?? undefined,
          image: item.image ?? undefined,
          unit: item.unit,
          isSaleable: item.isSaleable,
          isPurchasable: item.isPurchasable,
          purchasePrice: Number(item.purchasePrice),
          salesPrice: Number(item.salesPrice),
          minStock: item.minStock,
          reorderPoint: item.reorderPoint,
          reorderQty: item.reorderQty,
          categoryId: item.categoryId ?? undefined,
          familyId: item.family?.id ?? undefined,
          classId: item.class?.id ?? undefined,
          commodityId: item.commodity?.id ?? undefined,
          taxRateId: item.taxRateId ?? undefined,
        }),
      );
    }
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (isCreate) {
      router.push('/erp/items');
      return;
    }
    reset(
      getItemFormDefaults({
        type: item!.type as 'PRODUCT' | 'SERVICE',
        sku: item!.sku,
        barcode: item!.barcode ?? undefined,
        name: item!.name,
        description: item!.description ?? undefined,
        image: item!.image ?? undefined,
        unit: item!.unit,
        isSaleable: item!.isSaleable,
        isPurchasable: item!.isPurchasable,
        purchasePrice: Number(item!.purchasePrice),
        salesPrice: Number(item!.salesPrice),
        minStock: item!.minStock,
        reorderPoint: item!.reorderPoint,
        reorderQty: item!.reorderQty,
        categoryId: item!.categoryId ?? undefined,
        familyId: item!.family?.id ?? undefined,
        classId: item!.class?.id ?? undefined,
        commodityId: item!.commodity?.id ?? undefined,
        taxRateId: item!.taxRateId ?? undefined,
      }),
    );
    setIsEditing(false);
  };

  const onSubmit: SubmitHandler<ItemFormValues> = (values) => {
    if (isService) {
      values.purchasePrice = 0;
      values.minStock = 0;
      values.reorderPoint = 0;
      values.reorderQty = 0;
    }

    if (!isCreate && item?.id) {
      updateMutation.mutate({ id: item.id, ...values });
    } else {
      createMutation.mutate(values as any);
    }
  };

  const handleDelete = () => {
    if (!item) return;
    alert.delete({
      title: t('common.confirmDelete'),
      description: t('items.deactivateRestoreConfirm'),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        await deleteMutation.mutateAsync({ id: item.id });
      },
    });
  };

  const handleDownloadBarcode = () => {
    const svg = barcodeRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    downloadImage(url, `${item?.sku ?? 'barcode'}.svg`);
    URL.revokeObjectURL(url);
  };

  const handlePrintBarcode = () => {
    const svg = barcodeRef.current?.querySelector('svg');
    if (!svg) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      `<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh">${svg.outerHTML}</body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  };

  if (!item && !isCreate) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{t('common.notFound')}</EmptyTitle>
            <EmptyDescription>{t('items.doesNotExist')}</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => router.push('/erp/items')}>
            <ArrowLeft className="size-4 mr-1" /> {t('common.back')}
          </Button>
        </Empty>
      </div>
    );
  }

  const totalStock =
    item?.stock?.reduce((sum: number, s: any) => sum + Number(s.quantity), 0) ?? 0;
  const typeConfig = item
    ? TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.PRODUCT
    : TYPE_CONFIG.PRODUCT;
  const TypeIcon = typeConfig.icon;

  const v = (val: any) => (val !== undefined && val !== null ? val : '—');

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="flex items-center gap-2 px-3 h-14 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => {
              if (isEditing) {
                cancelEdit();
              } else {
                router.push('/erp/items');
              }
            }}
          >
            <ArrowLeft className="size-5" />
          </Button>

          {isEditing ? (
            /* ── Edit/Create header (simple — inputs in body) ── */
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-semibold">
                {isCreate ? 'New Item' : 'Edit Item'}
              </h1>
            </div>
          ) : item ? (
            /* ── View header ── */
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative shrink-0">
                <div className="size-10 sm:size-12 rounded-xl flex items-center justify-center overflow-hidden bg-muted border">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="size-full object-cover" />
                  ) : (
                    <TypeIcon className="size-5 sm:size-6 text-muted-foreground" />
                  )}
                </div>
                {!item.isActive && (
                  <div className="absolute -top-1 -right-1 size-4 rounded-full bg-gray-500 border-2 border-background flex items-center justify-center">
                    <span className="size-1.5 rounded-full bg-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-semibold truncate">{item.name}</h1>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] sm:text-xs font-medium shrink-0',
                      typeConfig.className,
                    )}
                  >
                    {t(`items.types.${item.type}`)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Hash className="size-3" />
                    {item.sku}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={cancelEdit} disabled={isPending}>
                  <X className="size-4 mr-1.5" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmit(onSubmit)} disabled={isPending}>
                  {isPending && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                  <Save className="size-4 mr-1.5" />
                  {isCreate ? 'Create' : 'Save'}
                </Button>
              </>
            ) : (
              item && (
                <>
                  <Button variant="outline" size="sm" onClick={startEdit}>
                    <Edit className="size-4 mr-1.5" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
                    <Trash className="size-4 mr-1.5" />
                    Delete
                  </Button>
                </>
              )
            )}
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
          {isEditing ? (
            /* ══════════════════ EDIT MODE ══════════════════ */
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="space-y-6">
                {/* Basic Info — Name, Type, SKU, Unit */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Basic Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          placeholder="Item name"
                          aria-invalid={!!errors.name}
                          {...register('name')}
                        />
                      </Field>
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
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field>
                        <Label htmlFor="sku">SKU *</Label>
                        <div className="flex gap-2">
                          <Input
                            id="sku"
                            placeholder="SKU-001"
                            aria-invalid={!!errors.sku}
                            {...register('sku')}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleGenerateSku}
                            disabled={generateSku.isPending}
                            title="Auto-generate SKU"
                          >
                            {generateSku.isPending ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Wand2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </Field>
                      <Field>
                        <Label htmlFor="unit">Unit *</Label>
                        <Select
                          value={watch('unitId') ?? ''}
                          onValueChange={(v) => {
                            setValue('unitId', v || undefined);
                            const unit = (Array.isArray(units) ? units : []).find((u: any) => u.id === v);
                            if (unit) setValue('unit', unit.code);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {(Array.isArray(units) ? units : []).map((u: any) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.code} — {u.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <Label htmlFor="salesPrice" className="text-xs font-medium text-muted-foreground">
                        {t('items.salesPrice')}
                      </Label>
                      <Input
                        id="salesPrice"
                        type="number"
                        min={0}
                        step="0.001"
                        {...register('salesPrice')}
                        className="mt-1 text-2xl font-bold h-10"
                      />
                    </CardContent>
                  </Card>
                  {isProduct && (
                    <Card>
                      <CardContent className="p-4">
                        <Label htmlFor="purchasePrice" className="text-xs font-medium text-muted-foreground">
                          {t('items.purchasePrice')}
                        </Label>
                        <Input
                          id="purchasePrice"
                          type="number"
                          min={0}
                          step="0.001"
                          {...register('purchasePrice')}
                          className="mt-1 text-2xl font-bold h-10"
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Image & Barcode */}
                <Card>
                  <CardContent className="p-4">
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Image
                    </Label>
                    <div className="flex items-start gap-3">
                      {currentImage ? (
                        <div className="relative size-32 shrink-0 rounded-md border overflow-hidden">
                          <img src={currentImage} alt="" className="size-full object-cover" />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-1 right-1 size-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="size-32 shrink-0 rounded-md border border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 transition-colors"
                        >
                          {uploading ? (
                            <Loader2 className="size-6 animate-spin" />
                          ) : (
                            <Upload className="size-6" />
                          )}
                          <span className="text-xs">Upload</span>
                        </button>
                      )}
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="barcode">{t('items.barcode')}</Label>
                        <Input
                          id="barcode"
                          placeholder="EAN/UPC"
                          {...register('barcode')}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Description */}
                <Card>
                  <CardContent className="p-4">
                    <Label htmlFor="description" className="text-xs font-medium text-muted-foreground mb-2 block">
                      {t('common.description')}
                    </Label>
                    <Textarea
                      id="description"
                      className="resize-none"
                      rows={3}
                      {...register('description')}
                    />
                  </CardContent>
                </Card>

                {/* Stock Fields (Product only) */}
                {isProduct && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Box className="size-5 text-muted-foreground" />
                        {t('items.stockReorder')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <Field>
                          <Label htmlFor="minStock">{t('items.minStock')}</Label>
                          <Input id="minStock" type="number" min={0} {...register('minStock')} />
                        </Field>
                        <Field>
                          <Label htmlFor="reorderPoint">{t('items.reorderAt')}</Label>
                          <Input id="reorderPoint" type="number" min={0} {...register('reorderPoint')} />
                        </Field>
                        <Field>
                          <Label htmlFor="reorderQty">{t('items.reorderQty')}</Label>
                          <Input id="reorderQty" type="number" min={0} {...register('reorderQty')} />
                        </Field>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 3-Layer Category */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('items.category')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <Field>
                        <Label>Family</Label>
                        <Select
                          value={selectedFamilyId ?? ''}
                          onValueChange={(v) => setValue('familyId', v || undefined)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select family" />
                          </SelectTrigger>
                          <SelectContent>
                            {families.map((f: any) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.code} — {f.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <Label>Class</Label>
                        <Select
                          value={selectedClassId ?? ''}
                          onValueChange={(v) => setValue('classId', v || undefined)}
                          disabled={!selectedFamilyId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={selectedFamilyId ? 'Select class' : 'Select family first'} />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.code} — {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <Label>Commodity</Label>
                        <Select
                          value={watch('commodityId') ?? ''}
                          onValueChange={(v) => setValue('commodityId', v || undefined)}
                          disabled={!selectedClassId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={selectedClassId ? 'Select commodity' : 'Select class first'} />
                          </SelectTrigger>
                          <SelectContent>
                            {commodities.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.code} — {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </CardContent>
                </Card>

                {/* Category + Tax */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                        {t('items.category')}
                      </Label>
                      <Select onValueChange={(v) => setValue('categoryId', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Array.isArray(categories) ? categories : categories?.data ?? []).map(
                            (cat: any) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                        {t('common.tax')}
                      </Label>
                      <Select onValueChange={(v) => setValue('taxRateId', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tax rate" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Array.isArray(taxRates) ? taxRates : []).map((tr: any) => (
                            <SelectItem key={tr.id} value={tr.id}>
                              {tr.name} ({Number(tr.rate)}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                </div>

                {/* Flags */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('items.flags')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <Toggle
                        pressed={watch('isSaleable')}
                        onPressedChange={(pressed) => setValue('isSaleable', pressed)}
                        variant="outline"
                        aria-label="Toggle saleable"
                      >
                        <Tag className="size-4 mr-2" />
                        {t('items.saleable')}
                      </Toggle>
                      <Toggle
                        pressed={watch('isPurchasable')}
                        onPressedChange={(pressed) => setValue('isPurchasable', pressed)}
                        variant="outline"
                        aria-label="Toggle purchasable"
                      >
                        <ShoppingCart className="size-4 mr-2" />
                        {t('items.purchasable')}
                      </Toggle>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </form>
          ) : item ? (
            /* ══════════════════ VIEW MODE ══════════════════ */
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="bg-linear-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30 border-green-200/50 dark:border-green-800/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="size-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                        <ShoppingCart className="size-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">
                        {t('items.salesPrice')}
                      </span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-green-900 dark:text-green-100">
                      {Number(item.salesPrice).toFixed(3)}
                    </p>
                  </CardContent>
                </Card>

                {!isService && (
                  <Card className="bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200/50 dark:border-blue-800/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                          <Tag className="size-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                          {t('items.purchasePrice')}
                        </span>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">
                        {Number(item.purchasePrice).toFixed(3)}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {!isService && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {t('items.totalStock')}
                        </span>
                        <StockLevelIndicator
                          current={totalStock}
                          reorderPoint={item.reorderPoint}
                          minStock={item.minStock}
                        />
                      </div>
                      <p
                        className={cn(
                          'text-2xl sm:text-3xl font-bold',
                          totalStock <= item.reorderPoint && totalStock > 0
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : totalStock === 0
                              ? 'text-destructive'
                              : '',
                        )}
                      >
                        {totalStock}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{item.unit}</p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                        <Scale className="size-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {t('common.tax')}
                      </span>
                    </div>
                    <p className="text-lg font-semibold">{item.taxRate?.name ?? '—'}</p>
                    {item.taxRate && (
                      <p className="text-xs text-muted-foreground">{Number(item.taxRate.rate)}%</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Image & Barcode */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 overflow-hidden">
                  <CardContent className="p-0">
                    {item.image ? (
                      <div className="relative aspect-16/10 bg-card">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-end p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="backdrop-blur-sm"
                              onClick={() => window.open(item.image, '_blank')}
                            >
                              <Maximize2 className="size-4 mr-1" />
                              View Full
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="backdrop-blur-sm"
                              onClick={() =>
                                downloadImage(
                                  item.image!,
                                  `${item.sku}.${item.image!.split('.').pop() ?? 'jpg'}`,
                                )
                              }
                            >
                              <Download className="size-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-16/10 bg-card flex flex-col items-center justify-center gap-4">
                        <div className="size-24 rounded-2xl bg-background/80 flex items-center justify-center border-2 border-dashed border-muted-foreground/25">
                          <TypeIcon className="size-12 text-muted-foreground/50" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">
                            No image uploaded
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            Click edit to add a product image
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={startEdit}>
                          <Camera className="size-4 mr-1.5" />
                          Add Image
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <QrCode className="size-5 text-muted-foreground" />
                          Barcode
                        </CardTitle>
                        {item.barcode && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={handlePrintBarcode}
                            >
                              <Printer className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={handleDownloadBarcode}
                            >
                              <Download className="size-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {item.barcode ? (
                        <div className="flex flex-col items-center gap-3" ref={barcodeRef}>
                          <div className="flex items-center justify-center w-full p-4 bg-white rounded-lg border">
                            <Barcode
                              value={item.barcode}
                              format="CODE128"
                              width={1.5}
                              height={60}
                              displayValue={true}
                              font="monospace"
                              fontSize={12}
                              textMargin={4}
                              background="transparent"
                              lineColor="#000000"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{item.barcode}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 py-4">
                          <div className="w-full p-4 bg-muted/50 rounded-lg border border-dashed">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <div className="size-12 rounded-lg bg-background flex items-center justify-center">
                                <Barcode
                                  value="N/A"
                                  format="CODE128"
                                  width={1}
                                  height={40}
                                  displayValue={false}
                                  background="transparent"
                                  lineColor="currentColor"
                                />
                              </div>
                              <p className="text-xs">No barcode</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={startEdit}>
                            <Hash className="size-4 mr-1.5" />
                            Add Barcode
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Tag className="size-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">SKU</p>
                          <p className="font-mono font-semibold truncate">{item.sku}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Related Records */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => router.push(`/erp/invoices?itemId=${item.id}`)}
                  className="group"
                >
                  <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            {t('layout.invoices')}
                          </p>
                          <p className="text-3xl font-bold">{item._count?.invoiceLines ?? 0}</p>
                          <p className="text-xs text-muted-foreground">{t('items.invoiceLines')}</p>
                        </div>
                        <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </button>

                <button
                  onClick={() => router.push(`/erp/purchase-orders?itemId=${item.id}`)}
                  className="group"
                >
                  <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                            {t('layout.purchaseOrders')}
                          </p>
                          <p className="text-3xl font-bold">{item._count?.purchaseLines ?? 0}</p>
                          <p className="text-xs text-muted-foreground">{t('items.poLines')}</p>
                        </div>
                        <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {!isService && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Box className="size-5 text-muted-foreground" />
                          {t('items.stockReorder')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">
                              {t('items.minStock')}
                            </p>
                            <p className="text-lg font-semibold">{item.minStock}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">
                              {t('items.reorderAt')}
                            </p>
                            <p className="text-lg font-semibold">{item.reorderPoint}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">
                              {t('items.reorderQty')}
                            </p>
                            <p className="text-lg font-semibold">{item.reorderQty}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">
                              {t('items.avgCost')}
                            </p>
                            <p className="text-lg font-semibold">
                              {Number(item.averageCost).toFixed(3)}
                            </p>
                          </div>
                        </div>

                        <Separator />

                        {item.stock && item.stock.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-3">{t('items.perWarehouse')}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {item.stock.map((s: any) => (
                                <div
                                  key={s.warehouse.id}
                                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                                >
                                  <div className="flex items-center gap-2">
                                    <Layers className="size-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">
                                      {s.warehouse.name}
                                    </span>
                                  </div>
                                  <span
                                    className={cn(
                                      'font-semibold',
                                      Number(s.quantity) <= 0 ? 'text-destructive' : '',
                                    )}
                                  >
                                    {Number(s.quantity)} {item.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {isService && (
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-center">
                        <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                          <Info className="size-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t('items.notStockTracked')}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {item.description && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Info className="size-5 text-muted-foreground" />
                          {t('common.description')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {item.description}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('items.attributes')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{t('items.unit')}</span>
                          <span className="text-sm font-medium">{item.unit}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t('items.category')}
                          </span>
                          <span className="text-sm font-medium">
                            {item.category?.name ?? '—'}
                          </span>
                        </div>
                        {item.family && (
                          <>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {t('items.family')}
                              </span>
                              <span className="text-sm font-medium">{item.family.name}</span>
                            </div>
                          </>
                        )}
                        {item.class && (
                          <>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {t('items.class')}
                              </span>
                              <span className="text-sm font-medium">{item.class.name}</span>
                            </div>
                          </>
                        )}
                        {item.commodity && (
                          <>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {t('items.commodity')}
                              </span>
                              <span className="text-sm font-medium">{item.commodity.name}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {!isService && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{t('items.flags')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <span className="text-sm">{t('items.saleable')}</span>
                          <div
                            className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              item.isSaleable
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                            )}
                          >
                            {item.isSaleable ? 'Yes' : 'No'}
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <span className="text-sm">{t('items.purchasable')}</span>
                          <div
                            className={cn(
                              'px-2 py-0.5 rounded-full text-xs font-medium',
                              item.isPurchasable
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                            )}
                          >
                            {item.isPurchasable ? 'Yes' : 'No'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {(item.weightKg || item.widthCm) && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{t('items.dimensions')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {item.weightKg && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="size-8 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                              <Weight className="size-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {Number(item.weightKg).toFixed(2)} kg
                              </p>
                              <p className="text-xs text-muted-foreground">Weight</p>
                            </div>
                          </div>
                        )}
                        {item.widthCm && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="size-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                              <Cuboid className="size-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {Number(item.widthCm).toFixed(1)} ×{' '}
                                {Number(item.heightCm ?? 0).toFixed(1)} ×{' '}
                                {Number(item.depthCm ?? 0).toFixed(1)} cm
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Dimensions (W × H × D)
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Relations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {item.supplierItems && item.supplierItems.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Truck className="size-5 text-muted-foreground" />
                        {t('layout.suppliers')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {item.supplierItems.map((si: any) => (
                        <div
                          key={si.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="text-sm font-medium">{si.supplier.name}</p>
                            {si.supplierSku && (
                              <p className="text-xs text-muted-foreground">
                                SKU: {si.supplierSku}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {si.basePrice && (
                              <p className="text-sm font-medium">
                                {Number(si.basePrice).toFixed(3)}
                              </p>
                            )}
                            {si.leadTimeDays && (
                              <p className="text-xs text-muted-foreground">
                                {si.leadTimeDays}d lead time
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {item.bundleLines && item.bundleLines.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Layers className="size-5 text-muted-foreground" />
                        {t('items.bundleComponents')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.bundleLines.map((bl: any) => (
                          <div
                            key={bl.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          >
                            <span className="text-sm font-medium">
                              {bl.componentItem.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {Number(bl.quantity)} {bl.componentItem.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ExternalLink className="size-5 text-muted-foreground" />
                      {t('common.relatedRecords') ?? 'Related Records'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <button
                      onClick={() => router.push(`/erp/invoices?itemId=${item.id}`)}
                      className="w-full group"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                            <ShoppingCart className="size-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium group-hover:text-foreground transition-colors">
                              {t('layout.invoices')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('items.invoiceLines')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {item._count?.invoiceLines ?? 0}
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => router.push(`/erp/purchase-orders?itemId=${item.id}`)}
                      className="w-full group"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                            <Truck className="size-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium group-hover:text-foreground transition-colors">
                              {t('layout.purchaseOrders')}
                            </p>
                            <p className="text-xs text-muted-foreground">{t('items.poLines')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {item._count?.purchaseLines ?? 0}
                          </p>
                        </div>
                      </div>
                    </button>
                  </CardContent>
                </Card>
              </div>

              {/* Meta Info */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {item.averageCost && Number(item.averageCost) > 0 && (
                    <span>
                      {t('items.avgCost')}: {Number(item.averageCost).toFixed(3)}
                    </span>
                  )}
                  <span>
                    {t('items.created')}{' '}
                    {item.createdAt
                      ? format(new Date(item.createdAt), 'dd MMM yyyy HH:mm')
                      : '—'}
                  </span>
                  <span>
                    {t('items.updated')}{' '}
                    {item.updatedAt
                      ? format(new Date(item.updatedAt), 'dd MMM yyyy HH:mm')
                      : '—'}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
