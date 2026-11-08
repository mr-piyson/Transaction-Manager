"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  Clock,
  FilePenLine,
  Package,
  Receipt,
  ShieldAlert,
  ShoppingCart,
  TriangleAlert,
  Truck,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { useCustomerForm } from "@/components/dialogs";
import { Header } from "@/components/layout/App-Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

/**
 * ---------------------------------------------------------------------------
 * Counts-only ERP overview — no revenue, balances, or currency figures.
 *
 * All counts come from the permission-aware `dashboard.overview` query. The
 * query buckets dates in the user's timezone, so this page never does date
 * arithmetic and never receives a misleading zero for a section the user is
 * not allowed to read.
 * ---------------------------------------------------------------------------
 */

type Tone = "success" | "warning" | "destructive" | "neutral" | "muted";

const CHART_COLORS = {
  success: "var(--success)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
  foreground: "var(--foreground)",
  mutedForeground: "var(--muted-foreground)",
  border: "var(--border)",
  card: "var(--card)",
  popover: "var(--popover)",
  muted: "var(--muted)",
} as const;

const tooltipStyle = {
  backgroundColor: CHART_COLORS.popover,
  border: `1px solid ${CHART_COLORS.border}`,
  borderRadius: 8,
  fontSize: 11,
  color: CHART_COLORS.foreground,
} as const;

const STATUS_TONE: Record<string, Tone> = {
  PAID: "success",
  RECEIVED: "success",
  CLOSED: "success",
  SENT: "warning",
  PARTIAL: "warning",
  PARTIAL_RECEIVED: "warning",
  PENDING_APPROVAL: "warning",
  APPROVED: "warning",
  ORDERED: "neutral",
  INVOICED: "neutral",
  OVERDUE: "destructive",
  DISPUTED: "destructive",
  DRAFT: "muted",
  CANCELLED: "muted",
};

const TONE_COLOR: Record<Tone, string> = {
  success: CHART_COLORS.success,
  warning: CHART_COLORS.warning,
  destructive: CHART_COLORS.destructive,
  neutral: CHART_COLORS.foreground,
  muted: CHART_COLORS.mutedForeground,
};

type StatusLabelKey =
  | "common.paid"
  | "common.received"
  | "common.sent"
  | "common.partial"
  | "common.overdue"
  | "common.draft"
  | "common.cancelled"
  | "common.approved"
  | "common.ordered"
  | "common.disputed"
  | "common.invoiced"
  | "common.partialReceived"
  | "common.closed"
  | "invoices.pendingApproval"
  | "common.unknown";

function statusLabelKey(status: string): StatusLabelKey {
  switch (status) {
    case "PAID":
      return "common.paid";
    case "RECEIVED":
      return "common.received";
    case "SENT":
      return "common.sent";
    case "PARTIAL":
      return "common.partial";
    case "OVERDUE":
      return "common.overdue";
    case "DRAFT":
      return "common.draft";
    case "CANCELLED":
      return "common.cancelled";
    case "APPROVED":
      return "common.approved";
    case "ORDERED":
      return "common.ordered";
    case "DISPUTED":
      return "common.disputed";
    case "INVOICED":
      return "common.invoiced";
    case "PARTIAL_RECEIVED":
      return "common.partialReceived";
    case "CLOSED":
      return "common.closed";
    case "PENDING_APPROVAL":
      return "invoices.pendingApproval";
    default:
      return "common.unknown";
  }
}

function formatDayLabel(dayKey: string, locale: string): string {
  // Noon UTC keeps the calendar date stable regardless of the browser's
  // timezone; the day key is already the user's local calendar date.
  return new Date(`${dayKey}T12:00:00Z`).toLocaleDateString(
    locale === "ar" ? "ar" : "en-GB",
    { weekday: "short", timeZone: "UTC" },
  );
}

function displayCount(value: number | null | undefined): number | string {
  return value ?? "—";
}

// ── Shared bits ─────────────────────────────────────────────────────────────

function IconChip({
  children,
  tone = "primary",
}: {
  children: ReactNode;
  tone?: "primary" | "destructive" | "success" | "warning" | "muted";
}) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "destructive" && "bg-destructive/10 text-destructive",
        tone === "success" && "bg-success/10 text-success",
        tone === "warning" && "bg-warning/10 text-warning",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </div>
  );
}

const tileClass =
  "group flex flex-col items-start gap-1 rounded-lg border border-border/60 bg-background/40 p-2 text-left transition-all hover:border-primary/30 hover:bg-accent hover:shadow-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none";

const chartCardClass =
  "flex h-64 flex-col gap-1 rounded-xl py-3 lg:h-56 xl:h-64";

function RestrictedState() {
  const t = useTranslations();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-center">
      <ShieldAlert className="size-5 text-muted-foreground" />
      <p className="max-w-40 text-[11px] text-muted-foreground">
        {t("dashboard.restrictedSection")}
      </p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <section className="flex shrink-0 items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-48" />
        </div>
      </section>

      <section className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="gap-0 rounded-xl py-3 shadow-xs">
            <CardContent className="flex items-center justify-between gap-2 px-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-10" />
              </div>
              <Skeleton className="size-8 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} className={chartCardClass}>
            <CardHeader className="px-3">
              <Skeleton className="h-3 w-28" />
            </CardHeader>
            <CardContent className="min-h-0 flex-1 px-3">
              <Skeleton className="h-full w-full" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index} className="gap-2 rounded-xl py-3">
            <CardHeader className="px-3">
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-1.5 px-3 sm:grid-cols-4">
              {Array.from({ length: 4 }, (_, tile) => (
                <Skeleton key={tile} className="h-16 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

export default function ErpDashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const overview = trpc.dashboard.overview.useQuery();
  const { openCreate: openCustomerCreate } = useCustomerForm();

  const data = overview.data;
  const can = data?.can;
  const loading = overview.isLoading;

  const greeting = useMemo(() => {
    if (!data?.timeZone) return "";

    try {
      const hour = Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: data.timeZone,
          hour: "2-digit",
          hourCycle: "h23",
        }).format(new Date()),
      );

      if (hour < 12) return t("dashboard.greetingMorning");
      if (hour < 17) return t("dashboard.greetingAfternoon");
      return t("dashboard.greetingEvening");
    } catch {
      return t("dashboard.greetingDescription");
    }
  }, [data?.timeZone, t]);

  const todayLabel = useMemo(() => {
    if (!data?.timeZone) return "";

    try {
      return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
        timeZone: data.timeZone,
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date());
    } catch {
      return "";
    }
  }, [data?.timeZone, locale]);

  const weeklyDocs = useMemo(
    () =>
      (data?.week ?? []).map((day) => ({
        ...day,
        label: formatDayLabel(day.dayKey, locale),
      })),
    [data?.week, locale],
  );

  const statusMix = useMemo(
    () =>
      (data?.statusMix ?? []).map((status) => ({
        name: t(statusLabelKey(status.status)),
        value: status.count,
        color:
          TONE_COLOR[STATUS_TONE[status.status] ?? "muted"] ??
          CHART_COLORS.mutedForeground,
      })),
    [data?.statusMix, t],
  );

  const inventory = data?.inventory ?? null;
  const reorderPointItems = inventory?.reorderPointItems ?? 0;
  const lowStockCount = inventory?.lowStock ?? null;
  const hasReorderPoints = reorderPointItems > 0;
  const stockPct =
    inventory && hasReorderPoints
      ? Math.round(
          ((reorderPointItems - inventory.lowStock) / reorderPointItems) * 100,
        )
      : 0;
  const stockTone: Tone =
    stockPct >= 80 ? "success" : stockPct >= 50 ? "warning" : "destructive";

  const weeklyTotal = weeklyDocs.reduce(
    (total, day) => total + day.invoices + day.pos,
    0,
  );

  const firstName = trpc.auth.session
    .useQuery()
    .data?.user?.name?.split(" ")[0];

  const kpis = useMemo(() => {
    const invoices = data?.invoices ?? null;
    const purchaseOrders = data?.purchaseOrders ?? null;
    const delta = invoices
      ? invoices.thisMonth - invoices.lastMonth
      : undefined;

    return [
      {
        label: t("dashboard.invoicesThisMonth"),
        value: invoices ? invoices.thisMonth : null,
        delta,
        icon: FilePenLine,
        warn: false,
        href: can?.invoices ? "/erp/documents/invoices" : undefined,
      },
      {
        label: t("dashboard.poAwaitingApproval"),
        value: purchaseOrders ? purchaseOrders.pendingApproval : null,
        delta: undefined,
        icon: Clock,
        warn: false,
        href: can?.purchaseOrders ? "/erp/purchase-orders" : undefined,
      },
      {
        label: t("dashboard.openPurchaseOrders"),
        value: purchaseOrders ? purchaseOrders.open : null,
        delta: undefined,
        icon: ShoppingCart,
        warn: false,
        href: can?.purchaseOrders ? "/erp/purchase-orders" : undefined,
      },
      {
        label: t("dashboard.belowReorderPoint"),
        value: lowStockCount,
        delta: undefined,
        icon: TriangleAlert,
        warn: (lowStockCount ?? 0) > 0,
        href: can?.items ? "/erp/items" : undefined,
      },
    ];
  }, [data?.invoices, data?.purchaseOrders, lowStockCount, can, t]);

  const modules: {
    labelKey:
      | "layout.invoices"
      | "layout.purchaseOrders"
      | "layout.items"
      | "layout.customers"
      | "layout.suppliers"
      | "layout.stock";
    href: string;
    icon: typeof Package;
    count: number | null | undefined;
    warn: boolean;
  }[] = [];

  if (can?.invoices) {
    modules.push({
      labelKey: "layout.invoices",
      href: "/erp/documents/invoices",
      icon: FilePenLine,
      count: data?.modules.invoices,
      warn: false,
    });
  }
  if (can?.purchaseOrders) {
    modules.push({
      labelKey: "layout.purchaseOrders",
      href: "/erp/purchase-orders",
      icon: ShoppingCart,
      count: data?.modules.purchaseOrders,
      warn: false,
    });
  }
  if (can?.items) {
    modules.push({
      labelKey: "layout.items",
      href: "/erp/items",
      icon: Package,
      count: data?.modules.items,
      warn: false,
    });
  }
  if (can?.customers) {
    modules.push({
      labelKey: "layout.customers",
      href: "/erp/customers",
      icon: UserPlus,
      count: data?.modules.customers,
      warn: false,
    });
  }
  if (can?.suppliers) {
    modules.push({
      labelKey: "layout.suppliers",
      href: "/erp/suppliers",
      icon: Truck,
      count: data?.modules.suppliers,
      warn: false,
    });
  }
  if (can?.stock) {
    modules.push({
      labelKey: "layout.stock",
      href: "/erp/stock",
      icon: Boxes,
      count: data?.modules.stock,
      warn: (data?.modules.stock ?? 0) > 0,
    });
  }

  const hasQuickActions =
    can?.createInvoice ||
    can?.createPurchaseOrder ||
    can?.createCustomer ||
    can?.createIncome;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <style>{`
				.erp-fade-up { opacity: 0; transform: translateY(4px); animation: erpFadeUp .35s ease forwards; }
				@keyframes erpFadeUp { to { opacity: 1; transform: translateY(0); } }
				@media (prefers-reduced-motion: reduce) { .erp-fade-up { animation: none; opacity: 1; transform: none; } }
			`}</style>

      <Header title={t("dashboard.title")} />

      <main className="mx-auto flex w-full max-w-360 flex-1 flex-col gap-3 p-3 lg:gap-3 lg:p-4">
        {loading ? (
          <DashboardSkeleton />
        ) : overview.error ? (
          <Card className="rounded-xl">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <IconChip tone="destructive">
                <TriangleAlert className="size-4" />
              </IconChip>
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  {t("common.failedToLoad")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("common.errorOccurred")}
                </p>
              </div>
              <Button variant="outline" onClick={() => overview.refetch()}>
                {t("common.retry")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ---------------- header ---------------- */}
            <section className="flex shrink-0 items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  {todayLabel}
                </p>
                <h1 className="truncate font-bold text-lg leading-tight tracking-tight lg:text-xl">
                  {greeting}
                  {firstName ? `, ${firstName}.` : ""}
                </h1>
              </div>
            </section>

            {/* ---------------- KPI strip ---------------- */}
            <section className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
              {kpis.map((k, i) => {
                const card = (
                  <Card
                    key={k.label}
                    className={cn(
                      "erp-fade-up h-full gap-0 rounded-xl py-3 shadow-xs transition-shadow",
                      k.href && "hover:shadow-md",
                    )}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <CardContent className="flex items-center justify-between gap-2 px-3">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] text-muted-foreground">
                          {k.label}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                          <span
                            className={cn(
                              "font-mono text-xl leading-none font-semibold tabular-nums",
                              k.warn ? "text-destructive" : "text-foreground",
                            )}
                            title={
                              k.value === null
                                ? t("dashboard.restrictedSection")
                                : undefined
                            }
                          >
                            {displayCount(k.value)}
                          </span>
                          {k.delta !== undefined && k.delta !== 0 && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium text-[10px] tabular-nums",
                                k.delta > 0
                                  ? "bg-success/10 text-success"
                                  : "bg-destructive/10 text-destructive",
                              )}
                              title={t("dashboard.vsLastMonth")}
                            >
                              {k.delta > 0 ? (
                                <ArrowUpRight className="size-2.5" />
                              ) : (
                                <ArrowDownRight className="size-2.5" />
                              )}
                              {Math.abs(k.delta)}
                            </span>
                          )}
                        </div>
                      </div>
                      <IconChip tone={k.warn ? "destructive" : "primary"}>
                        <k.icon className="size-4" />
                      </IconChip>
                    </CardContent>
                  </Card>
                );

                return k.href ? (
                  <Link
                    key={k.label}
                    href={k.href}
                    className="rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {card}
                  </Link>
                ) : (
                  <div key={k.label}>{card}</div>
                );
              })}
            </section>

            {/* ---------------- charts row ---------------- */}
            <section className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-3">
              {/* weekly document volume */}
              <Card className={chartCardClass}>
                <CardHeader className="px-3">
                  <CardTitle className="font-medium text-xs">
                    {t("dashboard.documentsThisWeek")}
                  </CardTitle>
                  {data?.week && (can?.invoices || can?.purchaseOrders) && (
                    <CardAction>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {can?.invoices && (
                          <span className="flex items-center gap-1">
                            <span className="inline-block size-1.5 rounded-full bg-success" />
                            {t("dashboard.legendInvoices")}
                          </span>
                        )}
                        {can?.purchaseOrders && (
                          <span className="flex items-center gap-1">
                            <span className="inline-block size-1.5 rounded-full bg-warning" />
                            {t("dashboard.legendPOs")}
                          </span>
                        )}
                      </div>
                    </CardAction>
                  )}
                </CardHeader>
                <CardContent className="min-h-0 flex-1 px-3">
                  {!data?.week ? (
                    <RestrictedState />
                  ) : weeklyTotal === 0 ? (
                    <EmptyState label={t("dashboard.noDocumentsThisWeek")} />
                  ) : (
                    <div
                      aria-label={t("dashboard.documentsThisWeek")}
                      className="h-full"
                      role="img"
                    >
                      <ResponsiveContainer height="100%" width="100%">
                        <BarChart
                          data={weeklyDocs}
                          margin={{ top: 4, right: 4, bottom: 0, left: -18 }}
                          barGap={2}
                        >
                          <XAxis
                            axisLine={{ stroke: CHART_COLORS.border }}
                            dataKey="label"
                            tick={{
                              fontSize: 10,
                              fill: CHART_COLORS.mutedForeground,
                            }}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            cursor={{ fill: CHART_COLORS.muted }}
                          />
                          {can?.invoices && (
                            <Bar
                              dataKey="invoices"
                              fill={CHART_COLORS.success}
                              maxBarSize={10}
                              name={t("dashboard.legendInvoices")}
                              radius={[2, 2, 0, 0]}
                            />
                          )}
                          {can?.purchaseOrders && (
                            <Bar
                              dataKey="pos"
                              fill={CHART_COLORS.warning}
                              maxBarSize={10}
                              name={t("dashboard.legendPOs")}
                              radius={[2, 2, 0, 0]}
                            />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* invoice status mix */}
              <Card className={chartCardClass}>
                <CardHeader className="px-3">
                  <CardTitle className="font-medium text-xs">
                    {t("dashboard.statusMix")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 items-center gap-3 px-3">
                  {!data?.statusMix ? (
                    <RestrictedState />
                  ) : statusMix.length === 0 ? (
                    <EmptyState label={t("dashboard.noInvoices")} />
                  ) : (
                    <>
                      <div
                        aria-label={t("dashboard.statusMix")}
                        className="h-full min-h-0 w-1/2"
                        role="img"
                      >
                        <ResponsiveContainer height="100%" width="100%">
                          <PieChart>
                            <Pie
                              data={statusMix}
                              dataKey="value"
                              innerRadius="60%"
                              nameKey="name"
                              outerRadius="92%"
                              paddingAngle={2}
                              stroke="none"
                            >
                              {statusMix.map((status) => (
                                <Cell key={status.name} fill={status.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-y-auto">
                        {statusMix.map((status) => (
                          <div
                            className="flex items-center gap-1.5 text-[11px]"
                            key={status.name}
                          >
                            <span
                              className="inline-block size-1.5 shrink-0 rounded-full"
                              style={{ background: status.color }}
                            />
                            <span className="min-w-0 flex-1 truncate text-muted-foreground">
                              {status.name}
                            </span>
                            <span className="font-mono font-medium text-foreground tabular-nums">
                              {status.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* stock health gauge */}
              <Card className={chartCardClass}>
                <CardHeader className="px-3">
                  <CardTitle className="font-medium text-xs">
                    {t("dashboard.stockHealth")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative min-h-0 flex-1 px-3">
                  {!inventory ? (
                    <RestrictedState />
                  ) : !hasReorderPoints ? (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                      <span className="font-mono text-xl font-semibold text-muted-foreground">
                        —
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {t("dashboard.notConfigured")}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div
                        aria-label={t("dashboard.stockHealth")}
                        className="h-full"
                        role="img"
                      >
                        <ResponsiveContainer height="100%" width="100%">
                          <RadialBarChart
                            data={[
                              {
                                name: t("dashboard.stockHealth"),
                                value: stockPct,
                                fill: TONE_COLOR[stockTone],
                              },
                            ]}
                            endAngle={-270}
                            innerRadius="70%"
                            outerRadius="100%"
                            startAngle={90}
                          >
                            <PolarAngleAxis
                              domain={[0, 100]}
                              tick={false}
                              type="number"
                            />
                            <RadialBar
                              background={{ fill: CHART_COLORS.muted }}
                              cornerRadius={6}
                              dataKey="value"
                            />
                          </RadialBarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span
                          className={cn(
                            "font-mono text-xl font-semibold tabular-nums",
                            stockTone === "success" && "text-success",
                            stockTone === "warning" && "text-warning",
                            stockTone === "destructive" && "text-destructive",
                          )}
                        >
                          {stockPct}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {t("dashboard.aboveReorderPoint")}
                        </span>
                        <span className="mt-0.5 text-[9px] text-muted-foreground/80">
                          {t("dashboard.lowStockItems", {
                            n: lowStockCount ?? 0,
                          })}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* ---------------- actions + modules ---------------- */}
            <section className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-2">
              {/* quick actions */}
              <Card className="gap-2 rounded-xl py-3">
                <CardHeader className="px-3">
                  <CardTitle className="font-medium text-xs">
                    {t("layout.quickActions")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-1.5 px-3 sm:grid-cols-4">
                  {can?.createInvoice && (
                    <Link
                      className={tileClass}
                      href="/erp/documents/invoices/new"
                    >
                      <IconChip>
                        <Receipt className="size-4" />
                      </IconChip>
                      <span className="font-medium text-[11px] text-foreground leading-tight">
                        {t("dashboard.newInvoice")}
                      </span>
                    </Link>
                  )}
                  {can?.createPurchaseOrder && (
                    <Link className={tileClass} href="/erp/purchase-orders/new">
                      <IconChip>
                        <ShoppingCart className="size-4" />
                      </IconChip>
                      <span className="font-medium text-[11px] text-foreground leading-tight">
                        {t("dashboard.newPO")}
                      </span>
                    </Link>
                  )}
                  {can?.createCustomer && (
                    <button
                      className={tileClass}
                      onClick={() => openCustomerCreate()}
                      type="button"
                    >
                      <IconChip>
                        <UserPlus className="size-4" />
                      </IconChip>
                      <span className="font-medium text-[11px] text-foreground leading-tight">
                        {t("dashboard.addCustomer")}
                      </span>
                    </button>
                  )}
                  {can?.createIncome && (
                    <Link className={tileClass} href="/erp/incomes">
                      <IconChip tone="success">
                        <Banknote className="size-4" />
                      </IconChip>
                      <span className="font-medium text-[11px] text-foreground leading-tight">
                        {t("dashboard.recordIncome")}
                      </span>
                    </Link>
                  )}
                  {!hasQuickActions && (
                    <p className="col-span-full py-4 text-center text-[11px] text-muted-foreground">
                      {t("dashboard.restrictedSection")}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* module shelf */}
              <Card className="gap-2 rounded-xl py-3">
                <CardHeader className="px-3">
                  <CardTitle className="font-medium text-xs">
                    {t("dashboard.modules")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-1.5 px-3 xl:grid-cols-3">
                  {modules.length === 0 ? (
                    <p className="col-span-full py-4 text-center text-[11px] text-muted-foreground">
                      {t("dashboard.restrictedSection")}
                    </p>
                  ) : (
                    modules.map(
                      ({ labelKey, href, icon: Icon, count, warn }) => (
                        <Link
                          className="group flex items-center justify-between gap-1.5 rounded-lg border border-border/60 bg-background/40 px-2.5 py-2 transition-all hover:border-primary/30 hover:bg-accent hover:shadow-sm"
                          href={href}
                          key={labelKey}
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Icon className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                            <span className="truncate font-medium text-[11px] text-foreground">
                              {t(labelKey)}
                            </span>
                          </span>
                          <Badge
                            className={cn(
                              "shrink-0 px-1.5 py-0 font-mono text-[10px] tabular-nums",
                              warn &&
                                "border-destructive/20 bg-destructive/10 text-destructive",
                            )}
                            variant="secondary"
                          >
                            {displayCount(count)}
                          </Badge>
                        </Link>
                      ),
                    )
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
