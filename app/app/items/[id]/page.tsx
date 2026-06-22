'use client';

import {
  ArrowLeft,
  Barcode,
  Box,
  Cuboid,
  Edit,
  Hash,
  Layers,
  Loader2,
  Package,
  Scale,
  ShoppingCart,
  Tag,
  Trash,
  Truck,
  Weight,
} from 'lucide-react';
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
import { Spinner } from '@/components/ui/spinner';
import { useItemForm } from '@/components/dialogs';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const TYPE_VARIANTS: Record<string, string> = {
  PRODUCT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SERVICE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { openEdit } = useItemForm();

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
      toast.success('Item deleted');
      router.push('/app/items');
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending = deleteMutation.isPending;

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
            <EmptyTitle>{isError ? 'Failed to load' : 'Not found'}</EmptyTitle>
            <EmptyDescription>
              {error?.message ?? 'This item does not exist or has been deleted.'}
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/app/items')}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Button>
            {isError && <Button onClick={() => refetch()}>Retry</Button>}
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
      title: `Delete "${item.name}"?`,
      description: 'This item will be deactivated. It can be restored later.',
      confirmText: 'Delete',
      onConfirm: async () => {
        await deleteMutation.mutateAsync({ id: item.id });
      },
    });
  };

  const totalStock = item.stock?.reduce((sum, s) => sum + Number(s.quantity), 0) ?? 0;
  const isService = item.type === 'SERVICE';

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-14 items-center gap-2 px-2 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push('/app/items')}>
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Package className="size-5 text-muted-foreground shrink-0" />
          <h1 className="text-xl font-semibold truncate">{item.name}</h1>
          <Badge variant="outline" className={cn('text-xs', TYPE_VARIANTS[item.type] ?? '')}>
            {item.type}
          </Badge>
          {!item.isActive && (
            <Badge
              variant="outline"
              className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            >
              Inactive
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleEdit}>
            <Edit className="size-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash className="size-4" />}
            Delete
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Tag className="size-3" /> SKU & Barcode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5">
                <Hash className="size-3.5 text-muted-foreground" />
                <p className="font-semibold">{item.sku}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Barcode className="size-3.5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{item.barcode ?? '—'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Box className="size-3" /> Unit & Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{item.unit}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {item.category?.name ?? 'No category'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <ShoppingCart className="size-3" /> Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Sales</span>
                <span className="font-semibold">{Number(item.salesPrice).toFixed(3)}</span>
              </div>
              {!isService && (
                <div className="flex justify-between mt-0.5">
                  <span className="text-sm text-muted-foreground">Purchase</span>
                  <span className="font-semibold">{Number(item.purchasePrice).toFixed(3)}</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Scale className="size-3" /> Tax
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{item.taxRate?.name ?? 'No tax rate'}</p>
              {item.taxRate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Rate: {Number(item.taxRate.rate)}%
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stock section */}
        {isService ? (
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-sm font-semibold">Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Services are not stock-tracked.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-sm font-semibold">Stock & Reorder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total stock</p>
                  <p
                    className={cn(
                      'text-2xl font-bold',
                      totalStock <= item.reorderPoint && totalStock > 0
                        ? 'text-yellow-600'
                        : totalStock === 0
                          ? 'text-destructive'
                          : '',
                    )}
                  >
                    {totalStock}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Min stock</p>
                  <p className="text-lg font-semibold">{item.minStock}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reorder at</p>
                  <p className="text-lg font-semibold">{item.reorderPoint}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reorder qty</p>
                  <p className="text-lg font-semibold">{item.reorderQty}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg cost</p>
                  <p className="text-lg font-semibold">{Number(item.averageCost).toFixed(3)}</p>
                </div>
              </div>

              {item.stock && item.stock.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Per warehouse</p>
                  <div className="space-y-1">
                    {item.stock.map((s: any) => (
                      <div
                        key={s.warehouse.id}
                        className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/50"
                      >
                        <span className="font-medium truncate">{s.warehouse.name}</span>
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

        {/* Flags */}
        {!isService && (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1.5">
                <CardTitle className="text-xs text-muted-foreground font-medium">Flags</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'size-2.5 rounded-full',
                      item.isSaleable ? 'bg-green-500' : 'bg-gray-300',
                    )}
                  />
                  <span className="text-sm">Saleable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'size-2.5 rounded-full',
                      item.isPurchasable ? 'bg-green-500' : 'bg-gray-300',
                    )}
                  />
                  <span className="text-sm">Purchasable</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1.5">
                <CardTitle className="text-xs text-muted-foreground font-medium">
                  Dimensions
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-x-4 gap-y-1">
                {item.weightKg && (
                  <div className="flex items-center gap-1 text-sm">
                    <Weight className="size-3.5 text-muted-foreground" />
                    {Number(item.weightKg).toFixed(2)} kg
                  </div>
                )}
                {item.widthCm && (
                  <div className="flex items-center gap-1 text-sm">
                    <Cuboid className="size-3.5 text-muted-foreground" />
                    {Number(item.widthCm).toFixed(1)} x {Number(item.heightCm ?? 0).toFixed(1)} x{' '}
                    {Number(item.depthCm ?? 0).toFixed(1)} cm
                  </div>
                )}
                {!item.weightKg && !item.widthCm && (
                  <span className="text-sm text-muted-foreground">Not specified</span>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Supplier items */}
        {item.supplierItems && item.supplierItems.length > 0 && (
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-sm font-semibold flex items-center gap-1">
                <Truck className="size-4" /> Suppliers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {item.supplierItems.map((si) => (
                  <div
                    key={si.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{si.supplier.name}</p>
                      {si.supplierSku && (
                        <p className="text-xs text-muted-foreground">SKU: {si.supplierSku}</p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      {si.basePrice && <p>{Number(si.basePrice).toFixed(3)}</p>}
                      {si.leadTimeDays && (
                        <p className="text-xs text-muted-foreground">{si.leadTimeDays} days</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bundle lines */}
        {item.bundleLines && item.bundleLines.length > 0 && (
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-sm font-semibold">Bundle components</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {item.bundleLines.map((bl) => (
                  <div
                    key={bl.id}
                    className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/50"
                  >
                    <span className="font-medium">{bl.componentItem.name}</span>
                    <span className="text-muted-foreground">
                      {Number(bl.quantity)} {bl.componentItem.unit}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        {item.description && (
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{item.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Related records */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card
            className="cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => router.push(`/app/invoices?itemId=${item.id}`)}
          >
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">Invoices</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <span className="text-2xl font-bold">{item._count?.invoiceLines ?? 0}</span>
              <span className="text-sm text-muted-foreground">invoice lines</span>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => router.push(`/app/purchase-orders?itemId=${item.id}`)}
          >
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">
                Purchase Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <span className="text-2xl font-bold">{item._count?.purchaseLines ?? 0}</span>
              <span className="text-sm text-muted-foreground">PO lines</span>
            </CardContent>
          </Card>
        </div>

        {/* Meta info */}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pb-2">
          {item.averageCost && Number(item.averageCost) > 0 && (
            <span>Avg cost: {Number(item.averageCost).toFixed(3)}</span>
          )}
          <span>
            Created {item.createdAt ? format(new Date(item.createdAt), 'dd MMM yyyy HH:mm') : '—'}
          </span>
          <span>
            Updated {item.updatedAt ? format(new Date(item.updatedAt), 'dd MMM yyyy HH:mm') : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
