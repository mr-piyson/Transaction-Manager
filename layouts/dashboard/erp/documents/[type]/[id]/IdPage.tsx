"use client";

import {
  ArrowLeft,
  Banknote,
  CheckCircle,
  Copy,
  Edit,
  FileText,
  HandCoins,
  Loader2,
  type LucideIcon,
  MoreHorizontal,
  Printer,
  Receipt,
  RotateCcw,
  Send,
  ThumbsDown,
  Trash,
  Trash2,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";
import { InvoiceFormBody } from "@/components/invoice/invoiceFormBody";
import { DetailPageHeader } from "@/components/detail-page-header";
import { useHardDeleteForm } from "@/components/dialogs/hardDeleteForm";
import { usePaymentForm } from "@/components/dialogs/paymentForm";
import { InvoiceHistoryPanel } from "@/components/invoices/invoice-history-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAppAbility } from "@/hooks/use-app-ability";
import { useDateFormat } from "@/hooks/use-date-format";
import { trpc } from "@/lib/trpc/client";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_APPROVAL:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  INVOICED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  PARTIAL: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  DISPUTED:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  DELETED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export default function DocumentDetailPage({
  documentType,
}: {
  documentType: "invoices" | "quotations";
}) {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const type = documentType;
  const isInvoice = type === "invoices";
  const { openCreate: openPayment } = usePaymentForm();
  const { openDialog: openHardDelete } = useHardDeleteForm();
  const utils = trpc.useUtils();
  const { formatDate, formatDateTime } = useDateFormat();
  const { data: me } = trpc.auth.me.useQuery();
  const isSuperAdmin = me?.platformRole === "SUPER_ADMIN";
  const ability = useAppAbility();

  const {
    data: invoice,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.invoices.byId.useQuery({ id: params.id }, { enabled: !!params.id });

  const { data: orgData } = trpc.organizations.get.useQuery();

  const [sendOpen, setSendOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    action: string;
    title: string;
    description: string;
  }>({ open: false, action: "", title: "", description: "" });
  const [historyOpen, setHistoryOpen] = React.useState(false);

  function invalidate() {
    utils.invoices.byId.invalidate({ id: params.id });
    utils.invoices.list.invalidate();
  }

  const submitForApprovalMutation = trpc.invoices.submitForApproval.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t("invoices.submittedForApproval"));
    },
    onError: (e) => toast.error(e.message),
  });

  const approveMutation = trpc.invoices.approve.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t("invoices.invoiceApproved"));
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectMutation = trpc.invoices.reject.useMutation({
    onSuccess: () => {
      setRejectOpen(false);
      setRejectReason("");
      invalidate();
      toast.success(t("invoices.invoiceRejected"));
    },
    onError: (e) => toast.error(e.message),
  });

  const sendMutation = trpc.invoices.send.useMutation({
    onSuccess: () => {
      setSendOpen(false);
      invalidate();
      toast.success(t("invoices.invoiceSent"));
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.invoices.cancel.useMutation({
    onSuccess: () => {
      setCancelOpen(false);
      setCancelReason("");
      invalidate();
      toast.success(t("invoices.invoiceCancelled"));
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      toast.success(t("invoices.invoiceDeleted"));
      router.push(`/erp/documents/${type}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePaymentMutation = trpc.invoices.deletePayment.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t("invoices.paymentDeleted"));
    },
    onError: (e) => toast.error(e.message),
  });

  const convertQuoteMutation = trpc.invoices.convertQuote.useMutation({
    onSuccess: (result) => {
      invalidate();
      toast.success(t("invoices.quoteConverted"));
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
    deletePaymentMutation.isPending ||
    convertQuoteMutation.isPending;

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
            <EmptyTitle>
              {isError ? t("common.errorOccurred") : t("common.notFound")}
            </EmptyTitle>
            <EmptyDescription>
              {error?.message ?? t("errors.notFound")}
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/erp/documents/${type}`)}
            >
              <ArrowLeft className="size-4 mr-1" /> {t("common.back")}
            </Button>
            {isError && (
              <Button onClick={() => refetch()}>{t("common.retry")}</Button>
            )}
          </div>
        </Empty>
      </div>
    );
  }

  const version = invoice.version ?? 0;

  const handleConfirmAction = (action: string) => {
    switch (action) {
      case "submit":
        submitForApprovalMutation.mutate({ id: invoice.id, version });
        break;
      case "approve":
        approveMutation.mutate({ id: invoice.id, version });
        break;
    }
  };

  const openConfirmDialog = (action: string) => {
    const labels: Record<string, { title: string; description: string }> = {
      submit: {
        title: t("invoices.submitForApproval"),
        description: t("invoices.confirmSubmitForApproval", {
          serial: invoice.serial,
        }),
      },
      approve: {
        title: t("invoices.approveInvoiceTitle"),
        description: t("invoices.confirmApproveInvoice", {
          serial: invoice.serial,
        }),
      },
    };
    const config = labels[action];
    if (!config) return;
    setConfirmDialog({ open: true, action, ...config });
  };

  const handleEdit = () => {
    router.push(`/erp/documents/${documentType}/${invoice.id}/edit`);
  };

  const handleDuplicate = () => {
    router.push(
      `/erp/documents/${documentType}/new?source=${invoice.id}&sourceType=duplicate`,
    );
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "QUOTE":
        return t("invoices.quote");
      case "INVOICE":
        return t("invoices.invoice");
      case "CREDIT_NOTE":
        return t("invoices.creditNote");
      case "DELIVERY_NOTE":
        return t("invoices.deliveryNote");
      default:
        return t("invoices.invoice");
    }
  };

  type Action = {
    label: string;
    key: string;
    icon: LucideIcon;
    variant?: "default" | "destructive" | "outline";
    dialog?: "send" | "cancel" | "payment" | "reject";
  };

  const actions: Action[] = [];
  const status = invoice.status;
  const invoiceType = invoice.type;

  if (ability?.can("invoice:create", "Invoice")) {
    actions.push({
      label: t("common.duplicate"),
      key: "duplicate",
      icon: Copy,
      variant: "outline",
    });
  }

  actions.push({
    label: t("common.print"),
    key: "print",
    icon: Printer,
  });

  if (invoiceType === "QUOTE") {
    if (status === "DRAFT") {
      actions.push({
        label: t("common.edit"),
        key: "edit",
        icon: Edit,
        variant: "outline",
      });
      actions.push({
        label: t("invoices.sendQuote"),
        key: "send",
        icon: Send,
        dialog: "send",
      });
      actions.push({
        label: t("invoices.convertToInvoice"),
        key: "convertQuote",
        icon: Receipt,
      });
      actions.push({
        label: t("common.delete"),
        key: "delete",
        icon: Trash,
        variant: "destructive",
      });
    } else if (status === "SENT") {
      actions.push({
        label: t("invoices.convertToInvoice"),
        key: "convertQuote",
        icon: Receipt,
      });
      actions.push({
        label: t("invoices.cancelQuote"),
        key: "cancel",
        icon: XCircle,
        variant: "destructive",
        dialog: "cancel",
      });
    }
  } else if (invoiceType === "INVOICE") {
    if (status === "DRAFT") {
      actions.push({
        label: t("common.edit"),
        key: "edit",
        icon: Edit,
        variant: "outline",
      });
      actions.push({
        label: t("invoices.submitForApproval"),
        key: "submit",
        icon: Send,
      });
      actions.push({
        label: t("common.send"),
        key: "send",
        icon: Send,
        dialog: "send",
      });
      actions.push({
        label: t("common.delete"),
        key: "delete",
        icon: Trash,
        variant: "destructive",
      });
    } else if (status === "PENDING_APPROVAL") {
      actions.push({
        label: t("common.approve"),
        key: "approve",
        icon: CheckCircle,
      });
      actions.push({
        label: t("common.reject"),
        key: "reject",
        icon: ThumbsDown,
        variant: "destructive",
        dialog: "reject",
      });
      actions.push({
        label: t("common.cancel"),
        key: "cancel",
        icon: XCircle,
        variant: "destructive",
        dialog: "cancel",
      });
    } else if (status === "APPROVED") {
      actions.push({
        label: t("common.send"),
        key: "send",
        icon: Send,
        dialog: "send",
      });
      actions.push({
        label: t("common.cancel"),
        key: "cancel",
        icon: XCircle,
        variant: "destructive",
        dialog: "cancel",
      });
    } else if (["SENT", "PARTIAL", "PAID", "OVERDUE"].includes(status)) {
      if (status !== "PAID") {
        actions.push({
          label: t("invoices.recordPayment"),
          key: "payment",
          icon: Banknote,
          dialog: "payment",
        });
      }
      actions.push({
        label: t("invoices.createCreditNote"),
        key: "createCreditNote",
        icon: RotateCcw,
        variant: "outline",
      });
      if (!["PAID", "OVERDUE"].includes(status)) {
        actions.push({
          label: t("common.cancel"),
          key: "cancel",
          icon: XCircle,
          variant: "destructive",
          dialog: "cancel",
        });
      }
    }
  } else if (invoiceType === "CREDIT_NOTE") {
    if (status === "DRAFT") {
      actions.push({
        label: t("common.edit"),
        key: "edit",
        icon: Edit,
        variant: "outline",
      });
      actions.push({
        label: t("common.send"),
        key: "send",
        icon: Send,
        dialog: "send",
      });
      actions.push({
        label: t("common.delete"),
        key: "delete",
        icon: Trash,
        variant: "destructive",
      });
    }
  } else {
    if (status === "DRAFT") {
      actions.push({
        label: t("common.edit"),
        key: "edit",
        icon: Edit,
        variant: "outline",
      });
      actions.push({
        label: t("common.send"),
        key: "send",
        icon: Send,
        dialog: "send",
      });
      actions.push({
        label: t("common.delete"),
        key: "delete",
        icon: Trash,
        variant: "destructive",
      });
    } else if (status === "SENT") {
      actions.push({
        label: t("common.cancel"),
        key: "cancel",
        icon: XCircle,
        variant: "destructive",
        dialog: "cancel",
      });
    }
  }

  if (isSuperAdmin) {
    actions.push({
      label: t("hardDelete.menu"),
      key: "hardDelete",
      icon: Trash2,
      variant: "destructive",
    });
  }

  const showActions = actions.length > 0;

  const handleActionClick = (action: Action) => {
    switch (action.key) {
      case "edit":
        handleEdit();
        break;
      case "duplicate":
        handleDuplicate();
        break;
      case "print":
        router.push(`/erp/documents/${documentType}/${invoice.id}/print`);
        break;
      case "submit":
      case "approve":
        openConfirmDialog(action.key);
        break;
      case "convertQuote":
        if (
          window.confirm(
            t("invoices.convertToInvoiceTitle", { serial: invoice.serial }),
          )
        ) {
          convertQuoteMutation.mutate({ quoteId: invoice.id });
        }
        break;
      case "createCreditNote":
        router.push(
          `/erp/documents/${documentType}/new?source=${invoice.id}&sourceType=creditNote`,
        );
        break;
      case "delete":
        if (
          window.confirm(t("common.confirmDelete", { name: invoice.serial }))
        ) {
          deleteMutation.mutate({ id: invoice.id });
        }
        break;
      case "hardDelete":
        openHardDelete({
          kind: "invoice",
          id: invoice.id,
          title: invoice.serial,
        });
        break;
      default:
        switch (action.dialog) {
          case "send":
            setSendOpen(true);
            break;
          case "reject":
            setRejectOpen(true);
            break;
          case "cancel":
            setCancelOpen(true);
            break;
          case "payment":
            openPayment({
              id: invoice.id,
              serial: invoice.serial,
              total: Number(invoice.total),
              amountDue: Number((invoice as any).amountDue),
              currency: invoice.currency,
            });
            break;
        }
    }
  };

  // ── Build badges for letterhead ──────────────────────────────────────────
  const badges = (
    <>
      <Badge className={STATUS_COLORS[invoice.status] ?? ""}>
        {invoice.status}
      </Badge>
      {invoice.paymentStatus && isInvoice && (
        <Badge variant="outline">{invoice.paymentStatus}</Badge>
      )}
    </>
  );

  // ── Build header actions dropdown ────────────────────────────────────────
  const headerActions = showActions ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.more")}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.key}
            variant={
              action.variant === "destructive" ? "destructive" : "default"
            }
            onClick={() => handleActionClick(action)}
          >
            <action.icon className="size-4" />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : undefined;

  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      <DetailPageHeader
        title={invoice.serial}
        icon={isInvoice ? Receipt : FileText}
        onBack={() => router.push(`/erp/documents/${type}`)}
        backLabel={t("common.back")}
        badges={badges}
        actions={headerActions}
      />
      <div className="mx-auto max-w-5xl py-6 px-4 sm:px-6">
        {/* Paper layout */}
        <InvoiceFormBody
          readonly
          serial={invoice.serial}
          org={
            orgData
              ? {
                  name: (orgData as any).name,
                  logo: (orgData as any).logo,
                  crNumber: (orgData as any).crNumber,
                  taxId: (orgData as any).taxId,
                  vatRegistered: (orgData as any).vatRegistered,
                  phone: (orgData as any).phone,
                  email: (orgData as any).email,
                  website: (orgData as any).website,
                }
              : undefined
          }
          invoice={{
            type: invoice.type,
            serial: invoice.serial,
            date: invoice.date,
            dueDate: invoice.dueDate,
            currency: invoice.currency,
            isWalkIn: invoice.isWalkIn,
            subtotal: Number(invoice.subtotal),
            discountTotal: Number(invoice.discountTotal),
            taxTotal: Number(invoice.taxTotal),
            total: Number(invoice.total),
            costTotal: Number(invoice.costTotal),
            termsText: (invoice as any).termsText,
            customer: invoice.customer
              ? {
                  name: invoice.customer.name,
                  vatNumber: (invoice.customer as any).vatNumber,
                  taxId: (invoice.customer as any).taxId,
                }
              : null,
            warehouse: (invoice as any).warehouse
              ? { name: (invoice as any).warehouse.name }
              : null,
            lines: invoice.lines?.map((l: any) => ({
              id: l.id,
              itemId: l.itemId,
              description: l.description,
              quantity: Number(l.quantity),
              unitPrice: Number(l.unitPrice),
              discountAmt: Number(l.discountAmt),
              taxAmt: Number(l.taxAmt),
              taxRateName: l.taxRateName,
              taxRateSnapshot: l.taxRateSnapshot ? Number(l.taxRateSnapshot) : null,
              total: Number(l.total),
              item: l.item
                ? { name: l.item.name, sku: l.item.sku, image: l.item.image }
                : null,
            })),
          }}
        />

        {/* History sheet */}
        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
          <SheetContent side="right" className="w-full p-0 sm:max-w-md">
            <SheetHeader className="sr-only">
              <SheetTitle>{t("invoices.history")}</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-dvh px-5 py-5 pr-12">
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
      </div>

      {/* Send confirmation dialog */}
      <Dialog
        open={sendOpen}
        onOpenChange={(v) => !sendMutation.isPending && setSendOpen(v)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("invoices.sendDialogTitle", {
                type: getTypeLabel(invoice.type),
              })}
            </DialogTitle>
            <DialogDescription>
              {invoiceType === "INVOICE"
                ? t("invoices.sendDialogDesc")
                : invoiceType === "QUOTE"
                  ? t("invoices.sendQuoteDialogDesc")
                  : t("invoices.sendDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendOpen(false)}
              disabled={sendMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => sendMutation.mutate({ id: invoice.id, version })}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending && (
                <Loader2 className="size-4 mr-1 animate-spin" />
              )}
              {t("common.send")} {getTypeLabel(invoice.type)}
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
              {t("invoices.cancelDialogTitle", {
                type: getTypeLabel(invoice.type),
              })}
            </DialogTitle>
            <DialogDescription>
              {t("invoices.cancelDialogDesc", { serial: invoice.serial })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="cancel-reason">{t("common.reason")}</Label>
            <Textarea
              id="cancel-reason"
              placeholder={t("invoices.cancelReasonPlaceholder")}
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
                setCancelReason("");
              }}
              disabled={cancelMutation.isPending}
            >
              {t("common.keep")}
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
              {cancelMutation.isPending && (
                <Loader2 className="size-4 mr-1 animate-spin" />
              )}
              {t("common.cancel")} {getTypeLabel(invoice.type)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm action dialog (submit for approval / approve) */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(v) => {
          if (
            !submitForApprovalMutation.isPending &&
            !approveMutation.isPending
          )
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
                setConfirmDialog({
                  open: false,
                  action: "",
                  title: "",
                  description: "",
                })
              }
              disabled={isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                handleConfirmAction(confirmDialog.action);
                setConfirmDialog({
                  open: false,
                  action: "",
                  title: "",
                  description: "",
                });
              }}
              disabled={isPending}
            >
              {isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              {confirmDialog.action === "approve"
                ? t("common.approve")
                : t("invoices.submitForApproval")}
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
            <DialogTitle>{t("invoices.rejectInvoiceTitle")}</DialogTitle>
            <DialogDescription>
              {t("invoices.rejectInvoiceDesc", { serial: invoice.serial })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="reject-reason">{t("common.reason")}</Label>
            <Textarea
              id="reject-reason"
              placeholder={t("invoices.rejectReasonPlaceholder")}
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
                setRejectReason("");
              }}
              disabled={rejectMutation.isPending}
            >
              {t("common.cancel")}
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
              {rejectMutation.isPending && (
                <Loader2 className="size-4 mr-1 animate-spin" />
              )}
              {t("invoices.rejectInvoice")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
