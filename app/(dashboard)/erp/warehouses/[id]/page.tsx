'use client';

import { ArrowLeft, Edit, Loader2, MoreHorizontal, MoveRight, Package, Trash, Warehouse as WarehouseIcon, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UniversalDropdownMenu } from '@/components/dropdown';
import { useWarehouseForm } from '@/components/dialogs';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';

export default function WarehouseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { openEdit } = useWarehouseForm();
  const t = useTranslations();

  const { data: warehouse, isLoading, isError, error, refetch } = trpc.warehouses.byId.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  const { data: stockData } = trpc.stock.list.useQuery(
    { warehouseId: params.id, limit: 200 },
    { enabled: !!params.id },
  );

  const { data: movementsData } = trpc.stock.movements.useQuery(
    { warehouseId: params.id, limit: 50 },
    { enabled: !!params.id },
  );

  const { data: warehousesList } = trpc.warehouses.list.useQuery(
    { limit: 200 },
    { enabled: !!params.id },
  );

  const deleteMutation = trpc.warehouses.delete.useMutation({
    onSuccess: () => {
      utils.warehouses.list.invalidate();
      toast.success(t('warehouses.warehouseDeleted'));
      router.push('/erp/warehouses');
    },
    onError: (e) => toast.error(e.message),
  });

  const [transferOpen, setTransferOpen] = React.useState(false);
  const [transferItemId, setTransferItemId] = React.useState('');
  const [transferToWarehouseId, setTransferToWarehouseId] = React.useState('');
  const [transferQty, setTransferQty] = React.useState('');
  const [transferNotes, setTransferNotes] = React.useState('');

  const transferMutation = trpc.stock.transfer.useMutation({
    onSuccess: () => {
      setTransferOpen(false);
      setTransferItemId('');
      setTransferToWarehouseId('');
      setTransferQty('');
      setTransferNotes('');
      invalidateStock();
      toast.success(t('warehouses.stockTransferred'));
    },
    onError: (e) => toast.error(e.message),
  });

  function invalidateStock() {
    utils.stock.list.invalidate({ warehouseId: params.id });
    utils.stock.movements.invalidate({ warehouseId: params.id });
    utils.warehouses.byId.invalidate({ id: params.id });
  }

  const isPending = deleteMutation.isPending || transferMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (isError || !warehouse) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WarehouseIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{isError ? t('common.failedToLoad') : t('common.notFound')}</EmptyTitle>
            <EmptyDescription>
              {error?.message ?? t('warehouses.doesNotExist')}
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/erp/warehouses')}>
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
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code ?? undefined,
        isDefault: warehouse.isDefault,
      },
      { onSuccess: () => utils.warehouses.byId.invalidate({ id: warehouse.id }) },
    );
  };

  const handleDelete = () => {
    alert.delete({
      title: t('common.confirmDelete'),
      description: warehouse.isDefault
        ? t('warehouses.defaultDeleteBlocked')
        : t('warehouses.deactivateRestoreConfirm'),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        await deleteMutation.mutateAsync({ id: warehouse.id });
      },
    });
  };

  const handleTransfer = () => {
    if (!transferItemId) { toast.error(t('warehouses.valSelectItem')); return; }
    if (!transferToWarehouseId) { toast.error(t('warehouses.valSelectWarehouse')); return; }
    const qty = parseFloat(transferQty);
    if (!qty || qty <= 0) { toast.error(t('warehouses.valValidQty')); return; }
    if (transferToWarehouseId === warehouse.id) { toast.error(t('warehouses.valSameWarehouse')); return; }
    transferMutation.mutate({
      itemId: transferItemId,
      fromWarehouseId: warehouse.id,
      toWarehouseId: transferToWarehouseId,
      quantity: qty,
      notes: transferNotes || undefined,
    });
  };

  const stockItems = stockData?.data ?? [];
  const movements = movementsData?.data ?? [];
  const otherWarehouses = (warehousesList?.data ?? []).filter((w: any) => w.id !== warehouse.id);

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-14 items-center gap-2 px-2 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push('/erp/warehouses')}>
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <WarehouseIcon className="size-5 text-muted-foreground shrink-0" />
          <h1 className="text-xl font-semibold truncate">{warehouse.name}</h1>
          {warehouse.isDefault && (
            <Badge variant="secondary" className="text-xs">{t('common.default')}</Badge>
          )}
          {!warehouse.isActive && (
            <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              {t('common.inactive')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <UniversalDropdownMenu
            trigger={<MoreHorizontal className="size-4" />}
            items={[
              { id: 'edit', label: t('common.edit'), icon: Edit, onClick: handleEdit },
              {
                id: 'transfer',
                label: t('common.transfer'),
                icon: MoveRight,
                disabled: stockItems.length === 0,
                onClick: () => setTransferOpen(true),
              },
              {
                id: 'delete',
                label: t('common.delete'),
                icon: Trash,
                destructive: true,
                disabled: deleteMutation.isPending,
                onClick: handleDelete,
              },
            ]}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('warehouses.nameCode')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{warehouse.name}</p>
              <p className="text-xs text-muted-foreground">{warehouse.code ?? t('warehouses.noCode')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('common.status')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{warehouse.isActive ? t('common.active') : t('common.inactive')}</p>
              <p className="text-xs text-muted-foreground">
                {warehouse.isDefault ? t('warehouses.defaultWarehouse') : t('warehouses.notDefault')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">{t('warehouses.stockItems')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{stockItems.length}</p>
              <p className="text-xs text-muted-foreground">{t('warehouses.uniqueItems')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Stock levels */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="size-4" /> {t('warehouses.stockLevels', { count: stockItems.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.item')}</TableHead>
                  <TableHead>{t('common.sku')}</TableHead>
                  <TableHead className="text-right">{t('common.quantity')}</TableHead>
                  <TableHead>{t('common.unit')}</TableHead>
                  <TableHead className="text-right">{t('common.reorder')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.item?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.item?.sku ?? '—'}</TableCell>
                    <TableCell className={`text-right font-medium ${s.isLowStock ? 'text-destructive' : ''}`}>
                      {s.quantity.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.item?.unit ?? '—'}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {s.item?.reorderPoint ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {stockItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {t('warehouses.noStockItems')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Stock movements */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="size-4" /> {t('warehouses.recentMovements', { count: movements.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('common.type')}</TableHead>
                  <TableHead>{t('common.item')}</TableHead>
                  <TableHead className="text-right">{t('common.quantity')}</TableHead>
                  <TableHead>{t('common.fromTo')}</TableHead>
                  <TableHead>{t('common.notes')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(m.createdAt), 'dd MMM HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t(`warehouses.movementTypes.${m.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{m.item?.name ?? '—'}</span>
                      {m.item?.sku && <span className="text-xs text-muted-foreground ml-1">({m.item.sku})</span>}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${Number(m.quantity) > 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                      {Number(m.quantity) > 0 ? '+' : ''}{Number(m.quantity).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.fromWarehouse?.name ?? '—'} → {m.toWarehouse?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                      {m.notes ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {t('warehouses.noMovements')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Meta info */}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pb-2">
          <span>{t('warehouses.created')} {warehouse.createdAt ? format(new Date(warehouse.createdAt), 'dd MMM yyyy HH:mm') : '—'}</span>
          <span>{t('warehouses.updated')} {warehouse.updatedAt ? format(new Date(warehouse.updatedAt), 'dd MMM yyyy HH:mm') : '—'}</span>
        </div>
      </div>

      {/* Transfer dialog */}
      <Dialog open={transferOpen} onOpenChange={(v) => !transferMutation.isPending && setTransferOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('warehouses.transferStock')}</DialogTitle>
            <DialogDescription>
              {t('warehouses.transferDesc', { name: warehouse.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-item">{t('warehouses.selectItem')} *</Label>
              <Select value={transferItemId} onValueChange={setTransferItemId}>
                <SelectTrigger id="transfer-item">
                  <SelectValue placeholder={t('warehouses.selectItem')} />
                </SelectTrigger>
                <SelectContent>
                  {stockItems.map((s: any) => (
                    <SelectItem key={s.itemId} value={s.itemId}>
                      {s.item?.name ?? s.itemId} ({s.item?.sku ?? ''}) — {s.quantity.toFixed(3)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-to">{t('warehouses.destinationWarehouse')} *</Label>
              <Select value={transferToWarehouseId} onValueChange={setTransferToWarehouseId}>
                <SelectTrigger id="transfer-to">
                  <SelectValue placeholder={t('warehouses.selectWarehouse')} />
                </SelectTrigger>
                <SelectContent>
                  {otherWarehouses.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}{w.isDefault ? ` (${t('common.default')})` : ''}{!w.isActive ? ` (${t('common.inactive')})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-qty">{t('common.quantity')} *</Label>
              <Input
                id="transfer-qty"
                type="number"
                step="0.001"
                min="0"
                placeholder={t('common.placeholders.amount')}
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-notes">{t('common.notes')}</Label>
              <Textarea
                id="transfer-notes"
                placeholder={t('common.optionalNotes')}
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)} disabled={transferMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleTransfer} disabled={transferMutation.isPending}>
              {transferMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              <MoveRight className="size-4 mr-1" />
              {t('common.transfer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
