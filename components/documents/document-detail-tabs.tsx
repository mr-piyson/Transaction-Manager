"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  FileText,
  History,
  Package,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { InvoiceFormBody } from "@/components/invoice/invoiceFormBody";
import { InvoiceHistoryPanel } from "@/components/invoices/invoice-history-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDateFormat } from "@/hooks/use-date-format";
import { cn } from "@/lib/utils";

type DocumentDetailTabsProps = {
  invoice: any;
  orgData: any;
  stockMovements: any[] | undefined;
  isInvoice: boolean;
  canRecordPayment: boolean;
  onRecordPayment: () => void;
  onDeletePayment: (paymentId: string) => void;
  deletePaymentPending: boolean;
  isSuperAdmin: boolean;
  onNavigate: (path: string) => void;
};

/** All detail-page tabs live here; the page itself owns data, actions and dialogs. */
export function DocumentDetailTabs({
  invoice,
  orgData,
  stockMovements,
  isInvoice,
  canRecordPayment,
  onRecordPayment,
  onDeletePayment,
  deletePaymentPending,
  isSuperAdmin,
  onNavigate,
}: DocumentDetailTabsProps) {
  const t = useTranslations();
  const { formatDate, formatDateTime } = useDateFormat();
  const [activeTab, setActiveTab] = React.useState("overview");

  const payments: any[] = isInvoice ? (invoice.payments ?? []) : [];
  const movements: any[] = isInvoice ? (stockMovements ?? []) : [];
  const total = Number(invoice.total);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const amountDue = Number(invoice.amountDue ?? Math.max(0, total - totalPaid));
  const paidPercent = total > 0 ? Math.min(100, (totalPaid / total) * 100) : 0;
  const currency = invoice.currency;

  const paymentStatus =
    (invoice.paymentStatus as string | undefined) ??
    (amountDue <= 0 ? "PAID" : totalPaid > 0 ? "PARTIAL" : "UNPAID");
  const paymentStatusLabel =
    {
      PAID: t("invoices.paid"),
      PARTIAL: t("invoices.partial"),
      OVERDUE: t("invoices.overdue"),
      PENDING: t("invoices.unpaid"),
      UNPAID: t("invoices.unpaid"),
      CANCELLED: t("invoices.cancelled"),
    }[paymentStatus] ?? paymentStatus;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="sticky  top-14 z-40 flex w-full max-w-full justify-start gap-2 rounded-none border-b bg-background/95 px-2 backdrop-blur-md [&>*]:flex-none sm:px-4">
        <TabsTrigger value="overview">
          <FileText className="size-4" />
          <span className="ml-1.5">{t("common.overview")}</span>
        </TabsTrigger>
        {isInvoice && (
          <TabsTrigger value="payments">
            <Banknote className="size-4" />
            <span className="ml-1.5">{t("common.payments")}</span>
            {payments.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {payments.length}
              </Badge>
            )}
          </TabsTrigger>
        )}
        {isInvoice && (
          <TabsTrigger value="stock">
            <Package className="size-4" />
            <span className="ml-1.5">{t("stock.movements")}</span>
            {movements.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {movements.length}
              </Badge>
            )}
          </TabsTrigger>
        )}
        <TabsTrigger value="history">
          <History className="size-4" />
          <span className="ml-1.5">{t("invoices.history")}</span>
        </TabsTrigger>
      </TabsList>

      {/* ── OVERVIEW ─────────────────────────────────────────────── */}
      <TabsContent value="overview" className="space-y-4 p-4">
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
              taxRateSnapshot: l.taxRateSnapshot
                ? Number(l.taxRateSnapshot)
                : null,
              total: Number(l.total),
              item: l.item
                ? {
                    name: l.item.name,
                    sku: l.item.sku,
                    image: l.item.image,
                  }
                : null,
              unit: l.unit ? { code: l.unit.code, name: l.unit.name } : null,
            })),
          }}
        />
      </TabsContent>

      {/* ── PAYMENTS ─────────────────────────────────────────────── */}
      {isInvoice && (
        <TabsContent value="payments" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label={t("common.total")}
              value={total}
              currency={currency}
            />
            <StatCard
              label={t("common.paid")}
              value={totalPaid}
              currency={currency}
              tone="success"
            />
            <StatCard
              label={t("invoices.amountDue")}
              value={amountDue}
              currency={currency}
              tone={amountDue > 0 ? "warning" : "success"}
            />
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">
                  {t("invoices.paymentProgress")}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {paidPercent.toFixed(1)}%
                </span>
              </div>
              <ProgressBar value={paidPercent} />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("common.payments")}</h3>
            {canRecordPayment && (
              <RecordPaymentButton
                onClick={onRecordPayment}
                variant="outline"
              />
            )}
          </div>

          {payments.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Banknote className="size-6" />
                </EmptyMedia>
                <EmptyTitle>{t("invoices.noPayments")}</EmptyTitle>
                <EmptyDescription>
                  {t("invoices.noPaymentsDesc")}
                </EmptyDescription>
              </EmptyHeader>
              {canRecordPayment && (
                <RecordPaymentButton onClick={onRecordPayment} size="default" />
              )}
            </Empty>
          ) : (
            <div className="space-y-2">
              {payments.map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {p.method?.replace(/_/g, " ") ?? "—"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(p.date)}
                          </span>
                        </div>
                        {(p.reference || p.notes) && (
                          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {p.reference && (
                              <div>
                                <span className="font-medium text-foreground">
                                  {t("common.reference")}:
                                </span>{" "}
                                {p.reference}
                              </div>
                            )}
                            {p.notes && (
                              <div>
                                <span className="font-medium text-foreground">
                                  {t("common.notes")}:
                                </span>{" "}
                                {p.notes}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {Number(p.amount).toFixed(3)}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {currency}
                          </span>
                        </div>
                        {isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              if (
                                window.confirm(
                                  t("invoices.deletePaymentConfirm"),
                                )
                              ) {
                                onDeletePayment(p.id);
                              }
                            }}
                            disabled={deletePaymentPending}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      )}

      {/* ── STOCK MOVEMENTS ──────────────────────────────────────── */}
      {isInvoice && (
        <TabsContent value="stock" className="space-y-4">
          <StockMovementsPanel movements={movements} />
        </TabsContent>
      )}

      {/* ── HISTORY ──────────────────────────────────────────────── */}
      <TabsContent value="history">
        <Card>
          <CardContent className="p-5">
            <InvoiceHistoryPanel
              invoice={invoice}
              formatDate={formatDate}
              formatDateTime={formatDateTime}
              onNavigate={(path) => {
                setActiveTab("overview");
                onNavigate(path);
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function StatCard({
  label,
  value,
  currency,
  tone = "default",
}: {
  label: string;
  value: number;
  currency: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
  };
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-xl font-semibold tabular-nums",
          tones[tone],
        )}
      >
        {value.toFixed(3)}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          {currency}
        </span>
      </div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function RecordPaymentButton({
  onClick,
  variant = "default",
  size = "sm",
}: {
  onClick: () => void;
  variant?: "default" | "outline";
  size?: "sm" | "default";
}) {
  const t = useTranslations();
  return (
    <Button size={size} variant={variant} onClick={onClick}>
      <Banknote className="size-4 mr-1" />
      {t("invoices.recordPayment")}
    </Button>
  );
}

function StockMovementsPanel({ movements }: { movements: any[] }) {
  const t = useTranslations();
  const { formatShortDate } = useDateFormat();

  // Kept in this panel so grouping only runs while the Stock tab is mounted.
  const movementsByItem = React.useMemo(() => {
    const map = new Map<
      string,
      { item: any; movements: any[]; netQty: number }
    >();
    for (const m of movements) {
      const key = m.item?.id ?? m.itemId ?? m.id;
      if (!map.has(key)) {
        map.set(key, { item: m.item, movements: [], netQty: 0 });
      }
      const entry = map.get(key)!;
      entry.movements.push(m);
      entry.netQty += Number(m.quantity);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.item?.name ?? "").localeCompare(b.item?.name ?? ""),
    );
  }, [movements]);

  if (movements.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Package className="size-6" />
          </EmptyMedia>
          <EmptyTitle>{t("stock.noMovements")}</EmptyTitle>
          <EmptyDescription>{t("stock.noMovementsDesc")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("common.items")}
          </div>
          <div className="mt-1 text-xl font-semibold tabular-nums">
            {movementsByItem.length}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("stock.totalMovements")}
          </div>
          <div className="mt-1 text-xl font-semibold tabular-nums">
            {movements.length}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 col-span-2 sm:col-span-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {t("stock.netQty")}
          </div>
          <div className="mt-1 text-xl font-semibold tabular-nums">
            {movementsByItem.reduce((s, g) => s + g.netQty, 0).toFixed(3)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {movementsByItem.map(({ item, movements: itemMoves, netQty }) => {
          const isOut = netQty < 0;
          return (
            <Card key={item?.id ?? itemMoves[0]?.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="rounded-md bg-muted p-2 shrink-0">
                      <Package className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">
                        {item?.name ?? "—"}
                      </CardTitle>
                      {item?.sku && (
                        <div className="text-xs text-muted-foreground">
                          {item.sku}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isOut ? (
                      <ArrowUpRight className="size-4 text-red-600 dark:text-red-400" />
                    ) : (
                      <ArrowDownLeft className="size-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    <span
                      className={cn(
                        "font-mono text-sm font-semibold tabular-nums",
                        isOut
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {netQty > 0 ? "+" : ""}
                      {netQty.toFixed(3)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y rounded-md border">
                  {itemMoves.map((m: any) => {
                    const qty = Number(m.quantity);
                    const rowOut = qty < 0;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0 text-muted-foreground">
                          <span className="tabular-nums">
                            {formatShortDate(m.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="size-3" />
                            {m.toWarehouse?.name ??
                              m.fromWarehouse?.name ??
                              "—"}
                          </span>
                          <span className="truncate">
                            {m.user?.name ?? "—"}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "font-mono font-medium tabular-nums shrink-0",
                            rowOut
                              ? "text-red-600 dark:text-red-400"
                              : "text-emerald-600 dark:text-emerald-400",
                          )}
                        >
                          {qty > 0 ? "+" : ""}
                          {qty.toFixed(3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
