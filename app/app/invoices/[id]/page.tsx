'use client';

import {
  ArrowLeft,
  Banknote,
  Edit,
  HandCoins,
  Loader2,
  Receipt,
  Send,
  Trash,
  XCircle,
} from 'lucide-react';
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
import { useInvoiceForm } from '@/components/dialogs/invoiceForm';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PARTIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  DISPUTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  DELETED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  PARTIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CARD: 'Card',
  CHEQUE: 'Cheque',
  ONLINE: 'Online',
  CREDIT: 'Credit',
  OTHER: 'Other',
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { openEdit } = useInvoiceForm();

  const {
    data: invoice,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.invoices.byId.useQuery({ id: params.id }, { enabled: !!params.id });

  const productItemIds = React.useMemo(() => {
    if (!invoice) return [];
    return invoice.lines
      .filter((l: any) => l.item?.type === 'PRODUCT')
      .map((l: any) => l.itemId)
      .filter(Boolean);
  }, [invoice]);

  const { data: stockData } = trpc.stock.forItems.useQuery(
    { itemIds: productItemIds, warehouseId: invoice?.warehouseId ?? '' },
    { enabled: productItemIds.length > 0 && !!invoice?.warehouseId },
  );

  const stockMap = React.useMemo(() => {
    const map = new Map<string, number>();
    if (stockData) {
      for (const s of stockData) {
        map.set(s.itemId, Number(s.quantity));
      }
    }
    return map;
  }, [stockData]);

  const [sendOpen, setSendOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState('CASH');
  const [paymentDate, setPaymentDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [paymentReference, setPaymentReference] = React.useState('');
  const [paymentNotes, setPaymentNotes] = React.useState('');

  const sendMutation = trpc.invoices.send.useMutation({
    onSuccess: () => {
      setSendOpen(false);
      invalidate();
      toast.success('Invoice sent');
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.invoices.cancel.useMutation({
    onSuccess: () => {
      setCancelOpen(false);
      setCancelReason('');
      invalidate();
      toast.success('Invoice cancelled');
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      toast.success('Invoice deleted');
      router.push('/app/invoices');
    },
    onError: (e) => toast.error(e.message),
  });

  const addPaymentMutation = trpc.invoices.addPayment.useMutation({
    onSuccess: () => {
      setPaymentOpen(false);
      setPaymentAmount('');
      setPaymentMethod('CASH');
      setPaymentReference('');
      setPaymentNotes('');
      invalidate();
      toast.success('Payment recorded');
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePaymentMutation = trpc.invoices.deletePayment.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success('Payment deleted');
    },
    onError: (e) => toast.error(e.message),
  });

  const convertQuoteMutation = trpc.invoices.convertQuote.useMutation({
    onSuccess: (result) => {
      invalidate();
      toast.success('Quote converted to invoice');
      router.push(`/app/invoices/${result.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  function invalidate() {
    utils.invoices.byId.invalidate({ id: params.id });
    utils.invoices.list.invalidate();
  }

  const isPending =
    sendMutation.isPending ||
    cancelMutation.isPending ||
    deleteMutation.isPending ||
    addPaymentMutation.isPending ||
    deletePaymentMutation.isPending ||
    convertQuoteMutation.isPending;

  const resetPaymentForm = () => {
    setPaymentAmount('');
    setPaymentMethod('CASH');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentReference('');
    setPaymentNotes('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Receipt className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{isError ? 'Failed to load' : 'Not found'}</EmptyTitle>
            <EmptyDescription>
              {error?.message ?? 'This invoice does not exist or has been deleted.'}
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/app/invoices')}>
              <ArrowLeft className="size-4 mr-1" /> Back
            </Button>
            {isError && <Button onClick={() => refetch()}>Retry</Button>}
          </div>
        </Empty>
      </div>
    );
  }

  const version = invoice.version ?? 0;

  const handleEdit = () => {
    openEdit(
      {
        id: invoice.id,
        version,
        type: invoice.type as any,
        date: invoice.date ? format(new Date(invoice.date), 'yyyy-MM-dd') : undefined,
        dueDate: invoice.dueDate ? format(new Date(invoice.dueDate), 'yyyy-MM-dd') : undefined,
        customerId: invoice.customerId ?? undefined,
        warehouseId: invoice.warehouseId ?? undefined,
        departmentId: invoice.departmentId ?? undefined,
        currency: invoice.currency as any,
        description: invoice.description ?? undefined,
        notes: invoice.notes ?? undefined,
        termsText: invoice.termsText ?? undefined,
        internalNotes: invoice.internalNotes ?? undefined,
        isWalkIn: invoice.isWalkIn ?? undefined,
        parentInvoiceId: invoice.parentInvoiceId ?? undefined,
        lines: invoice.lines.map((l: any) => ({
          itemId: l.itemId,
          description: l.description ?? undefined,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discountAmt: Number(l.discountAmt),
          purchasePrice: Number(l.purchasePrice ?? 0),
          taxRateId: l.taxRateId ?? undefined,
          taxRateSnapshot: Number(l.taxRateSnapshot ?? 0),
          taxRateName: l.taxRateName ?? undefined,
          sortOrder: l.sortOrder ?? 0,
          departmentId: l.departmentId ?? undefined,
        })),
      },
      { onSuccess: () => utils.invoices.byId.invalidate({ id: invoice.id }) },
    );
  };

  const typeLabel: Record<string, string> = {
    QUOTE: 'Quote',
    INVOICE: 'Invoice',
    CREDIT_NOTE: 'Credit Note',
    PROFORMA: 'Proforma',
    DELIVERY_NOTE: 'Delivery Note',
  };

  type Action = {
    label: string;
    key: string;
    icon: React.ReactNode;
    variant?: 'default' | 'destructive' | 'outline';
    dialog?: 'send' | 'cancel' | 'payment';
  };

  const actions: Action[] = [];
  const status = invoice.status;
  const type = invoice.type;

  if (type === 'QUOTE') {
    if (status === 'DRAFT') {
      actions.push({ label: 'Edit', key: 'edit', icon: <Edit className="size-4" />, variant: 'outline' });
      actions.push({ label: 'Send Quote', key: 'send', icon: <Send className="size-4" />, dialog: 'send' });
      actions.push({
        label: 'Convert to Invoice',
        key: 'convertQuote',
        icon: <Receipt className="size-4" />,
      });
      actions.push({
        label: 'Delete',
        key: 'delete',
        icon: <Trash className="size-4" />,
        variant: 'destructive',
      });
    } else if (status === 'SENT') {
      actions.push({
        label: 'Convert to Invoice',
        key: 'convertQuote',
        icon: <Receipt className="size-4" />,
      });
      actions.push({
        label: 'Cancel Quote',
        key: 'cancel',
        icon: <XCircle className="size-4" />,
        variant: 'destructive',
        dialog: 'cancel',
      });
    } else if (status === 'CANCELLED' || status === 'DELETED') {
      // No actions for terminal states
    } else {
      actions.push({
        label: 'Cancel',
        key: 'cancel',
        icon: <XCircle className="size-4" />,
        variant: 'destructive',
        dialog: 'cancel',
      });
    }
  } else if (type === 'INVOICE') {
    if (status === 'DRAFT') {
      actions.push({ label: 'Edit', key: 'edit', icon: <Edit className="size-4" />, variant: 'outline' });
      actions.push({ label: 'Send', key: 'send', icon: <Send className="size-4" />, dialog: 'send' });
      actions.push({
        label: 'Delete',
        key: 'delete',
        icon: <Trash className="size-4" />,
        variant: 'destructive',
      });
    } else if (status === 'PENDING_APPROVAL') {
      actions.push({ label: 'Edit', key: 'edit', icon: <Edit className="size-4" />, variant: 'outline' });
      actions.push({ label: 'Send', key: 'send', icon: <Send className="size-4" />, dialog: 'send' });
      actions.push({
        label: 'Cancel',
        key: 'cancel',
        icon: <XCircle className="size-4" />,
        variant: 'destructive',
        dialog: 'cancel',
      });
    } else if (status === 'APPROVED') {
      actions.push({ label: 'Send', key: 'send', icon: <Send className="size-4" />, dialog: 'send' });
      actions.push({
        label: 'Cancel',
        key: 'cancel',
        icon: <XCircle className="size-4" />,
        variant: 'destructive',
        dialog: 'cancel',
      });
    } else if (['SENT', 'PARTIAL', 'OVERDUE'].includes(status)) {
      actions.push({
        label: 'Record Payment',
        key: 'payment',
        icon: <Banknote className="size-4" />,
        dialog: 'payment',
      });
      if (status !== 'OVERDUE') {
        actions.push({
          label: 'Cancel',
          key: 'cancel',
          icon: <XCircle className="size-4" />,
          variant: 'destructive',
          dialog: 'cancel',
        });
      }
    }
    // PAID, CANCELLED, DELETED, DISPUTED — no actions
  } else if (type === 'CREDIT_NOTE') {
    // Credit notes are mostly read-only after creation
    if (status === 'DRAFT') {
      actions.push({ label: 'Edit', key: 'edit', icon: <Edit className="size-4" />, variant: 'outline' });
      actions.push({ label: 'Send', key: 'send', icon: <Send className="size-4" />, dialog: 'send' });
      actions.push({
        label: 'Delete',
        key: 'delete',
        icon: <Trash className="size-4" />,
        variant: 'destructive',
      });
    }
  } else {
    // PROFORMA, DELIVERY_NOTE
    if (status === 'DRAFT') {
      actions.push({ label: 'Edit', key: 'edit', icon: <Edit className="size-4" />, variant: 'outline' });
      actions.push({ label: 'Send', key: 'send', icon: <Send className="size-4" />, dialog: 'send' });
      actions.push({
        label: 'Delete',
        key: 'delete',
        icon: <Trash className="size-4" />,
        variant: 'destructive',
      });
    } else if (status === 'SENT') {
      actions.push({
        label: 'Cancel',
        key: 'cancel',
        icon: <XCircle className="size-4" />,
        variant: 'destructive',
        dialog: 'cancel',
      });
    }
  }

  const showActions = actions.length > 0;

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-14 items-center gap-2 px-2 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push('/app/invoices')}>
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Receipt className="size-5 text-muted-foreground shrink-0" />
          <h1 className="text-xl font-semibold truncate">{invoice.serial}</h1>
          <Badge variant="outline" className={STATUS_COLORS[invoice.status] ?? ''}>
            {invoice.status.replace(/_/g, ' ')}
          </Badge>
          <Badge variant="outline" className={PAYMENT_STATUS_COLORS[invoice.paymentStatus] ?? ''}>
            {invoice.paymentStatus}
          </Badge>
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            {typeLabel[invoice.type] ?? invoice.type}
          </Badge>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{invoice.customer?.name ?? (invoice.isWalkIn ? 'Walk-in' : '—')}</p>
              {invoice.customer && (
                <p className="text-xs text-muted-foreground">
                  {invoice.customer.email}
                  {invoice.customer.phone ? ` · ${invoice.customer.phone}` : ''}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">Warehouse</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{invoice.warehouse?.name ?? '—'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">Date</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">
                {invoice.date ? format(new Date(invoice.date), 'dd MMM yyyy') : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">Due Date</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">
                {invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">Currency</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold">{invoice.currency}</p>
            </CardContent>
          </Card>
          {invoice.department && (
            <Card>
              <CardHeader className="pb-1.5">
                <CardTitle className="text-xs text-muted-foreground font-medium">Department</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{invoice.department.name}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Parent invoice link (for credit notes) */}
        {invoice.parentInvoice && (
          <Card>
            <CardContent className="py-3">
              <p className="text-sm text-muted-foreground">
                Credit note for{' '}
                <button
                  className="font-medium text-primary hover:underline"
                  onClick={() => router.push(`/app/invoices/${invoice.parentInvoice!.id}`)}
                >
                  {invoice.parentInvoice.serial}
                </button>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Line items table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Line items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[28%]">Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lines.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div className="font-medium">{line.item?.name ?? '—'}</div>
                      {line.item?.sku && (
                        <div className="text-xs text-muted-foreground">{line.item.sku}</div>
                      )}
                      {line.description && (
                        <div className="text-xs text-muted-foreground italic">{line.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{Number(line.quantity).toFixed(3)}</TableCell>
                    <TableCell className="text-right">
                      {line.item?.type === 'PRODUCT' && invoice.warehouseId ? (
                        <span
                          className={
                            (stockMap.get(line.itemId) ?? 0) < Number(line.quantity)
                              ? 'text-destructive font-medium'
                              : ''
                          }
                        >
                          {stockMap.has(line.itemId)
                            ? Number(stockMap.get(line.itemId)).toFixed(3)
                            : '…'}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right">{Number(line.unitPrice).toFixed(3)}</TableCell>
                    <TableCell className="text-right">
                      {Number(line.discountAmt) > 0 ? Number(line.discountAmt).toFixed(3) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.taxRateName ? (
                        <span>
                          {Number(line.taxAmt).toFixed(3)}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({line.taxRateName})
                          </span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(line.total).toFixed(3)}
                    </TableCell>
                  </TableRow>
                ))}
                {invoice.lines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                      No line items
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
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{Number(invoice.subtotal).toFixed(3)}</span>
                </div>
                {Number(invoice.discountTotal) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-destructive">-{Number(invoice.discountTotal).toFixed(3)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{Number(invoice.taxTotal).toFixed(3)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>
                    {Number(invoice.total).toFixed(3)} {invoice.currency}
                  </span>
                </div>
                {Number(invoice.amountPaid) > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                    <span>Paid</span>
                    <span>
                      -{Number(invoice.amountPaid).toFixed(3)} {invoice.currency}
                    </span>
                  </div>
                )}
                {Number(invoice.amountDue) > 0 && (
                  <div className="flex justify-between text-destructive font-medium">
                    <span>Amount Due</span>
                    <span>
                      {Number(invoice.amountDue).toFixed(3)} {invoice.currency}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments table */}
        {invoice.payments && invoice.payments.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HandCoins className="size-4" /> Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-sm">
                        {format(new Date(payment.date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(payment.amount).toFixed(3)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.reference ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {payment.notes ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          disabled={isPending}
                          onClick={() => {
                            if (window.confirm('Delete this payment? This action cannot be undone.')) {
                              deletePaymentMutation.mutate({ paymentId: payment.id });
                            }
                          }}
                        >
                          <Trash className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Credit notes */}
        {invoice.creditNotes && invoice.creditNotes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Credit Notes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.creditNotes.map((cn: any) => (
                    <TableRow
                      key={cn.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/app/invoices/${cn.id}`)}
                    >
                      <TableCell className="font-medium">{cn.serial}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[cn.status] ?? ''}>
                          {cn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(cn.total).toFixed(3)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {invoice.notes && (
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Terms */}
        {invoice.termsText && (
          <Card>
            <CardHeader className="pb-1.5">
              <CardTitle className="text-xs text-muted-foreground font-medium">Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{invoice.termsText}</p>
            </CardContent>
          </Card>
        )}

        {/* Meta info */}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pb-2">
          <span>
            {typeLabel[invoice.type] ?? 'Document'} created by {invoice.createdBy?.name ?? '—'} on{' '}
            {invoice.createdAt ? format(new Date(invoice.createdAt), 'dd MMM yyyy HH:mm') : '—'}
          </span>
          <span>Version {invoice.version}</span>
          {invoice.sentAt && (
            <span>Sent on {format(new Date(invoice.sentAt), 'dd MMM yyyy HH:mm')}</span>
          )}
          {invoice.cancelledAt && (
            <span>Cancelled on {format(new Date(invoice.cancelledAt), 'dd MMM yyyy HH:mm')}</span>
          )}
        </div>
      </div>

      {/* Action footer */}
      {showActions && (
        <div className="border-t bg-background px-4 py-3 flex gap-2 justify-end shrink-0">
          {actions.map(({ label, key, icon, variant = 'default', dialog }) =>
            key === 'edit' ? (
              <Button key={key} variant={variant} onClick={handleEdit} disabled={isPending}>
                <Edit className="size-4 mr-1" /> Edit
              </Button>
            ) : key === 'convertQuote' ? (
              <Button
                key={key}
                variant={variant}
                onClick={() => {
                  if (window.confirm(`Convert ${invoice.serial} to invoice? A new invoice will be created.`)) {
                    convertQuoteMutation.mutate({ quoteId: invoice.id });
                  }
                }}
                disabled={isPending}
              >
                {convertQuoteMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
                {!convertQuoteMutation.isPending && icon}
                <span className="ml-1">{label}</span>
              </Button>
            ) : key === 'delete' ? (
              <Button
                key={key}
                variant={variant}
                onClick={() => {
                  if (window.confirm(`Delete ${invoice.serial}? This action cannot be undone.`)) {
                    deleteMutation.mutate({ id: invoice.id });
                  }
                }}
                disabled={isPending}
              >
                {deleteMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
                {!deleteMutation.isPending && icon}
                <span className="ml-1">{label}</span>
              </Button>
            ) : dialog === 'send' ? (
              <Button
                key={key}
                variant={variant}
                onClick={() => setSendOpen(true)}
                disabled={isPending}
              >
                <Send className="size-4 mr-1" /> {label}
              </Button>
            ) : dialog === 'cancel' ? (
              <Button
                key={key}
                variant={variant}
                onClick={() => setCancelOpen(true)}
                disabled={isPending}
              >
                <XCircle className="size-4 mr-1" /> {label}
              </Button>
            ) : dialog === 'payment' ? (
              <Button
                key={key}
                variant={variant}
                onClick={() => {
                  resetPaymentForm();
                  setPaymentOpen(true);
                }}
                disabled={isPending}
              >
                <Banknote className="size-4 mr-1" /> {label}
              </Button>
            ) : null,
          )}
        </div>
      )}

      {/* Send confirmation dialog */}
      <Dialog open={sendOpen} onOpenChange={(v) => !sendMutation.isPending && setSendOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send {typeLabel[invoice.type] ?? 'document'}</DialogTitle>
            <DialogDescription>
              {type === 'INVOICE'
                ? 'This will mark the invoice as sent and deduct stock from the warehouse. Continue?'
                : type === 'QUOTE'
                  ? 'This will mark the quote as sent to the customer.'
                  : `This will send the ${typeLabel[invoice.type]?.toLowerCase() ?? 'document'}. Continue?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sendMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => sendMutation.mutate({ id: invoice.id, version })}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              Send {typeLabel[invoice.type] ?? 'document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog
        open={cancelOpen}
        onOpenChange={(v) => {
          if (!cancelMutation.isPending) setCancelOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {typeLabel[invoice.type] ?? 'document'}</DialogTitle>
            <DialogDescription>
              Provide a reason for cancelling {invoice.serial}.
              {type === 'INVOICE' && ['SENT', 'PARTIAL', 'OVERDUE'].includes(status) &&
                ' Stock will be returned to the warehouse.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea
              id="cancel-reason"
              placeholder="Why is this being cancelled?"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelOpen(false);
                setCancelReason('');
              }}
              disabled={cancelMutation.isPending}
            >
              Keep
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                cancelMutation.mutate({ id: invoice.id, version, reason: cancelReason || undefined })
              }
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              Cancel {typeLabel[invoice.type] ?? 'document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment dialog */}
      <Dialog
        open={paymentOpen}
        onOpenChange={(v) => {
          if (!addPaymentMutation.isPending) setPaymentOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {invoice.serial}. Outstanding balance:{' '}
              {Number(invoice.amountDue).toFixed(3)} {invoice.currency}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Amount *</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-method">Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-date">Date</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-reference">Reference</Label>
              <Input
                id="payment-reference"
                placeholder="Check number, Txn ID, etc."
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes</Label>
              <Textarea
                id="payment-notes"
                placeholder="Optional notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentOpen(false)}
              disabled={addPaymentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const amount = parseFloat(paymentAmount);
                if (!amount || amount <= 0) {
                  toast.error('Please enter a valid amount');
                  return;
                }
                if (amount > Number(invoice.amountDue) + 0.000001) {
                  toast.error(`Amount exceeds outstanding balance of ${Number(invoice.amountDue).toFixed(3)}`);
                  return;
                }
                addPaymentMutation.mutate({
                  invoiceId: invoice.id,
                  amount,
                  method: paymentMethod as any,
                  date: paymentDate ? new Date(paymentDate) : new Date(),
                  reference: paymentReference || undefined,
                  notes: paymentNotes || undefined,
                });
              }}
              disabled={addPaymentMutation.isPending}
            >
              {addPaymentMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
