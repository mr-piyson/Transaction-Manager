'use client';

import {
  ArrowLeft,
  Banknote,
  CheckCircle,
  Edit,
  FileText,
  HandCoins,
  History,
  Loader2,
  MoreHorizontal,
  Printer,
  Receipt,
  RotateCcw,
  Send,
  ThumbsDown,
  Trash,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
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
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { InvoiceHistoryPanel } from '@/components/invoices/invoice-history-panel';
import { trpc } from '@/lib/trpc/client';
import { useDateFormat } from '@/hooks/use-date-format';
import { useIsMobile } from '@/hooks/use-mobile';

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

export default function DocumentDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ type: string; id: string }>();
  const type = params.type;
  const isInvoice = type === 'invoices';
  const { openEdit, openCreate } = useInvoiceForm();
  const utils = trpc.useUtils();
  const { formatDate, formatDateTime, formatDateForInput } = useDateFormat();

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
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    action: string;
    title: string;
    description: string;
  }>({ open: false, action: '', title: '', description: '' });
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState('CASH');
  const [paymentDate, setPaymentDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [paymentReference, setPaymentReference] = React.useState('');
  const [paymentNotes, setPaymentNotes] = React.useState('');
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const isMobile = useIsMobile();

  function invalidate() {
    utils.invoices.byId.invalidate({ id: params.id });
    utils.invoices.list.invalidate();
  }

  const submitForApprovalMutation = trpc.invoices.submitForApproval.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t('invoices.submittedForApproval'));
    },
    onError: (e) => toast.error(e.message),
  });

  const approveMutation = trpc.invoices.approve.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t('invoices.invoiceApproved'));
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.invoices.reject.useMutation({
    onSuccess: () => {
      setRejectOpen(false);
      setRejectReason('');
      invalidate();
      toast.success(t('invoices.invoiceRejected'));
    },
    onError: (e) => toast.error(e.message),
  });

  const sendMutation = trpc.invoices.send.useMutation({
    onSuccess: () => {
      setSendOpen(false);
      invalidate();
      toast.success(t('invoices.invoiceSent'));
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.invoices.cancel.useMutation({
    onSuccess: () => {
      setCancelOpen(false);
      setCancelReason('');
      invalidate();
      toast.success(t('invoices.invoiceCancelled'));
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      toast.success(t('invoices.invoiceDeleted'));
      router.push(`/erp/documents/${type}`);
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
      toast.success(t('invoices.paymentRecorded'));
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePaymentMutation = trpc.invoices.deletePayment.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t('invoices.paymentDeleted'));
    },
    onError: (e) => toast.error(e.message),
  });

  const convertQuoteMutation = trpc.invoices.convertQuote.useMutation({
    onSuccess: (result) => {
      invalidate();
      toast.success(t('invoices.quoteConverted'));
      router.push(`/erp/documents/invoices/${result.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending =
    submitForApprovalMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
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
            <EmptyTitle>{isError ? t('common.errorOccurred') : t('common.notFound')}</EmptyTitle>
            <EmptyDescription>{error?.message ?? t('errors.notFound')}</EmptyDescription>
          </EmptyHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(`/erp/documents/${type}`)}>
              <ArrowLeft className="size-4 mr-1" /> {t('common.back')}
            </Button>
            {isError && <Button onClick={() => refetch()}>{t('common.retry')}</Button>}
          </div>
        </Empty>
      </div>
    );
  }

  const version = invoice.version ?? 0;

  const handleConfirmAction = (action: string) => {
    switch (action) {
      case 'submit':
        submitForApprovalMutation.mutate({ id: invoice.id, version });
        break;
      case 'approve':
        approveMutation.mutate({ id: invoice.id, version });
        break;
    }
  };

  const openConfirmDialog = (action: string) => {
    const labels: Record<string, { title: string; description: string }> = {
      submit: {
        title: t('invoices.submitForApproval'),
        description: t('invoices.confirmSubmitForApproval', { serial: invoice.serial }),
      },
      approve: {
        title: t('invoices.approveInvoiceTitle'),
        description: t('invoices.confirmApproveInvoice', { serial: invoice.serial }),
      },
    };
    const config = labels[action];
    if (!config) return;
    setConfirmDialog({ open: true, action, ...config });
  };

  const handleEdit = () => {
    openEdit(
      {
        id: invoice.id,
        version,
        type: invoice.type as any,
        date: invoice.date ? formatDateForInput(invoice.date) : undefined,
        dueDate: invoice.dueDate ? formatDateForInput(invoice.dueDate) : undefined,
        customerId: invoice.customerId ?? undefined,
        warehouseId: invoice.warehouseId ?? undefined,
        departmentId: invoice.departmentId ?? undefined,
        currency: invoice.currency as any,
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'QUOTE':
        return t('invoices.quote');
      case 'INVOICE':
        return t('invoices.invoice');
      case 'CREDIT_NOTE':
        return t('invoices.creditNote');
      case 'DELIVERY_NOTE':
        return t('invoices.deliveryNote');
      default:
        return t('invoices.invoice');
    }
  };

  type Action = {
    label: string;
    key: string;
    icon: LucideIcon;
    variant?: 'default' | 'destructive' | 'outline';
    dialog?: 'send' | 'cancel' | 'payment' | 'reject';
  };

  const actions: Action[] = [];
  const status = invoice.status;
  const invoiceType = invoice.type;

  if (invoiceType === 'QUOTE') {
    if (status === 'DRAFT') {
      actions.push({ label: t('common.edit'), key: 'edit', icon: Edit, variant: 'outline' });
      actions.push({ label: t('invoices.sendQuote'), key: 'send', icon: Send, dialog: 'send' });
      actions.push({ label: t('invoices.convertToInvoice'), key: 'convertQuote', icon: Receipt });
      actions.push({
        label: t('common.delete'),
        key: 'delete',
        icon: Trash,
        variant: 'destructive',
      });
    } else if (status === 'SENT') {
      actions.push({ label: t('invoices.convertToInvoice'), key: 'convertQuote', icon: Receipt });
      actions.push({
        label: t('invoices.cancelQuote'),
        key: 'cancel',
        icon: XCircle,
        variant: 'destructive',
        dialog: 'cancel',
      });
    }
  } else if (invoiceType === 'INVOICE') {
    if (status === 'DRAFT') {
      actions.push({ label: t('common.edit'), key: 'edit', icon: Edit, variant: 'outline' });
      actions.push({ label: t('invoices.submitForApproval'), key: 'submit', icon: Send });
      actions.push({ label: t('common.send'), key: 'send', icon: Send, dialog: 'send' });
      actions.push({
        label: t('common.delete'),
        key: 'delete',
        icon: Trash,
        variant: 'destructive',
      });
    } else if (status === 'PENDING_APPROVAL') {
      actions.push({ label: t('common.approve'), key: 'approve', icon: CheckCircle });
      actions.push({
        label: t('common.reject'),
        key: 'reject',
        icon: ThumbsDown,
        variant: 'destructive',
        dialog: 'reject',
      });
      actions.push({
        label: t('common.cancel'),
        key: 'cancel',
        icon: XCircle,
        variant: 'destructive',
        dialog: 'cancel',
      });
    } else if (status === 'APPROVED') {
      actions.push({ label: t('common.send'), key: 'send', icon: Send, dialog: 'send' });
      actions.push({
        label: t('common.cancel'),
        key: 'cancel',
        icon: XCircle,
        variant: 'destructive',
        dialog: 'cancel',
      });
    } else if (['SENT', 'PARTIAL', 'PAID', 'OVERDUE'].includes(status)) {
      if (status !== 'PAID') {
        actions.push({
          label: t('invoices.recordPayment'),
          key: 'payment',
          icon: Banknote,
          dialog: 'payment',
        });
      }
      actions.push({
        label: t('invoices.createCreditNote'),
        key: 'createCreditNote',
        icon: RotateCcw,
        variant: 'outline',
      });
      if (!['PAID', 'OVERDUE'].includes(status)) {
        actions.push({
          label: t('common.cancel'),
          key: 'cancel',
          icon: XCircle,
          variant: 'destructive',
          dialog: 'cancel',
        });
      }
    }
  } else if (invoiceType === 'CREDIT_NOTE') {
    if (status === 'DRAFT') {
      actions.push({ label: t('common.edit'), key: 'edit', icon: Edit, variant: 'outline' });
      actions.push({ label: t('common.send'), key: 'send', icon: Send, dialog: 'send' });
      actions.push({
        label: t('common.delete'),
        key: 'delete',
        icon: Trash,
        variant: 'destructive',
      });
    }
  } else {
    if (status === 'DRAFT') {
      actions.push({ label: t('common.edit'), key: 'edit', icon: Edit, variant: 'outline' });
      actions.push({ label: t('common.send'), key: 'send', icon: Send, dialog: 'send' });
      actions.push({
        label: t('common.delete'),
        key: 'delete',
        icon: Trash,
        variant: 'destructive',
      });
    } else if (status === 'SENT') {
      actions.push({
        label: t('common.cancel'),
        key: 'cancel',
        icon: XCircle,
        variant: 'destructive',
        dialog: 'cancel',
      });
    }
  }

  const showActions = actions.length > 0;

  const handleActionClick = (action: Action) => {
    switch (action.key) {
      case 'edit':
        handleEdit();
        break;
      case 'submit':
      case 'approve':
        openConfirmDialog(action.key);
        break;
      case 'convertQuote':
        if (window.confirm(t('invoices.convertToInvoiceTitle', { serial: invoice.serial }))) {
          convertQuoteMutation.mutate({ quoteId: invoice.id });
        }
        break;
      case 'createCreditNote':
        openCreate({
          defaults: {
            type: 'CREDIT_NOTE',
            parentInvoiceId: invoice.id,
            customerId: invoice.customerId ?? undefined,
            warehouseId: invoice.warehouseId ?? undefined,
            currency: invoice.currency as any,
            exchangeRate: Number(invoice.exchangeRate),
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
          onSuccess: () => {
            utils.invoices.byId.invalidate({ id: invoice.id });
            utils.invoices.list.invalidate();
          },
        });
        break;
      case 'delete':
        if (window.confirm(t('common.confirmDelete', { name: invoice.serial }))) {
          deleteMutation.mutate({ id: invoice.id });
        }
        break;
      default:
        switch (action.dialog) {
          case 'send':
            setSendOpen(true);
            break;
          case 'reject':
            setRejectOpen(true);
            break;
          case 'cancel':
            setCancelOpen(true);
            break;
          case 'payment':
            resetPaymentForm();
            setPaymentOpen(true);
            break;
        }
    }
  };

  const totalQty = invoice.lines?.reduce((sum: number, l: any) => sum + Number(l.quantity), 0);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
            {isInvoice ? (
              <Receipt className="size-6 text-muted-foreground" />
            ) : (
              <FileText className="size-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{invoice.serial}</h1>
              <Badge className={STATUS_COLORS[invoice.status] ?? ''}>{invoice.status}</Badge>
              {invoice.paymentStatus && isInvoice && (
                <Badge variant="outline">{invoice.paymentStatus}</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {invoice.customer?.name ?? '—'} · {invoice.date ? formatDate(invoice.date) : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/erp/documents/${type}`)}>
            <ArrowLeft className="size-4 mr-1" /> {t('common.back')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="md:hidden"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="size-4 mr-1" /> {t('invoices.history')}
          </Button>
          {showActions && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/erp/documents/${type}/${invoice.id}/print`)}
              >
                <Printer className="size-4 mr-1" /> {t('invoices.printPdf')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.map((a) => (
                    <DropdownMenuItem
                      key={a.key}
                      onClick={() => handleActionClick(a)}
                      disabled={isPending}
                    >
                      <a.icon className="size-4 mr-2" />
                      {a.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      <Separator />

      {/* Main content + History panel */}
      <div className="flex gap-6">
        <div className="flex-1 min-w-0 space-y-6">
          {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{t('invoices.issueDate')}</p>
          <p className="font-medium">{invoice.date ? formatDate(invoice.date) : '—'}</p>
        </div>
        {invoice.dueDate && (
          <div>
            <p className="text-sm text-muted-foreground">{t('invoices.dueDate')}</p>
            <p className="font-medium">{formatDate(invoice.dueDate)}</p>
          </div>
        )}
        {invoice.customer && (
          <div>
            <p className="text-sm text-muted-foreground">{t('invoices.customer')}</p>
            <p className="font-medium">{invoice.customer.name}</p>
            <p className="text-xs text-muted-foreground">
              {(invoice.customer as any).vatNumber ?? (invoice.customer as any).taxId ?? ''}
            </p>
          </div>
        )}
        {isInvoice && (invoice as any).warehouse && (
          <div>
            <p className="text-sm text-muted-foreground">{t('invoices.warehouse')}</p>
            <p className="font-medium">{(invoice as any).warehouse?.name}</p>
          </div>
        )}
        {invoice.currency && (
          <div>
            <p className="text-sm text-muted-foreground">{t('invoices.currency')}</p>
            <p className="font-medium">{invoice.currency}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">{t('common.status')}</p>
          <Badge className={STATUS_COLORS[invoice.status] ?? ''}>{invoice.status}</Badge>
        </div>
        {(invoice as any).createdBy && (
          <div>
            <p className="text-sm text-muted-foreground">{t('common.createdBy')}</p>
            <p className="font-medium">{(invoice as any).createdBy?.name ?? '—'}</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Line Items */}
      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">#</TableHead>
                <TableHead>{t('invoices.item')}</TableHead>
                <TableHead className="text-right">{t('invoices.qty')}</TableHead>
                <TableHead className="text-right">{t('invoices.stock')}</TableHead>
                <TableHead className="text-right">{t('invoices.unitPrice')}</TableHead>
                <TableHead className="text-right">{t('invoices.discount')}</TableHead>
                <TableHead className="text-right">{t('invoices.tax')}</TableHead>
                <TableHead className="text-right pr-6">{t('invoices.total')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines?.map((line: any, i: number) => (
                <TableRow key={line.id ?? i}>
                  <TableCell className="pl-6 text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <p className="font-medium">{line.item?.name ?? line.description ?? '—'}</p>
                    {line.item?.sku && (
                      <p className="text-xs text-muted-foreground">{line.item.sku}</p>
                    )}
                    {line.description && (
                      <p className="text-xs text-muted-foreground italic">{line.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(line.quantity).toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
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
                  <TableCell className="text-right tabular-nums">
                    {Number(line.unitPrice).toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(line.discountAmt).toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
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
                  <TableCell className="text-right pr-6 tabular-nums font-medium">
                    {Number(line.total).toFixed(3)}
                  </TableCell>
                </TableRow>
              ))}
              {invoice.lines?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                    {t('invoices.noLineItems')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Separator />
          {/* Totals */}
          <div className="flex justify-end p-5 pb-0">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('invoices.subtotal')}</span>
                <span className="tabular-nums">{Number(invoice.subtotal).toFixed(3)}</span>
              </div>
              {Number(invoice.discountTotal) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('invoices.discount')}</span>
                  <span className="tabular-nums text-destructive">
                    -{Number(invoice.discountTotal).toFixed(3)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('invoices.tax')}</span>
                <span className="tabular-nums">{Number(invoice.taxTotal).toFixed(3)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>{t('invoices.total')}</span>
                <span className="tabular-nums">
                  {Number(invoice.total).toFixed(3)} {invoice.currency}
                </span>
              </div>
              {isInvoice && Number((invoice as any).amountPaid) > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{t('invoices.amountPaid')}</span>
                    <span className="tabular-nums">
                      {Number((invoice as any).amountPaid).toFixed(3)} {invoice.currency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600">
                    <span>{t('invoices.balanceDue')}</span>
                    <span className="tabular-nums">
                      {Number((invoice as any).amountDue).toFixed(3)} {invoice.currency}
                    </span>
                  </div>
                </>
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
              <HandCoins className="size-4" /> {t('invoices.payments')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invoices.date')}</TableHead>
                  <TableHead>{t('invoices.paymentMethod')}</TableHead>
                  <TableHead className="text-right">{t('invoices.amount')}</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm">{formatDate(payment.date)}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(payment.amount).toFixed(3)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        disabled={isPending}
                        onClick={() => {
                          if (window.confirm(t('invoices.deletePaymentConfirm'))) {
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

      {/* Notes */}
      {invoice.notes && (
        <>
          <Separator />
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('invoices.notes')}</p>
            <p className="whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        </>
      )}

      {/* Terms */}
      {(invoice as any).termsText && (
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              {t('invoices.termsAndConditions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none dark:prose-invert text-foreground [&_ol]:list-decimal [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: (invoice as any).termsText }}
            />
          </CardContent>
        </Card>
      )}

      </div>{/* end flex-1 */}

      {/* History side panel — desktop */}
      <div className="w-80 shrink-0 hidden md:block">
        <InvoiceHistoryPanel
          invoice={invoice}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          onNavigate={(path) => router.push(path)}
        />
      </div>
      </div>{/* end flex */}

      {/* History side panel — mobile */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-3/4 sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="size-4" />
              {t('invoices.history')}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100dvh-8rem)]">
            <InvoiceHistoryPanel
              invoice={invoice}
              formatDate={formatDate}
              formatDateTime={formatDateTime}
              onNavigate={(path) => {
                setHistoryOpen(false);
                router.push(path);
              }}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Send confirmation dialog */}
      <Dialog open={sendOpen} onOpenChange={(v) => !sendMutation.isPending && setSendOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('invoices.sendDialogTitle', { type: getTypeLabel(invoice.type) })}
            </DialogTitle>
            <DialogDescription>
              {invoiceType === 'INVOICE'
                ? t('invoices.sendDialogDesc')
                : invoiceType === 'QUOTE'
                  ? t('invoices.sendQuoteDialogDesc')
                  : t('invoices.sendDialogDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendOpen(false)}
              disabled={sendMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => sendMutation.mutate({ id: invoice.id, version })}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              {t('common.send')} {getTypeLabel(invoice.type)}
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
            <DialogTitle>
              {t('invoices.cancelDialogTitle', { type: getTypeLabel(invoice.type) })}
            </DialogTitle>
            <DialogDescription>
              {t('invoices.cancelDialogDesc', { serial: invoice.serial })}
              {invoiceType === 'INVOICE' &&
                ['SENT', 'PARTIAL', 'OVERDUE'].includes(status) &&
                ` ${t('invoices.stockReturned')}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="cancel-reason">{t('common.reason')}</Label>
            <Textarea
              id="cancel-reason"
              placeholder={t('invoices.cancelReasonPlaceholder')}
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
              {t('common.keep')}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                cancelMutation.mutate({
                  id: invoice.id,
                  version,
                  reason: cancelReason || undefined,
                })
              }
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              {t('common.cancel')} {getTypeLabel(invoice.type)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm action dialog (submit for approval / approve) */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(v) => {
          if (!submitForApprovalMutation.isPending && !approveMutation.isPending)
            setConfirmDialog((prev) => ({ ...prev, open: v }));
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ open: false, action: '', title: '', description: '' })
              }
              disabled={isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                handleConfirmAction(confirmDialog.action);
                setConfirmDialog({ open: false, action: '', title: '', description: '' });
              }}
              disabled={isPending}
            >
              {isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              {confirmDialog.action === 'approve'
                ? t('common.approve')
                : t('invoices.submitForApproval')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog
        open={rejectOpen}
        onOpenChange={(v) => {
          if (!rejectMutation.isPending) setRejectOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('invoices.rejectInvoiceTitle')}</DialogTitle>
            <DialogDescription>
              {t('invoices.rejectInvoiceDesc', { serial: invoice.serial })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="reject-reason">{t('common.reason')}</Label>
            <Textarea
              id="reject-reason"
              placeholder={t('invoices.rejectReasonPlaceholder')}
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
                rejectMutation.mutate({
                  id: invoice.id,
                  version,
                  reason: rejectReason || undefined,
                })
              }
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              {t('invoices.rejectInvoice')}
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
            <DialogTitle>{t('invoices.recordPayment')}</DialogTitle>
            <DialogDescription>
              {invoice.serial} - {t('invoices.outstanding')}:{' '}
              {Number((invoice as any).amountDue).toFixed(3)} {invoice.currency}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="payment-amount">{t('invoices.paymentAmount')} *</Label>
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
                <Label htmlFor="payment-method">{t('invoices.paymentMethod')} *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'ONLINE', 'CREDIT', 'OTHER'].map(
                      (value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-date">{t('invoices.date')}</Label>
              <DatePicker
                id="payment-date"
                value={paymentDate}
                onChange={(v) => setPaymentDate(v)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-reference">{t('invoices.paymentReference')}</Label>
              <Input
                id="payment-reference"
                placeholder={t('invoices.paymentReference')}
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-notes">{t('invoices.paymentNotes')}</Label>
              <Textarea
                id="payment-notes"
                placeholder={t('common.optionalNotes')}
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
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                const amount = parseFloat(paymentAmount);
                if (!amount || amount <= 0) {
                  toast.error(t('invoices.enterValidAmount'));
                  return;
                }
                if (amount > Number((invoice as any).amountDue) + 0.000001) {
                  toast.error(
                    t('invoices.amountExceedsBalance', {
                      balance: Number((invoice as any).amountDue).toFixed(3),
                    }),
                  );
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
              {t('invoices.recordPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
