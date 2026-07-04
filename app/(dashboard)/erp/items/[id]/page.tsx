'use client';

import {
  ArrowLeft,
  Box,
  Camera,
  Cuboid,
  Download,
  Edit,
  ExternalLink,
  Hash,
  Info,
  Layers,
  Link as LinkIcon,
  Maximize2,
  MoreHorizontal,
  Package,
  Printer,
  QrCode,
  Scale,
  ShoppingCart,
  Tag,
  Trash,
  Truck,
  Weight,
  Wrench,
} from 'lucide-react';
import Barcode from 'react-barcode';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useItemForm } from '@/components/dialogs';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { openEdit } = useItemForm();
  const t = useTranslations();

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
      toast.success(t('items.itemDeleted'));
      router.push('/erp/items');
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending = deleteMutation.isPending;

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
            <EmptyDescription>{error?.message ?? t('items.doesNotExist')}</EmptyDescription>
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

  const handleEdit = () => {
    openEdit(
      {
        id: item.id,
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
      },
      { onSuccess: () => utils.items.byId.invalidate({ id: item.id }) },
    );
  };

  const handleDelete = () => {
    alert.delete({
      title: t('common.confirmDelete'),
      description: t('items.deactivateRestoreConfirm'),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        await deleteMutation.mutateAsync({ id: item.id });
      },
    });
  };

  const totalStock = item.stock?.reduce((sum, s) => sum + Number(s.quantity), 0) ?? 0;
  const isService = item.type === 'SERVICE';
  const typeConfig = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.PRODUCT;
  const TypeIcon = typeConfig.icon;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center gap-2 px-3 h-14 sm:px-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => router.push('/erp/items')}
          >
            <ArrowLeft className="size-5" />
          </Button>

          {/* Item Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Item Avatar */}
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

            {/* Name & Badges */}
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

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="outline" size="sm" className="hidden sm:flex" onClick={handleEdit}>
              <Edit className="size-4 mr-1.5" />
              Edit
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="size-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleEdit} className="sm:hidden">
                  <Edit className="size-4" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="sm:hidden" />
                <DropdownMenuItem variant="destructive" disabled={isPending} onClick={handleDelete}>
                  <Trash className="size-4" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList
              variant="line"
              className="w-full justify-start border-b rounded-none p-0 h-auto"
            >
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent  data-[state=active]:shadow-none py-3"
              >
                {t('common.overview') ?? 'Overview'}
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="rounded-none border-b-2 border-transparent  data-[state=active]:shadow-none py-3"
              >
                {t('common.details') ?? 'Details'}
              </TabsTrigger>
              <TabsTrigger
                value="relations"
                className="rounded-none border-b-2 border-transparent  data-[state=active]:shadow-none py-3"
              >
                {t('common.relations') ?? 'Relations'}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Sales Price */}
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

                {/* Purchase Price */}
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

                {/* Total Stock */}
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

                {/* Tax Rate */}
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

              {/* Image & Barcode Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Large Item Image Card */}
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
                            <Button size="sm" variant="secondary" className="backdrop-blur-sm">
                              <Maximize2 className="size-4 mr-1" />
                              View Full
                            </Button>
                            <Button size="sm" variant="secondary" className="backdrop-blur-sm">
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
                        <Button variant="outline" size="sm" onClick={handleEdit}>
                          <Camera className="size-4 mr-1.5" />
                          Add Image
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Barcode & Quick Info Card */}
                <div className="space-y-6">
                  {/* Barcode Visualization */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <QrCode className="size-5 text-muted-foreground" />
                          Barcode
                        </CardTitle>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="size-8">
                            <Printer className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8">
                            <Download className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {item.barcode ? (
                        <div className="flex flex-col items-center gap-3">
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
                          <Button variant="outline" size="sm" onClick={handleEdit}>
                            <Hash className="size-4 mr-1.5" />
                            Add Barcode
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* SKU Quick Card */}
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
                        <Button variant="ghost" size="icon" className="size-8 shrink-0">
                          <Hash className="size-4" />
                        </Button>
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
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6 mt-0">
              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Stock Details */}
                  {!isService && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Box className="size-5 text-muted-foreground" />
                          {t('items.stockReorder')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Stock Metrics */}
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

                        {/* Per Warehouse */}
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
                                    <span className="font-medium text-sm">{s.warehouse.name}</span>
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

                  {/* Service Notice */}
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

                  {/* Description */}
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

                {/* Right Column - Sidebar */}
                <div className="space-y-6">
                  {/* Attributes */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('items.attributes')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Unit & Category */}
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
                          <span className="text-sm font-medium">{item.category?.name ?? '—'}</span>
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

                  {/* Flags */}
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

                  {/* Dimensions */}
                  {item.weightKg || item.widthCm ? (
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
                  ) : null}
                </div>
              </div>
            </TabsContent>

            {/* Relations Tab */}
            <TabsContent value="relations" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Suppliers */}
                {item.supplierItems && item.supplierItems.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Truck className="size-5 text-muted-foreground" />
                        {t('layout.suppliers')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {item.supplierItems.map((si) => (
                        <div
                          key={si.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="text-sm font-medium">{si.supplier.name}</p>
                            {si.supplierSku && (
                              <p className="text-xs text-muted-foreground">SKU: {si.supplierSku}</p>
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

                {/* Bundle Components */}
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
                        {item.bundleLines.map((bl) => (
                          <div
                            key={bl.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                          >
                            <span className="text-sm font-medium">{bl.componentItem.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {Number(bl.quantity)} {bl.componentItem.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Related Records */}
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
                          <p className="text-2xl font-bold">{item._count?.invoiceLines ?? 0}</p>
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
                          <p className="text-2xl font-bold">{item._count?.purchaseLines ?? 0}</p>
                        </div>
                      </div>
                    </button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

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
                {item.createdAt ? format(new Date(item.createdAt), 'dd MMM yyyy HH:mm') : '—'}
              </span>
              <span>
                {t('items.updated')}{' '}
                {item.updatedAt ? format(new Date(item.updatedAt), 'dd MMM yyyy HH:mm') : '—'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
