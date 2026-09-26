"use client";

import {
  ArrowLeft,
  History,
  Loader2,
  Package,
  ShoppingCart,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";
import { ActionsDropdown } from "@/components/actions-menu";
import { DetailPageHeader } from "@/components/detail-page-header";
import { useExpenseForm } from "@/components/dialogs/expenseForm";
import { useHardDeleteForm } from "@/components/dialogs/hardDeleteForm";
import { PAPER_THEME, paperSheetClass } from "@/components/form/paper";
import { buildPOActions } from "@/components/purchase-orders/po-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAppAbility } from "@/hooks/use-app-ability";
import { useDateFormat } from "@/hooks/use-date-format";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PENDING_APPROVAL:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  ORDERED:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  PARTIAL_RECEIVED:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  RECEIVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  INVOICED: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { openCreate: openCreateExpense } = useExpenseForm();
  const { openDialog: openHardDelete } = useHardDeleteForm();
  const { data: me } = trpc.auth.me.useQuery();
  const isSuperAdmin = me?.platformRole === "SUPER_ADMIN";
  const t = useTranslations();
  const { formatDate, formatDateTime, formatShortDate } = useDateFormat();

  const {
    data: po,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.purchaseOrders.byId.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  const { data: orgData } = trpc.settings.getOrg.useQuery();

  const { data: stockMovements } = trpc.purchaseOrders.stockMovements.useQuery(
    { id: params.id },
    {
      enabled:
        !!params.id &&
        !!po &&
        ["ORDERED", "PARTIAL_RECEIVED", "RECEIVED"].includes(po.status),
    },
  );

  const ability = useAppAbility();

  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");

  const submitMutation = trpc.purchaseOrders.submitForApproval.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t("purchaseOrders.submittedForApproval"));
    },
    onError: (e) => toast.error(e.message),
  });
  const approveMutation = trpc.purchaseOrders.approve.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t("purchaseOrders.poApproved"));
    },
    onError: (e) => toast.error(e.message),
  });
  const rejectMutation = trpc.purchaseOrders.reject.useMutation({
    onSuccess: () => {
      setRejectOpen(false);
      setRejectReason("");
      invalidate();
      toast.success(t("purchaseOrders.poRejected"));
    },
    onError: (e) => toast.error(e.message),
  });
  const orderMutation = trpc.purchaseOrders.order.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t("purchaseOrders.poPlaced"));
    },
    onError: (e) => toast.error(e.message),
  });
  const receiveMutation = trpc.purchaseOrders.receive.useMutation({
    onSuccess: () => {
      setReceiveOpen(false);
      invalidate();
      toast.success(t("purchaseOrders.stockReceived"));
    },
    onError: (e) => toast.error(e.message),
  });
  const cancelMutation = trpc.purchaseOrders.cancel.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(t("purchaseOrders.poCancelled"));
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.purchaseOrders.delete.useMutation({
    onSuccess: () => {
      utils.purchaseOrders.list.invalidate();
      toast.success(t("purchaseOrders.poDeleted"));
      router.push("/erp/purchase-orders");
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
            <EmptyTitle>
              {isError ? t("common.failedToLoad") : t("common.notFound")}
            </EmptyTitle>
            <EmptyDescription>
              {error?.message ?? t("purchaseOrders.doesNotExist")}
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/erp/purchase-orders")}
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

  const version = po.version ?? 0;

  const handleEdit = () => {
    router.push(`/erp/purchase-orders/${po.id}/edit`);
  };

  const handleHardDelete = () => {
    openHardDelete(
      { kind: "po", id: po.id, title: po.serial },
      { onSuccess: () => router.push("/erp/purchase-orders") },
    );
  };

  const menuItems = buildPOActions({
    po: { id: po.id, serial: po.serial, status: po.status },
    t,
    ability,
    isSuperAdmin,
    handlers: {
      print: () => router.push(`/erp/purchase-orders/${po.id}/print`),
      edit: handleEdit,
      submit: () => submitMutation.mutate({ id: po.id, version }),
      approve: () => approveMutation.mutate({ id: po.id, version }),
      reject: () => setRejectOpen(true),
      order: () => orderMutation.mutate({ id: po.id, version }),
      receive: () => setReceiveOpen(true),
      cancel: () => cancelMutation.mutate({ id: po.id, version }),
      delete: () => deleteMutation.mutate({ id: po.id }),
      hardDelete: handleHardDelete,
      recordExpense: () =>
        openCreateExpense({
          defaults: { purchaseOrderId: po.id },
          onSuccess: () => invalidate(),
        }),
    },
  });

  const showActions = menuItems.length > 0;

  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      <DetailPageHeader
        title={po.serial}
        icon={ShoppingCart}
        onBack={() => router.push("/erp/purchase-orders")}
        backLabel={t("common.back")}
        actions={
          showActions ? (
            <ActionsDropdown
              items={menuItems}
              itemDisabled={isPending}
              hideWhenEmpty
            />
          ) : undefined
        }
      />
      <div className="mx-auto max-w-5xl py-6 px-4 sm:px-6 space-y-3 sm:space-y-4">
        {/* Paper document */}
        <div className={paperSheetClass} style={PAPER_THEME}>
          {/* Letterhead */}
          <header className="flex flex-col gap-2 items-start border-b px-6 py-6 sm:px-8">
            <div>
              {orgData?.logo && (
                <img
                  src={orgData.logo}
                  alt={orgData.name ?? ""}
                  className="h-12 w-auto shrink-0 rounded-md border object-contain"
                />
              )}
            </div>
            <div className="flex w-full items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h1 className="text-xl font-bold leading-tight">
                  {orgData?.name ?? ""}
                </h1>
                <div className="space-y-0.5 text-xs text-muted-foreground">
                  {orgData?.crNumber && (
                    <p>{t("customers.crNumber")}: {orgData.crNumber}</p>
                  )}
                  {orgData?.taxId && (
                    <p>{t("customers.taxId")}: {orgData.taxId}</p>
                  )}
                  {orgData?.vatRegistered && <p>{t("common.vatRegistered")}</p>}
                  {orgData?.phone && <p>{orgData.phone}</p>}
                  {orgData?.email && <p>{orgData.email}</p>}
                  {orgData?.website && <p>{orgData.website}</p>}
                </div>
              </div>
              <div className="ml-auto flex min-w-0 flex-col items-end text-right">
                <span className="text-2xl font-bold uppercase tracking-wide sm:text-3xl">
                  {t("purchaseOrders.title")}
                </span>
                <p className="text-sm font-semibold mt-1">{po.serial}</p>
                <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                  <p>{t("common.date")}: {po.date ? formatDate(po.date) : "—"}</p>
                  {po.expectedDate && (
                    <p>
                      {t("purchaseOrders.expectedDate")}: {formatDate(po.expectedDate)}
                    </p>
                  )}
                </div>
                <div className="mt-2">
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${STATUS_COLORS[po.status] ?? "bg-gray-100 text-gray-800 border-gray-300"}`}>
                    {t(`purchaseOrders.statuses.${po.status}`)}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Supplier & Warehouse */}
          <div className="grid grid-cols-2 gap-8 border-b px-6 py-4 sm:px-8">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {t("purchaseOrders.supplier")}
              </h3>
              <p className="font-semibold">{po.supplier?.name ?? "—"}</p>
              {po.supplier?.email && (
                <p className="text-sm text-muted-foreground">{po.supplier.email}</p>
              )}
              {po.supplier?.phone && (
                <p className="text-sm text-muted-foreground">{po.supplier.phone}</p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {t("purchaseOrders.warehouse")}
              </h3>
              <p className="font-semibold">{po.warehouse?.name ?? "—"}</p>
              {po.department && (
                <>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-2">
                    {t("common.department")}
                  </h3>
                  <p className="font-semibold">{po.department.name}</p>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {po.notes && (
            <div className="border-b px-6 py-3 sm:px-8">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {t("common.notes")}
              </h3>
              <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
            </div>
          )}

          {/* Line items */}
          <div className="px-6 py-4 sm:px-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase">
                  <th className="text-left py-2 pr-2 w-10">#</th>
                  <th className="text-left py-2 pr-2">{t("common.item")}</th>
                  <th className="text-right py-2 px-2">{t("common.ordered")}</th>
                  <th className="text-right py-2 px-2">{t("common.received")}</th>
                  <th className="text-right py-2 px-2">{t("common.remaining")}</th>
                  <th className="text-right py-2 px-2">{t("purchaseOrders.unitCost")}</th>
                  <th className="text-right py-2 pl-2">{t("common.total")}</th>
                </tr>
              </thead>
              <tbody>
                {po.lines.map((line: any, idx: number) => {
                  const qty = Number(line.quantity);
                  const recv = Number(line.receivedQty);
                  const rem = qty - recv;
                  return (
                    <tr key={line.id} className="border-b last:border-0">
                      <td className="py-2 pr-2 text-muted-foreground align-top">{idx + 1}</td>
                      <td className="py-2 pr-2 align-top">
                        <span className="font-medium">
                          {line.item ? line.item.name : line.description || "Manual entry"}
                        </span>
                        {line.item?.sku && (
                          <p className="text-xs text-muted-foreground">SKU: {line.item.sku}</p>
                        )}
                        {!line.item && (
                          <p className="text-xs text-muted-foreground">Manual (no stock)</p>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right align-top whitespace-nowrap tabular-nums">{qty.toFixed(3)}</td>
                      <td className="py-2 px-2 text-right align-top whitespace-nowrap tabular-nums">{recv.toFixed(3)}</td>
                      <td className="py-2 px-2 text-right align-top whitespace-nowrap tabular-nums">{rem.toFixed(3)}</td>
                      <td className="py-2 px-2 text-right align-top whitespace-nowrap tabular-nums">{Number(line.unitCost).toFixed(3)}</td>
                      <td className="py-2 pl-2 text-right align-top whitespace-nowrap font-medium tabular-nums">{Number(line.total).toFixed(3)}</td>
                    </tr>
                  );
                })}
                {po.lines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      {t("purchaseOrders.noLineItems")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-6 pb-4 sm:px-8">
            <div className="ml-auto w-64 space-y-1 text-sm border-t pt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("common.subtotal")}</span>
                <span className="tabular-nums">{Number(po.subtotal).toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("common.tax")}</span>
                <span className="tabular-nums">{Number(po.taxTotal).toFixed(3)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-1">
                <span>{t("common.total")}</span>
                <span className="tabular-nums">{Number(po.total).toFixed(3)} {po.currency}</span>
              </div>
              {Number(po.amountOwed) > 0 && (
                <div className="flex justify-between text-destructive font-medium">
                  <span>{t("common.amountOwed")}</span>
                  <span className="tabular-nums">{Number(po.amountOwed).toFixed(3)} {po.currency}</span>
                </div>
              )}
            </div>
          </div>

          {/* Internal Notes */}
          {po.internalNotes && (
            <div className="border-t px-6 py-3 sm:px-8">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {t("common.internalNotes")}
              </h3>
              <p className="text-sm whitespace-pre-wrap">{po.internalNotes}</p>
            </div>
          )}
        </div>

        {/* Stock movements */}
        {stockMovements && stockMovements.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="size-4" /> {t("stock.movements")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.date")}</TableHead>
                      <TableHead>{t("common.item")}</TableHead>
                      <TableHead className="text-right">{t("common.quantity")}</TableHead>
                      <TableHead>{t("common.warehouse")}</TableHead>
                      <TableHead>{t("common.by")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockMovements.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">{formatShortDate(m.createdAt)}</TableCell>
                        <TableCell>
                          <span className="font-medium">{m.item?.name}</span>
                          {m.item?.sku && (
                            <span className="text-xs text-muted-foreground ml-1">({m.item.sku})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                          +{Number(m.quantity).toFixed(3)}
                        </TableCell>
                        <TableCell>{m.toWarehouse?.name ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.user?.name ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="sm:hidden divide-y">
                {stockMovements.map((m: any) => (
                  <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{m.item?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatShortDate(m.createdAt)} · {m.toWarehouse?.name ?? "—"} · {m.user?.name ?? "—"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400 tabular-nums">
                        +{Number(m.quantity).toFixed(3)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meta info */}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pb-2">
          <span>
            {t("purchaseOrders.metaCreated", {
              type: po.status,
              name: po.createdBy?.name ?? "—",
              date: po.createdAt ? formatDateTime(po.createdAt) : "—",
            })}
          </span>
          <span>{t("purchaseOrders.metaVersion", { version: po.version })}</span>
          {po.receivedAt && (
            <span>
              {t("purchaseOrders.metaReceivedOn", { date: formatDateTime(po.receivedAt) })}
            </span>
          )}
          {po.cancelledAt && (
            <span>
              {t("purchaseOrders.metaCancelledOn", { date: formatDateTime(po.cancelledAt) })}
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
      <Dialog open={rejectOpen} onOpenChange={(v) => { if (!rejectMutation.isPending) setRejectOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("purchaseOrders.rejectTitle")}</DialogTitle>
            <DialogDescription>{t("purchaseOrders.rejectDesc", { serial: po.serial })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="reject-reason">{t("common.reason")}</Label>
            <Textarea
              id="reject-reason"
              placeholder={t("purchaseOrders.rejectPlaceholder")}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectReason(""); }} disabled={rejectMutation.isPending}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: po.id, version, reason: rejectReason || undefined })} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
              {t("purchaseOrders.rejectPO")}
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
  const remaining = lines.filter(
    (l: any) => Number(l.quantity) > Number(l.receivedQty),
  );
  const allAlreadyReceived = remaining.length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tr("purchaseOrders.receiveStock")}</DialogTitle>
          <DialogDescription>
            {allAlreadyReceived
              ? tr("purchaseOrders.allReceived")
              : tr("purchaseOrders.pendingReceipt", { count: remaining.length })}
          </DialogDescription>
        </DialogHeader>

        {!allAlreadyReceived && (
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tr("common.item")}</TableHead>
                  <TableHead className="text-right">{tr("common.ordered")}</TableHead>
                  <TableHead className="text-right">{tr("common.received")}</TableHead>
                  <TableHead className="text-right">{tr("common.toReceive")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remaining.map((line: any) => {
                  const qty = Number(line.quantity);
                  const recv = Number(line.receivedQty);
                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        <span className="font-medium">
                          {line.item ? line.item.name : line.description || "Manual entry"}
                        </span>
                        {line.item?.sku && (
                          <span className="text-xs text-muted-foreground ml-1">({line.item.sku})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{qty.toFixed(3)}</TableCell>
                      <TableCell className="text-right tabular-nums">{recv.toFixed(3)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{(qty - recv).toFixed(3)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {tr("common.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={isPending || allAlreadyReceived}>
            {isPending && <Loader2 className="size-4 mr-1 animate-spin" />}
            {allAlreadyReceived
              ? tr("common.close")
              : tr("purchaseOrders.receiveAll", {
                  qty: remaining
                    .reduce((s: number, l: any) => s + Number(l.quantity) - Number(l.receivedQty), 0)
                    .toFixed(3),
                })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}