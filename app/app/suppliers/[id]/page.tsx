'use client';

import { ArrowLeft, Edit, ExternalLink, Loader2, Pen, Plus, Trash, Truck, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSupplierForm, useSupplierItemForm } from '@/components/dialogs';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ORDERED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  PARTIAL_RECEIVED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  INVOICED: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { openEdit } = useSupplierForm();
  const { openCreate, openEdit: openSupplierItemEdit } = useSupplierItemForm();
  const t = useTranslations();

  const { data: supplier, isLoading, isError, error, refetch } = trpc.suppliers.byId.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => {
      utils.suppliers.list.invalidate();
      toast.success(t('suppliers.supplierDeleted'));
      router.push('/app/suppliers');
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteSupplierItemMutation = trpc.suppliers.deleteSupplierItem.useMutation({
    onSuccess: () => {
      if (supplier) utils.suppliers.byId.invalidate({ id: supplier.id });
      toast.success(t('suppliers.itemRemoved'));
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

  if (isError || !supplier) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Truck className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{isError ? t('common.failedToLoad') : t('common.notFound')}</EmptyTitle>
            <EmptyDescription>
              {error?.message ?? t('suppliers.doesNotExist')}
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/app/suppliers')}>
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
        id: supplier.id,
        name: supplier.name,
        code: supplier.code ?? undefined,
        phone: supplier.phone ?? undefined,
        email: supplier.email ?? undefined,
        contactName: supplier.contactName ?? undefined,
        website: supplier.website ?? undefined,
        taxId: supplier.taxId ?? undefined,
        crNumber: supplier.crNumber ?? undefined,
        notes: supplier.notes ?? undefined,
        paymentTermsDays: supplier.paymentTermsDays,
      },
      { onSuccess: () => utils.suppliers.byId.invalidate({ id: supplier.id }) },
    );
  };

  const handleDelete = () => {
    alert.delete({
      title: t('common.confirmDelete'),
      description: t('suppliers.deactivateRestoreConfirm'),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        await deleteMutation.mutateAsync({ id: supplier.id });
      },
    });
  };

  const purchaseOrders = supplier.purchaseOrders ?? [];
  const supplierItems = supplier.supplierItems ?? [];

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-14 items-center gap-2 px-2 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push('/app/suppliers')}>
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Truck className="size-5 text-muted-foreground shrink-0" />
          <h1 className="text-xl font-semibold truncate">{supplier.name}</h1>
          {!supplier.isActive && (
            <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              {t('common.inactive')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleEdit}>
            <Edit className="size-4" />
            {t('common.edit')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash className="size-4" />}
            {t('common.delete')}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('suppliers.contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{supplier.contactName ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{supplier.phone ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{supplier.email ?? '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('suppliers.codeAndTax')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{supplier.code ?? '—'}</p>
              <p className="text-xs text-muted-foreground">
                {t('common.tax')}: {supplier.taxId ?? '—'} · {t('suppliers.crNumber')}: {supplier.crNumber ?? '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('suppliers.paymentTerms')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{t('suppliers.paymentTermsDays', { days: supplier.paymentTermsDays })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('common.website')}</CardTitle>
            </CardHeader>
            <CardContent>
              {supplier.website ? (
                <a
                  href={supplier.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline flex items-center gap-1 truncate"
                >
                  {supplier.website.replace(/^https?:\/\//, '')}
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              ) : (
                <p className="font-semibold">—</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Purchase orders */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>{t('suppliers.purchaseOrders')} ({supplier._count?.purchaseOrders ?? 0})</span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs h-7"
                onClick={() => router.push(`/app/purchase-orders?supplierId=${supplier.id}`)}
              >
                <Plus className="size-3" />
                {t('common.viewAll')}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.serial')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead className="text-right">{t('common.total')}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po: any) => (
                  <TableRow
                    key={po.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/app/purchase-orders/${po.id}`)}
                  >
                    <TableCell className="font-medium">{po.serial}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[po.status] ?? ''}>
                        {t(`purchaseOrders.statuses.${po.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {po.date ? format(new Date(po.date), 'dd MMM yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(po.total).toFixed(3)} {po.currency}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="size-7">
                        <ArrowLeft className="size-3 rotate-180" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {purchaseOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      {t('suppliers.noPurchaseOrders')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Supplier items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>{t('suppliers.itemsSupplied')} ({supplier._count?.supplierItems ?? 0})</span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs h-7"
                onClick={() => openCreate(supplier.id)}
              >
                <Plus className="size-3" />
                {t('suppliers.addItem')}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.item')}</TableHead>
                  <TableHead>{t('common.sku')}</TableHead>
                  <TableHead>{t('common.supplierSku')}</TableHead>
                  <TableHead className="text-right">{t('common.basePrice')}</TableHead>
                  <TableHead className="text-right">{t('common.leadTime')}</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierItems.map((si: any) => (
                  <TableRow key={si.id}>
                    <TableCell className="font-medium">{si.item?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{si.item?.sku ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{si.supplierSku ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {Number(si.basePrice).toFixed(3)} {si.currency}
                    </TableCell>
                    <TableCell className="text-right">{si.leadTimeDays ? `${si.leadTimeDays}d` : '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() =>
                            openSupplierItemEdit(supplier.id, {
                              id: si.id,
                              itemId: si.item?.id,
                              itemName: si.item?.name,
                              itemSku: si.item?.sku,
                              supplierSku: si.supplierSku,
                              supplierName: si.supplierName,
                              basePrice: Number(si.basePrice),
                              currency: si.currency,
                              leadTimeDays: si.leadTimeDays,
                              minOrderQty: Number(si.minOrderQty),
                              notes: si.notes,
                            })
                          }
                        >
                          <Pen className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() =>
                            alert.delete({
                              title: t('common.confirmDelete'),
                              description: t('suppliers.removeItemConfirm', { name: si.item?.name ?? si.item?.sku ?? si.id }),
                              confirmText: t('common.remove'),
                              onConfirm: async () => {
                                await deleteSupplierItemMutation.mutateAsync({ id: si.id });
                              },
                            })
                          }
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {supplierItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      {t('suppliers.noSupplierItems')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Notes */}
        {supplier.notes && (
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('common.notes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Meta info */}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pb-2">
          <span>{t('suppliers.created')} {supplier.createdAt ? format(new Date(supplier.createdAt), 'dd MMM yyyy HH:mm') : '—'}</span>
          <span>{t('suppliers.updated')} {supplier.updatedAt ? format(new Date(supplier.updatedAt), 'dd MMM yyyy HH:mm') : '—'}</span>
        </div>
      </div>


    </div>
  );
}
