'use client';

import {
  ArrowLeft,
  Box,
  Download,
  Edit,
  ExternalLink,
  Hash,
  Loader2,
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
  const { openEdit } = useUnifiedItemForm();
  const barcodeRef = React.useRef<HTMLDivElement>(null);

  const {
    data: item,
    isLoading,
    isError,
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
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground">Loading item details...</p>
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
    item.stock?.reduce((sum: number, s: any) => sum + Number(s.quantity), 0) ?? 0;
  const typeConfig = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.PRODUCT;
  const TypeIcon = typeConfig.icon;
  const isService = item.type === 'SERVICE';

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
        <div className="flex items-center gap-2 px-3 h-14 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => router.push('/erp/items')}
          >
            <ArrowLeft className="size-5" />
          </Button>

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

          <div className="flex items-center gap-1 shrink-0">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="size-4 mr-1.5" />
              {t('common.edit')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Trash className="size-4 mr-1.5" />
              )}
              {t('common.delete')}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
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
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold">{totalStock}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.unit}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                    <Truck className="size-4 text-purple-600 dark:text-purple-400" />
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
                          onClick={() => item.image && window.open(item.image, '_blank')}
                        >
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
                    <p className="text-sm font-medium text-muted-foreground">No image uploaded</p>
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
                          <p className="text-xs">No barcode</p>
                        </div>
                      </div>
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
                              <span className="font-medium text-sm">{s.warehouse.name}</span>
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
                    <p className="text-sm text-muted-foreground">
                      {t('items.notStockTracked')}
                    </p>
                  </CardContent>
                </Card>
              )}

              {item.description && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('common.description')}</CardTitle>
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
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('suppliers.itemsSupplied')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {item.supplierItems.map((si: any) => (
                      <div
                        key={si.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="text-sm font-medium">{si.supplier?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{si.supplierSku ?? '—'}</p>
                        </div>
                        <p className="text-sm font-semibold">
                          {Number(si.basePrice).toFixed(3)} {si.currency}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
