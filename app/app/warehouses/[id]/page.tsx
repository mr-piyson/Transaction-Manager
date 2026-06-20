'use client';

import { ArrowLeft, Edit, Loader2, MoveRight, Package, Trash, Warehouse as WarehouseIcon } from 'lucide-react';
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
import { useWarehouseForm } from '@/components/dialogs';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  PURCHASE_INBOUND: 'Purchase Inbound',
  SALE_OUTBOUND: 'Sale Outbound',
  RETURN_INBOUND: 'Return Inbound',
  RETURN_OUTBOUND: 'Return Outbound',
  ADJUSTMENT_UP: 'Adjustment Up',
  ADJUSTMENT_DOWN: 'Adjustment Down',
  TRANSFER_OUT: 'Transfer Out',
  TRANSFER_IN: 'Transfer In',
  OPENING_BALANCE: 'Opening Balance',
  DAMAGE: 'Damage',
  ASSEMBLY_CONSUME: 'Assembly Consume',
  ASSEMBLY_PRODUCE: 'Assembly Produce',
};

export default function WarehouseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { openEdit } = useWarehouseForm();

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
      toast.success('Warehouse deleted');
      router.push('/app/warehouses');
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
      toast.success('Stock transferred');
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
            <EmptyTitle>{isError ? 'Failed to load' : 'Not found'}</EmptyTitle>
            <EmptyDescription>
              {error?.message ?? 'This warehouse does not exist or has been deleted.'}
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/app/warehouses')}>
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
      title: `Delete "${warehouse.name}"?`,
      description: warehouse.isDefault
        ? 'This is the default warehouse. Set another as default first.'
        : 'This warehouse will be deactivated. You can restore it later.',
      confirmText: 'Delete',
      onConfirm: async () => {
        await deleteMutation.mutateAsync({ id: warehouse.id });
      },
    });
  };

  const handleTransfer = () => {
    if (!transferItemId) { toast.error('Select an item'); return; }
    if (!transferToWarehouseId) { toast.error('Select destination warehouse'); return; }
    const qty = parseFloat(transferQty);
    if (!qty || qty <= 0) { toast.error('Enter a valid quantity'); return; }
    if (transferToWarehouseId === warehouse.id) { toast.error('Cannot transfer to the same warehouse'); return; }
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
        <Button variant="ghost" size="icon" onClick={() => router.push('/app/warehouses')}>
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <WarehouseIcon className="size-5 text-muted-foreground shrink-0" />
          <h1 className="text-xl font-semibold truncate">{warehouse.name}</h1>
          {warehouse.isDefault && (
            <Badge variant="secondary" className="text-xs">Default</Badge>
          )}
          {!warehouse.isActive && (
            <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
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
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setTransferOpen(true)}
            disabled={stockItems.length === 0}
          >
            <MoveRight className="size-4" />
            Transfer
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash className="size-4" />}
            Delete
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">Name & Code</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{warehouse.name}</p>
              <p className="text-xs text-muted-foreground">{warehouse.code ?? 'No code'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{warehouse.isActive ? 'Active' : 'Inactive'}</p>
              <p className="text-xs text-muted-foreground">
                {warehouse.isDefault ? 'Default warehouse' : 'Not default'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">Stock Items</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{stockItems.length}</p>
              <p className="text-xs text-muted-foreground">unique items in stock</p>
            </CardContent>
          </Card>
        </div>

        {/* Stock levels */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="size-4" /> Stock levels ({stockItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Reorder</TableHead>
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
                      No stock items in this warehouse
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
              <Package className="size-4" /> Recent movements ({movements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Notes</TableHead>
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
                        {MOVEMENT_TYPE_LABELS[m.type] ?? m.type}
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
                      No movements yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Meta info */}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pb-2">
          <span>Created {warehouse.createdAt ? format(new Date(warehouse.createdAt), 'dd MMM yyyy HH:mm') : '—'}</span>
          <span>Updated {warehouse.updatedAt ? format(new Date(warehouse.updatedAt), 'dd MMM yyyy HH:mm') : '—'}</span>
        </div>
      </div>

      {/* Transfer dialog */}
      <Dialog open={transferOpen} onOpenChange={(v) => !transferMutation.isPending && setTransferOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer stock</DialogTitle>
            <DialogDescription>
              Move stock from <strong>{warehouse.name}</strong> to another warehouse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-item">Item *</Label>
              <Select value={transferItemId} onValueChange={setTransferItemId}>
                <SelectTrigger id="transfer-item">
                  <SelectValue placeholder="Select item" />
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
              <Label htmlFor="transfer-to">Destination warehouse *</Label>
              <Select value={transferToWarehouseId} onValueChange={setTransferToWarehouseId}>
                <SelectTrigger id="transfer-to">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {otherWarehouses.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}{w.isDefault ? ' (Default)' : ''}{!w.isActive ? ' (Inactive)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-qty">Quantity *</Label>
              <Input
                id="transfer-qty"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.000"
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-notes">Notes</Label>
              <Textarea
                id="transfer-notes"
                placeholder="Optional notes"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)} disabled={transferMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={transferMutation.isPending}>
              {transferMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              <MoveRight className="size-4 mr-1" />
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
