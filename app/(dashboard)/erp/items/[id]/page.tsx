'use client';

import {
  ArrowLeft,
  Box,
  Download,
  Edit,
  Hash,
  Loader2,
  MoreHorizontal,
  Package,
  Printer,
  QrCode,
  ShoppingCart,
  Tag,
  Trash,
  Truck,
  Wrench,
} from 'lucide-react';
import Barcode from 'react-barcode';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useUnifiedItemForm } from '@/components/dialogs';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { useDateFormat } from '@/hooks/use-date-format';

const TYPE_CONFIG = {
  PRODUCT: {
    icon: Box,
    labelKey: 'items.types.PRODUCT',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  },
  SERVICE: {
    icon: Wrench,
    labelKey: 'items.types.SERVICE',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  },
} as const;

function downloadImage(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useTranslations();
  const { formatDateTime } = useDateFormat();
  const { openEdit } = useUnifiedItemForm();
  const barcodeRef = React.useRef<HTMLDivElement>(null);

  const {
    data: item,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.items.byId.useQuery({ id: params.id }, { enabled: !!params.id });

  const deleteMutation = trpc.items.delete.useMutation({
    onSuccess: () => {
      utils.items.list.invalidate();
      toast.success(t('common.itemDeleted'));
      router.push('/erp/items');
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending = deleteMutation.isPending;

  const handleEdit = () => {
    if (!item) return;
    openEdit({
      itemId: item.id,
      onSuccess: () => {
        utils.items.byId.invalidate({ id: item.id });
      },
    });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{isError ? t('common.failedToLoad') : t('common.notFound')}</EmptyTitle>
            <EmptyDescription>
              {error?.message ?? t('items.doesNotExist')}
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/erp/items')}>
              <ArrowLeft className="size-4 mr-1" /> {t('common.back')}
            </Button>
            {isError && <Button onClick={() => refetch()}>{t('common.retry')}</Button>}
          </div>
        </Empty>
      </div>
    );
  }

  const totalStock =
    item.stock?.reduce((sum: number, s: any) => sum + Number(s.quantity), 0) ?? 0;
  const typeConfig = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.PRODUCT;
  const TypeIcon = typeConfig.icon;
  const isService = item.type === 'SERVICE';

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex h-14 items-center gap-2 px-2 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push('/erp/items')}>
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TypeIcon className="size-5 text-muted-foreground shrink-0" />
          <h1 className="text-xl font-semibold truncate">{item.name}</h1>
          <Badge
            variant="secondary"
            className={cn('text-[10px] font-medium shrink-0', typeConfig.className)}
          >
            {t(typeConfig.labelKey)}
          </Badge>
          {!item.isActive && (
            <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              {t('common.inactive')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="size-4" />
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isPending}
                variant="destructive"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash className="size-4" />
                )}
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">
                {t('items.salesPrice')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">
                {Number(item.salesPrice).toFixed(3)}
              </p>
            </CardContent>
          </Card>

          {!isService && (
            <Card>
              <CardHeader className="pb-1.5">
                <CardTitle className="text-xs text-muted-foreground font-medium">
                  {t('items.purchasePrice')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {Number(item.purchasePrice).toFixed(3)}
                </p>
              </CardContent>
            </Card>
          )}

          {!isService && (
            <Card>
              <CardHeader className="pb-1.5">
                <CardTitle className="text-xs text-muted-foreground font-medium">
                  {t('items.totalStock')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">{totalStock}</p>
                <p className="text-xs text-muted-foreground">{item.unit}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">
                {t('common.tax')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{item.taxRate?.name ?? '—'}</p>
              {item.taxRate && (
                <p className="text-xs text-muted-foreground">{Number(item.taxRate.rate)}%</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Image & Barcode */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 overflow-hidden">
            <CardContent className="p-0">
              {item.image ? (
                <div className="relative aspect-video bg-card">
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
                        onClick={() => item.image && window.open(item.image, '_blank')}
                      >
                        {t('common.viewFull')}
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
                        {t('common.download')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-card flex flex-col items-center justify-center gap-4">
                  <div className="size-20 rounded-2xl bg-background/80 flex items-center justify-center border-2 border-dashed border-muted-foreground/25">
                    <TypeIcon className="size-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">No image</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {/* Barcode */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <QrCode className="size-4 text-muted-foreground" />
                    {t('items.barcode')}
                  </CardTitle>
                  {item.barcode && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handlePrintBarcode}
                      >
                        <Printer className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
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
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="w-full p-4 bg-muted/50 rounded-lg border border-dashed">
                      <p className="text-xs text-muted-foreground text-center">No barcode</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SKU */}
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

        {/* Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Stock & Reorder */}
            {!isService && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Box className="size-4 text-muted-foreground" />
                    {t('items.stockReorder')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        {t('items.minStock')}
                      </p>
                      <p className="text-lg font-semibold tabular-nums">{item.minStock}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        {t('items.reorderAt')}
                      </p>
                      <p className="text-lg font-semibold tabular-nums">{item.reorderPoint}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        {t('items.reorderQty')}
                      </p>
                      <p className="text-lg font-semibold tabular-nums">{item.reorderQty}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        {t('items.avgCost')}
                      </p>
                      <p className="text-lg font-semibold tabular-nums">
                        {Number(item.averageCost).toFixed(3)}
                      </p>
                    </div>
                  </div>

                  {item.stock && item.stock.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-3">{t('items.perWarehouse')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.stock.map((s: any) => (
                            <div
                              key={s.warehouse.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                            >
                              <span className="font-medium text-sm">{s.warehouse.name}</span>
                              <span
                                className={cn(
                                  'font-semibold tabular-nums',
                                  Number(s.quantity) <= 0 ? 'text-destructive' : '',
                                )}
                              >
                                {Number(s.quantity)} {item.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {isService && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('items.notStockTracked')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {item.description && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{t('common.description')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            {/* Attributes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{t('items.attributes')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('items.unit')}</span>
                  <span className="text-sm font-medium">{item.unit}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('items.category')}</span>
                  <span className="text-sm font-medium">{item.category?.name ?? '—'}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('items.saleable')}</span>
                  <Badge variant={item.isSaleable ? 'default' : 'secondary'}>
                    {item.isSaleable ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('items.purchasable')}</span>
                  <Badge variant={item.isPurchasable ? 'default' : 'secondary'}>
                    {item.isPurchasable ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Supplier Prices */}
            {item.supplierItems && item.supplierItems.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{t('suppliers.itemsSupplied')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {item.supplierItems.map((si: any) => (
                    <div
                      key={si.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{si.supplier?.name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{si.supplierSku ?? '—'}</p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums shrink-0">
                        {Number(si.basePrice).toFixed(3)} {si.currency}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pb-2">
          <span>{t('items.created')} {item.createdAt ? formatDateTime(item.createdAt) : '—'}</span>
          <span>{t('items.updated')} {item.updatedAt ? formatDateTime(item.updatedAt) : '—'}</span>
        </div>
      </div>
    </div>
  );
}
