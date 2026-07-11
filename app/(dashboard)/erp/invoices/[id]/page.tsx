'use client';

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  Edit,
  HandCoins,
  Layers,
  Loader2,
  MoreHorizontal,
  Printer,
  Receipt,
  Send,
  ThumbsDown,
  Trash,
  User,
  Wallet,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInvoiceForm } from '@/components/dialogs/invoiceForm';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';
import { useDateFormat } from '@/hooks/use-date-format';

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

export function StatusStepper({
  status,
  type,
  paymentStatus,
}: {
  status: string;
  type: string;
  paymentStatus: string;
}) {
  const t = useTranslations();

  // 1. Determine base path
  const basePath =
    type === 'INVOICE'
      ? ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PAID']
      : ['DRAFT', 'SENT'];

  // 2. Dynamically inject PARTIAL to avoid duplicating UI logic
  const steps = [...basePath];
  const isPartiallyPaid = status === 'SENT' && paymentStatus === 'PARTIAL';

  if (isPartiallyPaid) {
    const sentIdx = steps.indexOf('SENT');
    if (sentIdx !== -1) {
      steps.splice(sentIdx + 1, 1, 'PARTIAL'); // Replaces PAID with PARTIAL
    }
  }

  // 3. Intelligently determine the current step index even if status is a branch
  const getActiveStepIndex = () => {
    if (isPartiallyPaid) return steps.indexOf('PARTIAL');
    if (status === 'OVERDUE' || status === 'DISPUTED') return steps.indexOf('SENT');
    if (status === 'PAID') return steps.indexOf('PAID');
    return steps.indexOf(status);
  };

  const activeIdx = getActiveStepIndex();
  const isBranch = !steps.includes(status) && !isPartiallyPaid;

  // Format step labels cleanly
  const formatLabel = (step: string) => {
    if (step === 'PENDING_APPROVAL') return t('invoices.approval');
    if (step === 'DRAFT') return t('invoices.draft');
    if (step === 'APPROVED') return t('invoices.approved');
    if (step === 'SENT') return t('invoices.sent');
    if (step === 'PAID') return t('invoices.paid');
    if (step === 'PARTIAL') return t('invoices.partial');
    return step.charAt(0) + step.slice(1).toLowerCase().replace(/_/g, ' ');
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6 pb-6">
        {/* STEPPER CONTAINER */}
        <div className="flex items-center justify-between w-full relative">
          {steps.map((step, idx) => {
            const isCompleted = activeIdx !== -1 && idx < activeIdx;
            const isCurrent = activeIdx === idx;

            return (
              <React.Fragment key={step}>
                {/* STEP INDICATOR */}
                <div className="flex flex-col items-center gap-2 relative z-10">
                  <div
                    className={`rounded-full border-2 size-8 flex items-center justify-center shrink-0 transition-colors ${
                      isCompleted || isCurrent
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted bg-background text-muted-foreground'
                    } ${isCurrent ? 'ring-4 ring-primary/20 ring-offset-background' : ''}`}
                  >
                    {isCompleted ? (
                      <Check className="size-3.5 stroke-3" />
                    ) : isCurrent ? (
                      <div className="size-2.5 rounded-full bg-current animate-pulse" />
                    ) : (
                      <div className="size-2 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>

                  {/* LABEL */}
                  <span
                    className={`absolute top-9 text-[11px] whitespace-nowrap text-center ${
                      isCompleted || isCurrent
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {formatLabel(step)}
                  </span>
                </div>

                {/* CONNECTING LINE (Flex-1 makes it stretch perfectly) */}
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5  mx-2 rounded-full transition-colors ${
                      isCompleted || (isCurrent && activeIdx > idx) ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* BRANCH / ALERT STATUS BANNER */}
        {isBranch && status !== 'PAID' && (
          <div className="mt-10 flex items-center justify-center animate-in fade-in slide-in-from-top-2">
            <Badge
              variant={
                status === 'OVERDUE' || status === 'CANCELLED' || status === 'DELETED'
                  ? 'destructive'
                  : 'secondary'
              }
              className={`px-3 py-1 text-xs gap-1.5 ${
                status === 'DISPUTED'
                  ? 'bg-orange-500/15 text-orange-600 hover:bg-orange-500/25 border-0'
                  : ''
              }`}
            >
              {status === 'OVERDUE' && <AlertCircle className="size-3.5" />}
              {status === 'DISPUTED' && <AlertTriangle className="size-3.5" />}
              {(status === 'CANCELLED' || status === 'DELETED') && <XCircle className="size-3.5" />}
              {status === 'DELETED'
                ? t('common.deleted')
                : status === 'OVERDUE'
                  ? t('invoices.overdue')
                  : status === 'CANCELLED'
                    ? t('invoices.cancelled')
                    : status.replace(/_/g, ' ')}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { openEdit } = useInvoiceForm();
  const t = useTranslations();
  const { formatDate, formatDateTime } = useDateFormat();

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
      router.push('/erp/invoices');
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
      router.push(`/erp/invoices/${result.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  function invalidate() {
    utils.invoices.byId.invalidate({ id: params.id });
    utils.invoices.list.invalidate();
  }

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
            <Button variant="outline" onClick={() => router.push('/erp/invoices')}>
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
  const type = invoice.type;

  if (type === 'QUOTE') {
    if (status === 'DRAFT') {
      actions.push({
        label: t('common.edit'),
        key: 'edit',
        icon: Edit,
        variant: 'outline',
      });
      actions.push({
        label: t('invoices.sendQuote'),
        key: 'send',
        icon: Send,
        dialog: 'send',
      });
      actions.push({
        label: t('invoices.convertToInvoice'),
        key: 'convertQuote',
        icon: Receipt,
      });
      actions.push({
        label: t('common.delete'),
        key: 'delete',
        icon: Trash,
        variant: 'destructive',
      });
    } else if (status === 'SENT') {
      actions.push({
        label: t('invoices.convertToInvoice'),
        key: 'convertQuote',
        icon: Receipt,
      });
      actions.push({
        label: t('invoices.cancelQuote'),
        key: 'cancel',
        icon: XCircle,
        variant: 'destructive',
        dialog: 'cancel',
      });
    } else if (status === 'CANCELLED' || status === 'DELETED') {
      // No actions for terminal states
    } else {
      actions.push({
        label: t('common.cancel'),
        key: 'cancel',
        icon: XCircle,
        variant: 'destructive',
        dialog: 'cancel',
      });
    }
  } else if (type === 'INVOICE') {
    if (status === 'DRAFT') {
      actions.push({
        label: t('common.edit'),
        key: 'edit',
        icon: Edit,
        variant: 'outline',
      });
      actions.push({
        label: t('invoices.submitForApproval'),
        key: 'submit',
        icon: Send,
      });
      actions.push({
        label: t('common.send'),
        key: 'send',
        icon: Send,
        dialog: 'send',
      });
      actions.push({
        label: t('common.delete'),
        key: 'delete',
        icon: Trash,
        variant: 'destructive',
      });
    } else if (status === 'PENDING_APPROVAL') {
      actions.push({
        label: t('common.approve'),
        key: 'approve',
        icon: CheckCircle,
      });
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
      actions.push({
        label: t('common.send'),
        key: 'send',
        icon: Send,
        dialog: 'send',
      });
      actions.push({
        label: t('common.cancel'),
        key: 'cancel',
        icon: XCircle,
        variant: 'destructive',
        dialog: 'cancel',
      });
    } else if (['SENT', 'PARTIAL', 'OVERDUE'].includes(status)) {
      actions.push({
        label: t('invoices.recordPayment'),
        key: 'payment',
        icon: Banknote,
        dialog: 'payment',
      });
      if (status !== 'OVERDUE') {
        actions.push({
          label: t('common.cancel'),
          key: 'cancel',
          icon: XCircle,
          variant: 'destructive',
          dialog: 'cancel',
        });
      }
    }
    // PAID, CANCELLED, DELETED, DISPUTED — no actions
  } else if (type === 'CREDIT_NOTE') {
    // Credit notes are mostly read-only after creation
    if (status === 'DRAFT') {
      actions.push({
        label: t('common.edit'),
        key: 'edit',
        icon: Edit,
        variant: 'outline',
      });
      actions.push({
        label: t('common.send'),
        key: 'send',
        icon: Send,
        dialog: 'send',
      });
      actions.push({
        label: t('common.delete'),
        key: 'delete',
        icon: Trash,
        variant: 'destructive',
      });
    }
  } else {
    // PROFORMA, DELIVERY_NOTE
    if (status === 'DRAFT') {
      actions.push({
        label: t('common.edit'),
        key: 'edit',
        icon: Edit,
        variant: 'outline',
      });
      actions.push({
        label: t('common.send'),
        key: 'send',
        icon: Send,
        dialog: 'send',
      });
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

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-14 items-center gap-2 px-2 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push('/erp/invoices')}>
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Receipt className="size-5 text-muted-foreground shrink-0" />
          <h1 className="text-xl font-semibold truncate">{invoice.serial}</h1>
        </div>
        {showActions && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/erp/invoices/${invoice.id}/print`)}
            >
              <Printer className="size-4 mr-1" /> {t('invoices.printPdf')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((a) => (
                  <DropdownMenuItem
                    key={a.key}
                    onClick={() => handleActionClick(a)}
                    disabled={isPending}
                    variant={a.variant === 'destructive' ? 'destructive' : 'default'}
                  >
                    <a.icon className="size-4" />
                    {a.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status pipeline visualization */}
        <StatusStepper
          status={invoice.status}
          type={invoice.type}
          paymentStatus={invoice.paymentStatus}
        />

        {/* Info card */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="flex items-start gap-3">
                <User className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('invoices.customer')}</p>
                  <p className="text-sm font-semibold truncate">
                    {invoice.customer?.name ??
                      (invoice.isWalkIn ? t('invoices.walkInCustomer') : '—')}
                  </p>
                  {invoice.customer?.email && (
                    <p className="text-xs text-muted-foreground truncate">
                      {invoice.customer.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('common.warehouse')}</p>
                  <p className="text-sm font-semibold truncate">{invoice.warehouse?.name ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('common.date')}</p>
                  <p className="text-sm font-semibold truncate">
                    {invoice.date ? formatDate(invoice.date) : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('invoices.dueDate')}</p>
                  <p className="text-sm font-semibold truncate">
                    {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wallet className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('common.currency')}</p>
                  <p className="text-sm font-semibold">{invoice.currency}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Layers className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('common.department')}</p>
                  <p className="text-sm font-semibold truncate">
                    {invoice.department?.name ?? '—'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parent invoice link (for credit notes) */}
        {invoice.parentInvoice && (
          <Card>
            <CardContent className="py-3">
              <p className="text-sm text-muted-foreground">
                {t('invoices.creditNoteFor')}{' '}
                <button
                  className="font-medium text-primary hover:underline"
                  onClick={() => router.push(`/erp/invoices/${invoice.parentInvoice!.id}`)}
                >
                  {invoice.parentInvoice.serial}
                </button>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Line items table with totals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t('invoices.lineItems')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[28%]">{t('invoices.item')}</TableHead>
                  <TableHead className="text-right">{t('invoices.qty')}</TableHead>
                  <TableHead className="text-right">{t('invoices.stock')}</TableHead>
                  <TableHead className="text-right">{t('invoices.unitPrice')}</TableHead>
                  <TableHead className="text-right">{t('invoices.discount')}</TableHead>
                  <TableHead className="text-right">{t('invoices.tax')}</TableHead>
                  <TableHead className="text-right">{t('invoices.total')}</TableHead>
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
                        <div className="text-xs text-muted-foreground italic">
                          {line.description}
                        </div>
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
                    <TableCell className="text-right">
                      {Number(line.unitPrice).toFixed(3)}
                    </TableCell>
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
                      {t('invoices.noLineItems')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <Separator className="mt-10" />
            <div className="flex justify-end px-4 py-3">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('invoices.subtotal')}</span>
                  <span>{Number(invoice.subtotal).toFixed(3)}</span>
                </div>
                {Number(invoice.discountTotal) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('invoices.discount')}</span>
                    <span className="text-destructive">
                      -{Number(invoice.discountTotal).toFixed(3)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('invoices.tax')}</span>
                  <span>{Number(invoice.taxTotal).toFixed(3)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>{t('invoices.total')}</span>
                  <span>
                    {Number(invoice.total).toFixed(3)} {invoice.currency}
                  </span>
                </div>
                {Number(invoice.amountPaid) > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                    <span>{t('invoices.amountPaid')}</span>
                    <span>
                      -{Number(invoice.amountPaid).toFixed(3)} {invoice.currency}
                    </span>
                  </div>
                )}
                {Number(invoice.amountDue) > 0 && (
                  <div className="flex justify-between text-destructive font-medium">
                    <span>{t('invoices.amountDue')}</span>
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
                    <TableHead>{t('invoices.paymentReference')}</TableHead>
                    <TableHead>{t('invoices.paymentNotes')}</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-sm">
                        {formatDate(payment.date)}
                      </TableCell>
                      <TableCell>
                        {t(
                          `common.paymentMethods.${payment.method.toLowerCase().replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`,
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(payment.amount).toFixed(3)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.reference ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-50 truncate">
                        {payment.notes ?? '—'}
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

        {/* Credit notes */}
        {invoice.creditNotes && invoice.creditNotes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{t('invoices.creditNotes')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('invoices.invoiceNumber')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('invoices.total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.creditNotes.map((cn: any) => (
                    <TableRow
                      key={cn.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/erp/invoices/${cn.id}`)}
                    >
                      <TableCell className="font-medium">{cn.serial}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[cn.status] ?? ''}>
                          {t(
                            ('invoices.' +
                              cn.status
                                .toLowerCase()
                                .replace(/_([a-z])/g, (_: string, c: string) =>
                                  c.toUpperCase(),
                                )) as any,
                          )}
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
              <CardTitle className="text-xs text-muted-foreground font-medium">
                {t('invoices.notes')}
              </CardTitle>
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
              <CardTitle className="text-xs text-muted-foreground font-medium">
                {t('invoices.termsAndConditions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none dark:prose-invert text-foreground [&_ol]:list-decimal [&_ul]:list-disc"
                dangerouslySetInnerHTML={{ __html: invoice.termsText }}
              />
            </CardContent>
          </Card>
        )}

        {/* Meta info */}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pb-2">
          <span>
            {t('invoices.createdBy', {
              type: getTypeLabel(invoice.type),
              name: invoice.createdBy?.name ?? '—',
              date: invoice.createdAt
                ? formatDateTime(invoice.createdAt)
                : '—',
            })}
          </span>
          <span>{t('invoices.version', { version: invoice.version })}</span>
          {invoice.sentAt && (
            <span>
              {t('invoices.sentOn', {
                date: formatDateTime(invoice.sentAt),
              })}
            </span>
          )}
          {invoice.cancelledAt && (
            <span>
              {t('invoices.cancelledOn', {
                date: formatDateTime(invoice.cancelledAt),
              })}
            </span>
          )}
        </div>
      </div>

      {/* Send confirmation dialog */}
      <Dialog open={sendOpen} onOpenChange={(v) => !sendMutation.isPending && setSendOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('invoices.sendDialogTitle', { type: getTypeLabel(invoice.type) })}
            </DialogTitle>
            <DialogDescription>
              {type === 'INVOICE'
                ? t('invoices.sendDialogDesc')
                : type === 'QUOTE'
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
              {type === 'INVOICE' &&
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
              {invoice.serial} - {t('invoices.outstanding')}: {Number(invoice.amountDue).toFixed(3)}{' '}
              {invoice.currency}
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
                          {t(
                            `common.paymentMethods.${value.toLowerCase().replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`,
                          )}
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
                if (amount > Number(invoice.amountDue) + 0.000001) {
                  toast.error(
                    t('invoices.amountExceedsBalance', {
                      balance: Number(invoice.amountDue).toFixed(3),
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
