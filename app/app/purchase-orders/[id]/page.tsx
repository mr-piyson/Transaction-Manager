'use client';

import {
  ArrowLeft,
  CheckCircle,
  Edit,
  FileDown,
  Loader2,
  Package,
  Send,
  ShoppingCart,
  Trash,
  XCircle,
  History,
  ThumbsDown,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';
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
import { usePOForm } from '@/components/dialogs/poForm';
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

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { openEdit } = usePOForm();
  const t = useTranslations();

  const {
    data: po,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.purchaseOrders.byId.useQuery({ id: params.id }, { enabled: !!params.id });

  const { data: stockMovements } = trpc.purchaseOrders.stockMovements.useQuery(
    { id: params.id },
    {
      enabled:
        !!params.id && !!po && ['ORDERED', 'PARTIAL_RECEIVED', 'RECEIVED'].includes(po.status),
    },
  );

  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');

  const submitMutation = trpc.purchaseOrders.submitForApproval.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t('purchaseOrders.submittedForApproval'));
    },
    onError: (e) => toast.error(e.message),
  });
  const approveMutation = trpc.purchaseOrders.approve.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t('purchaseOrders.poApproved'));
    },
    onError: (e) => toast.error(e.message),
  });
  const rejectMutation = trpc.purchaseOrders.reject.useMutation({
    onSuccess: () => {
      setRejectOpen(false);
      setRejectReason('');
      invalidate();
      toast.success(t('purchaseOrders.poRejected'));
    },
    onError: (e) => toast.error(e.message),
  });
  const orderMutation = trpc.purchaseOrders.order.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t('purchaseOrders.poPlaced'));
    },
    onError: (e) => toast.error(e.message),
  });
  const receiveMutation = trpc.purchaseOrders.receive.useMutation({
    onSuccess: () => {
      setReceiveOpen(false);
      invalidate();
      toast.success(t('purchaseOrders.stockReceived'));
    },
    onError: (e) => toast.error(e.message),
  });
  const cancelMutation = trpc.purchaseOrders.cancel.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t('purchaseOrders.poCancelled'));
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.purchaseOrders.delete.useMutation({
    onSuccess: () => {
      utils.purchaseOrders.list.invalidate();
      toast.success(t('purchaseOrders.poDeleted'));
      router.push('/app/purchase-orders');
    },
    onError: (e) => toast.error(e.message),
  });

  function invalidate() {
    utils.purchaseOrders.byId.invalidate({ id: params.id });
    utils.purchaseOrders.list.invalidate();
    utils.purchaseOrders.stockMovements.invalidate({ id: params.id });
  }

  const isPending =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    orderMutation.isPending ||
    receiveMutation.isPending ||
    cancelMutation.isPending ||
    deleteMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (isError || !po) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingCart className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{isError ? t('common.failedToLoad') : t('common.notFound')}</EmptyTitle>
            <EmptyDescription>
              {error?.message ?? t('purchaseOrders.doesNotExist')}
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/app/purchase-orders')}>
              <ArrowLeft className="size-4 mr-1" /> {t('common.back')}
            </Button>
            {isError && <Button onClick={() => refetch()}>{t('common.retry')}</Button>}
          </div>
        </Empty>
      </div>
    );
  }

  const version = po.version ?? 0;

  const handleEdit = () => {
    openEdit(
      {
        id: po.id,
        version,
        supplierId: po.supplierId,
        warehouseId: po.warehouseId,
        date: po.date ? format(new Date(po.date), 'yyyy-MM-dd') : undefined,
        expectedDate: po.expectedDate ? format(new Date(po.expectedDate), 'yyyy-MM-dd') : undefined,
        currency: po.currency as any,
        notes: po.notes ?? undefined,
        internalNotes: po.internalNotes ?? undefined,
        lines: po.lines.map((l: any) => ({
          itemId: l.itemId,
          description: l.description ?? undefined,
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost),
        })),
      },
      { onSuccess: () => utils.purchaseOrders.byId.invalidate({ id: po.id }) },
    );
  };

  const handleConfirmAction = (action: string, msg: string) => {
    if (!window.confirm(msg)) return;
    switch (action) {
      case 'submit':
        submitMutation.mutate({ id: po.id, version });
        break;
      case 'approve':
        approveMutation.mutate({ id: po.id, version });
        break;
      case 'order':
        orderMutation.mutate({ id: po.id, version });
        break;
      case 'cancel':
        cancelMutation.mutate({ id: po.id, version });
        break;
      case 'delete':
        deleteMutation.mutate({ id: po.id });
        break;
    }
  };

  type Action = {
    label: string;
    key: string;
    icon: React.ReactNode;
    variant?: 'default' | 'destructive' | 'outline';
    dialog?: 'receive' | 'reject';
  };

  const actions: Action[] = [];
  if (po.status === 'DRAFT') {
    actions.push({
      label: t('purchaseOrders.submitForApproval'),
      key: 'submit',
      icon: <Send className="size-4" />,
    });
    actions.push({
      label: t('common.edit'),
      key: 'edit',
      icon: <Edit className="size-4" />,
      variant: 'outline',
    });
    actions.push({
      label: t('common.delete'),
      key: 'delete',
      icon: <Trash className="size-4" />,
      variant: 'destructive',
    });
  } else if (po.status === 'PENDING_APPROVAL') {
    actions.push({
      label: t('common.approve'),
      key: 'approve',
      icon: <CheckCircle className="size-4" />,
    });
    actions.push({
      label: t('common.reject'),
      key: 'reject',
      icon: <ThumbsDown className="size-4" />,
      variant: 'destructive',
      dialog: 'reject',
    });
    actions.push({
      label: t('common.cancel'),
      key: 'cancel',
      icon: <XCircle className="size-4" />,
      variant: 'destructive',
    });
  } else if (po.status === 'APPROVED') {
    actions.push({
      label: t('purchaseOrders.placeOrder'),
      key: 'order',
      icon: <FileDown className="size-4" />,
    });
    actions.push({
      label: t('common.cancel'),
      key: 'cancel',
      icon: <XCircle className="size-4" />,
      variant: 'destructive',
    });
  } else if (po.status === 'ORDERED' || po.status === 'PARTIAL_RECEIVED') {
    actions.push({
      label: t('purchaseOrders.receiveStock'),
      key: 'receive',
      icon: <Package className="size-4" />,
      dialog: 'receive',
    });
    actions.push({
      label: t('common.cancel'),
      key: 'cancel',
      icon: <XCircle className="size-4" />,
      variant: 'destructive',
    });
  }

  const showActions = actions.length > 0;

  const remainingLines = po.lines.filter((l: any) => Number(l.quantity) > Number(l.receivedQty));
  const allReceived = remainingLines.length === 0;

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-14 items-center gap-2 px-2 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push('/app/purchase-orders')}>
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ShoppingCart className="size-5 text-muted-foreground shrink-0" />
          <h1 className="text-xl font-semibold truncate">{po.serial}</h1>
          <Badge variant="outline" className={STATUS_COLORS[po.status] ?? ''}>
            {t(`purchaseOrders.statuses.${po.status}`)}
          </Badge>
          {po.approvalStatus === 'REJECTED' && (
            <Badge
              variant="outline"
              className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            >
              {t('common.rejected')}
            </Badge>
          )}
        </div>
        {showActions && (
          <div className="flex items-center gap-2">
            {actions.map(({ label, key, icon, variant = 'default', dialog }) =>
              key === 'edit' ? (
                <Button
                  key={key}
                  variant={variant}
                  size="sm"
                  onClick={handleEdit}
                  disabled={isPending}
                >
                  <Edit className="size-4 mr-1" /> {label}
                </Button>
              ) : dialog === 'receive' ? (
                <Button
                  key={key}
                  variant={variant}
                  size="sm"
                  onClick={() => setReceiveOpen(true)}
                  disabled={isPending}
                >
                  <Package className="size-4 mr-1" /> {label}
                </Button>
              ) : dialog === 'reject' ? (
                <Button
                  key={key}
                  variant={variant}
                  size="sm"
                  onClick={() => setRejectOpen(true)}
                  disabled={isPending}
                >
                  <ThumbsDown className="size-4 mr-1" /> {label}
                </Button>
              ) : (
                <Button
                  key={key}
                  variant={variant}
                  size="sm"
                  onClick={() =>
                    handleConfirmAction(
                      key,
                      t('purchaseOrders.confirmAction', { action: label.toLowerCase() }),
                    )
                  }
                  disabled={isPending}
                >
                  {isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
                  {!isPending && icon}
                  <span className="ml-1">{label}</span>
                </Button>
              ),
            )}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">
                {t('purchaseOrders.supplier')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{po.supplier?.name ?? '—'}</p>
              <p className="text-xs text-muted-foreground">
                {po.supplier?.email}
                {po.supplier?.phone ? ` · ${po.supplier.phone}` : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">
                {t('purchaseOrders.warehouse')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{po.warehouse?.name ?? '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">
                {t('common.date')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">
                {po.date ? format(new Date(po.date), 'dd MMM yyyy') : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">
                {t('purchaseOrders.expectedDate')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">
                {po.expectedDate ? format(new Date(po.expectedDate), 'dd MMM yyyy') : '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Line items table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t('purchaseOrders.lineItems')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[32%]">{t('common.item')}</TableHead>
                  <TableHead className="text-right">{t('common.ordered')}</TableHead>
                  <TableHead className="text-right">{t('common.received')}</TableHead>
                  <TableHead className="text-right">{t('common.remaining')}</TableHead>
                  <TableHead className="text-right">{t('common.unitCost')}</TableHead>
                  <TableHead className="text-right">{t('common.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.lines.map((line: any) => {
                  const qty = Number(line.quantity);
                  const recv = Number(line.receivedQty);
                  const rem = qty - recv;
                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div className="font-medium">{line.item?.name ?? '—'}</div>
                        {line.item?.sku && (
                          <div className="text-xs text-muted-foreground">{line.item.sku}</div>
                        )}
                        {line.description && (
                          <div className="text-xs text-muted-foreground italic">
                            {line.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{qty.toFixed(3)}</TableCell>
                      <TableCell className="text-right">{recv.toFixed(3)}</TableCell>
                      <TableCell className="text-right">{rem.toFixed(3)}</TableCell>
                      <TableCell className="text-right">
                        {Number(line.unitCost).toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(line.total).toFixed(3)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {po.lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      {t('purchaseOrders.noLineItems')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.subtotal')}</span>
                  <span>{Number(po.subtotal).toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('common.tax')}</span>
                  <span>{Number(po.taxTotal).toFixed(3)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>{t('common.total')}</span>
                  <span>
                    {Number(po.total).toFixed(3)} {po.currency}
                  </span>
                </div>
                {Number(po.amountOwed) > 0 && (
                  <div className="flex justify-between text-destructive font-medium">
                    <span>{t('common.amountOwed')}</span>
                    <span>
                      {Number(po.amountOwed).toFixed(3)} {po.currency}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {po.notes && (
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">
                {t('common.notes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Stock movements */}
        {stockMovements && stockMovements.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="size-4" /> {t('stock.movements')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>{t('common.item')}</TableHead>
                    <TableHead className="text-right">{t('common.quantity')}</TableHead>
                    <TableHead>{t('common.warehouse')}</TableHead>
                    <TableHead>{t('common.by')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockMovements.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">
                        {format(new Date(m.createdAt), 'dd MMM HH:mm')}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{m.item?.name}</span>
                        {m.item?.sku && (
                          <span className="text-xs text-muted-foreground ml-1">({m.item.sku})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                        +{Number(m.quantity).toFixed(3)}
                      </TableCell>
                      <TableCell>{m.toWarehouse?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.user?.name ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Meta info */}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pb-2">
          <span>
            {t('purchaseOrders.metaCreated', {
              type: po.status,
              name: po.createdBy?.name ?? '—',
              date: po.createdAt ? format(new Date(po.createdAt), 'dd MMM yyyy HH:mm') : '—',
            })}
          </span>
          <span>{t('purchaseOrders.metaVersion', { version: po.version })}</span>
          {po.receivedAt && (
            <span>
              {t('purchaseOrders.metaReceivedOn', {
                date: format(new Date(po.receivedAt), 'dd MMM yyyy HH:mm'),
              })}
            </span>
          )}
          {po.cancelledAt && (
            <span>
              {t('purchaseOrders.metaCancelledOn', {
                date: format(new Date(po.cancelledAt), 'dd MMM yyyy HH:mm'),
              })}
            </span>
          )}
        </div>
      </div>

      {/* Receive dialog */}
      <ReceiveDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        lines={po.lines}
        onConfirm={() => receiveMutation.mutate({ id: po.id, version })}
        isPending={receiveMutation.isPending}
      />

      {/* Reject dialog */}
      <Dialog
        open={rejectOpen}
        onOpenChange={(v) => {
          if (!rejectMutation.isPending) setRejectOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('purchaseOrders.rejectTitle')}</DialogTitle>
            <DialogDescription>
              {t('purchaseOrders.rejectDesc', { serial: po.serial })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="reject-reason">{t('common.reason')}</Label>
            <Textarea
              id="reject-reason"
              placeholder={t('purchaseOrders.rejectPlaceholder')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectOpen(false);
                setRejectReason('');
              }}
              disabled={rejectMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                rejectMutation.mutate({ id: po.id, version, reason: rejectReason || undefined })
              }
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              {t('purchaseOrders.rejectPO')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Receive Dialog ──────────────────────────────────────────────────────────

function ReceiveDialog({
  open,
  onOpenChange,
  lines,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lines: any[];
  onConfirm: () => void;
  isPending: boolean;
}) {
  const tr = useTranslations();
  const remaining = lines.filter((l: any) => Number(l.quantity) > Number(l.receivedQty));
  const allAlreadyReceived = remaining.length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tr('purchaseOrders.receiveStock')}</DialogTitle>
          <DialogDescription>
            {allAlreadyReceived
              ? tr('purchaseOrders.allReceived')
              : tr('purchaseOrders.pendingReceipt', { count: remaining.length })}
          </DialogDescription>
        </DialogHeader>

        {!allAlreadyReceived && (
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr('common.item')}</TableHead>
                  <TableHead className="text-right">{tr('common.ordered')}</TableHead>
                  <TableHead className="text-right">{tr('common.received')}</TableHead>
                  <TableHead className="text-right">{tr('common.toReceive')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remaining.map((line: any) => {
                  const qty = Number(line.quantity);
                  const recv = Number(line.receivedQty);
                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        <span className="font-medium">{line.item?.name}</span>
                        {line.item?.sku && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({line.item.sku})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{qty.toFixed(3)}</TableCell>
                      <TableCell className="text-right">{recv.toFixed(3)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {(qty - recv).toFixed(3)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {tr('common.cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={isPending || allAlreadyReceived}>
            {isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
            {allAlreadyReceived
              ? tr('common.close')
              : tr('purchaseOrders.receiveAll', {
                  qty: remaining
                    .reduce(
                      (s: number, l: any) => s + Number(l.quantity) - Number(l.receivedQty),
                      0,
                    )
                    .toFixed(3),
                })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
