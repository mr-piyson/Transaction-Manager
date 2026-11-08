"use client";

import {
  BarChart3,
  BookOpen,
  Box,
  Clock,
  DollarSign,
  FileText,
  IndianRupee,
  Landmark,
  Package,
  Receipt,
  Scale,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ReportCard,
  ReportEmpty,
  ReportKpiCard,
  ReportLayout,
  ReportLinkCard,
  ReportPrintButton,
} from "@/components/reports";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrency } from "@/hooks/use-currency";
import { trpc } from "@/lib/trpc/client";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function fmtShort(n: number, format: (value: number) => string) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return format(n);
}

function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-2">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-[250px] w-full rounded-lg" />
    </div>
  );
}

export default function ReportsPage() {
  const t = useTranslations();
  const { format } = useCurrency();

  const MONTH_LABELS: Record<string, string> = {
    "01": t("common.monthNames.0"),
    "02": t("common.monthNames.1"),
    "03": t("common.monthNames.2"),
    "04": t("common.monthNames.3"),
    "05": t("common.monthNames.4"),
    "06": t("common.monthNames.5"),
    "07": t("common.monthNames.6"),
    "08": t("common.monthNames.7"),
    "09": t("common.monthNames.8"),
    "10": t("common.monthNames.9"),
    "11": t("common.monthNames.10"),
    "12": t("common.monthNames.11"),
  };

  const { data: summary, isLoading: summaryLoading } =
    trpc.reports.summary.useQuery();
  const { data: monthlyRevenue, isLoading: monthlyLoading } =
    trpc.reports.monthlyRevenue.useQuery();
  const { data: invoiceStatusDist, isLoading: statusLoading } =
    trpc.reports.invoiceStatusDistribution.useQuery();
  const { data: arAging, isLoading: agingLoading } =
    trpc.reports.arAging.useQuery();
  const { data: revVsExp, isLoading: revExpLoading } =
    trpc.reports.revenueVsExpenses.useQuery();
  const { data: salesByCustomer, isLoading: salesLoading } =
    trpc.reports.salesByCustomer.useQuery();
  const { data: topItems, isLoading: itemsLoading } =
    trpc.reports.topItems.useQuery();

  const marginPercent = useMemo(() => {
    if (!summary || summary.revenue.total === 0) return null;
    return ((summary.grossProfit / summary.revenue.total) * 100).toFixed(1);
  }, [summary]);

  const kpis = useMemo(() => {
    return [
      {
        title: t("reports.totalRevenue"),
        value: summary ? format(summary.revenue.total) : "-",
        sub: summary
          ? t("reports.invoiceCount", { count: summary.revenue.count })
          : undefined,
        icon: <TrendingUp className="size-4" />,
        variant: "default" as const,
      },
      {
        title: t("reports.grossProfit"),
        value: summary ? format(summary.grossProfit) : "-",
        sub:
          marginPercent !== null
            ? t("reports.marginPercent", { percent: marginPercent })
            : undefined,
        icon: <Wallet className="size-4" />,
        variant: "success" as const,
        trend: summary?.grossProfit
          ? {
              dir:
                summary.grossProfit > 0 ? ("up" as const) : ("down" as const),
              label: t("reports.beforeExpenses"),
            }
          : undefined,
      },
      {
        title: t("reports.netProfit"),
        value: summary ? format(summary.netProfit) : "-",
        sub: summary
          ? t("reports.afterExpenses", { amount: format(summary.expenses) })
          : undefined,
        icon: <DollarSign className="size-4" />,
        variant:
          summary && summary.netProfit < 0
            ? ("danger" as const)
            : ("success" as const),
        trend: summary?.netProfit
          ? {
              dir: summary.netProfit > 0 ? ("up" as const) : ("down" as const),
              label: t("reports.netResult"),
            }
          : undefined,
      },
      {
        title: t("invoices.outstanding"),
        value: summary ? format(summary.outstanding.total) : "-",
        sub: summary
          ? t("reports.openInvoiceCount", {
              count: summary.outstanding.count,
            })
          : undefined,
        icon: <Receipt className="size-4" />,
        variant: "warning" as const,
        trend: summary?.outstanding.total
          ? { dir: "down" as const, label: t("reports.needsCollection") }
          : undefined,
      },
      {
        title: t("reports.totalExpenses"),
        value: summary ? format(summary.expenses) : "-",
        icon: <ShoppingCart className="size-4" />,
        variant: "danger" as const,
      },
      {
        title: t("invoices.totalCollected"),
        value: summary ? format(summary.collected.total) : "-",
        icon: <IndianRupee className="size-4" />,
        variant: "success" as const,
      },
      {
        title: t("reports.purchaseReport"),
        value: summary ? format(summary.purchases.total) : "-",
        sub: summary
          ? t("reports.orderCount", { count: summary.purchases.count })
          : undefined,
        icon: <Package className="size-4" />,
        variant: "info" as const,
      },
      {
        title: t("layout.inventory"),
        value: summary ? String(summary.inventory.itemCount) : "-",
        sub: summary
          ? t("reports.lowStockCount", {
              count: summary.inventory.lowStockCount,
            })
          : undefined,
        icon: <Box className="size-4" />,
        variant: "warning" as const,
      },
      {
        title: t("reports.customerReport"),
        value: summary ? String(summary.customers.activeCount) : "-",
        sub: summary
          ? t("reports.supplierCount", {
              count: summary.suppliers.activeCount,
            })
          : undefined,
        icon: <Users className="size-4" />,
        variant: "info" as const,
      },
    ];
  }, [format, marginPercent, summary, t]);

  const revenueChartConfig = useMemo(
    () => ({
      revenue: {
        label: t("reports.totalRevenue"),
        color: "hsl(var(--chart-1))",
      },
      profit: {
        label: t("reports.grossProfit"),
        color: "hsl(var(--chart-2))",
      },
    }),
    [t],
  );

  const revenueData = useMemo(
    () =>
      monthlyRevenue?.map((month) => ({
        month: MONTH_LABELS[month.month.slice(-2)] || month.month,
        revenue: Math.round(month.revenue),
        profit: Math.round(month.profit),
      })) ?? [],
    [monthlyRevenue],
  );

  const revExpChartConfig = useMemo(
    () => ({
      revenue: {
        label: t("reports.totalRevenue"),
        color: "hsl(var(--chart-1))",
      },
      expenses: {
        label: t("reports.totalExpenses"),
        color: "hsl(var(--chart-3))",
      },
    }),
    [t],
  );

  const revExpData = useMemo(
    () =>
      revVsExp?.map((month) => ({
        month: MONTH_LABELS[month.month.slice(-2)] || month.month,
        revenue: Math.round(month.revenue),
        expenses: Math.round(month.expenses),
      })) ?? [],
    [revVsExp],
  );

  const statusChartConfig = useMemo(
    () => ({
      count: { label: t("common.quantity"), color: "hsl(var(--chart-1))" },
      PAID: { label: t("common.paid"), color: "hsl(var(--chart-2))" },
      SENT: { label: t("common.sent"), color: "hsl(var(--chart-1))" },
      PARTIAL: { label: t("common.partial"), color: "hsl(var(--chart-4))" },
      OVERDUE: { label: t("common.overdue"), color: "hsl(var(--chart-5))" },
      DRAFT: { label: t("common.draft"), color: "hsl(var(--chart-3))" },
      DISPUTED: { label: t("common.rejected"), color: "hsl(0 70% 50%)" },
      CANCELLED: { label: t("common.cancelled"), color: "hsl(0 0% 60%)" },
    }),
    [t],
  );

  const agingChartConfig = useMemo(
    () => ({ amount: { label: t("common.amount") } }),
    [t],
  );

  const salesChartConfig = useMemo(
    () => ({
      totalSales: {
        label: t("reports.salesReport"),
        color: "hsl(var(--chart-1))",
      },
    }),
    [t],
  );

  const topCustomers = useMemo(
    () => salesByCustomer?.slice(0, 8) ?? [],
    [salesByCustomer],
  );

  const itemsChartConfig = useMemo(
    () => ({
      totalRevenue: {
        label: t("reports.totalRevenue"),
        color: "hsl(var(--chart-2))",
      },
    }),
    [t],
  );

  const topItemsData = useMemo(() => topItems?.slice(0, 10) ?? [], [topItems]);

  const tickFormat = useMemo(
    () => (value: number) => fmtShort(value, format),
    [format],
  );

  const revenueIsEmpty =
    revenueData.length === 0 ||
    revenueData.every((month) => month.revenue === 0 && month.profit === 0);
  const revExpIsEmpty =
    revExpData.length === 0 ||
    revExpData.every((month) => month.revenue === 0 && month.expenses === 0);
  const agingIsEmpty =
    !arAging || arAging.every((bucket) => bucket.amount === 0);

  return (
    <ReportLayout
      title={t("reports.title")}
      description={t("reports.hubDescription")}
      icon={<BarChart3 className="size-5" />}
      actions={<ReportPrintButton showExport={false} />}
    >
      <section
        aria-label={t("reports.title")}
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
      >
        {kpis.map((kpi) => (
          <ReportKpiCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            sub={kpi.sub}
            trend={kpi.trend}
            icon={kpi.icon}
            variant={kpi.variant}
            loading={summaryLoading}
          />
        ))}
      </section>

      <Tabs defaultValue="reports" className="flex flex-col gap-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="reports">
            <BarChart3 />
            {t("reports.title")}
          </TabsTrigger>
          <TabsTrigger value="overview">
            <TrendingUp />
            {t("common.overview")}
          </TabsTrigger>
          <TabsTrigger value="financial">
            <Wallet />
            {t("settings.financial")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-0">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ReportLinkCard
              href="/erp/reports/profit-and-loss"
              title={t("reports.profitAndLoss")}
              description={t("reports.profitAndLossDescription")}
              icon={<TrendingUp className="size-5" />}
              tone="1"
            />
            <ReportLinkCard
              href="/erp/reports/balance-sheet"
              title={t("reports.balanceSheet")}
              description={t("reports.balanceSheetDescription")}
              icon={<Landmark className="size-5" />}
              tone="2"
            />
            <ReportLinkCard
              href="/erp/reports/trial-balance"
              title={t("reports.trialBalance")}
              description={t("reports.trialBalanceDescription")}
              icon={<Scale className="size-5" />}
              tone="3"
            />
            <ReportLinkCard
              href="/erp/reports/ap-aging"
              title={t("reports.apAging")}
              description={t("reports.apAgingDescriptionDetail")}
              icon={<Clock className="size-5" />}
              tone="4"
            />
            <ReportLinkCard
              href="/erp/reports/ar-aging"
              title={t("reports.arAging")}
              description={t("reports.arAgingDescriptionDetail")}
              icon={<Receipt className="size-5" />}
              tone="5"
            />
            <ReportLinkCard
              href="/erp/reports/general-ledger"
              title={t("reports.generalLedger")}
              description={t("reports.generalLedgerDescription")}
              icon={<BookOpen className="size-5" />}
              tone="1"
            />
            <ReportLinkCard
              href="/erp/reports/items"
              title={t("layout.itemReport")}
              description={t("reports.itemReportDescription")}
              icon={<Package className="size-5" />}
              tone="2"
            />
          </div>
        </TabsContent>

        <TabsContent value="overview" className="mt-0 flex flex-col gap-4">
          <ReportCard
            title={t("reports.revenueTrend")}
            description={t("reports.revenueTrendDesc")}
            icon={<TrendingUp className="size-4" />}
          >
            {monthlyLoading ? (
              <ChartSkeleton />
            ) : revenueIsEmpty ? (
              <ReportEmpty
                icon={<TrendingUp />}
                title={t("reports.noData")}
                description={t("reports.revenueTrendDesc")}
              />
            ) : (
              <ChartContainer
                config={revenueChartConfig}
                className="aspect-auto h-[300px] w-full"
              >
                <AreaChart
                  data={revenueData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="fillRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--chart-2))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--chart-2))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={tickFormat}
                  />
                  <Area
                    dataKey="revenue"
                    type="monotone"
                    fill="url(#fillRevenue)"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="profit"
                    type="monotone"
                    fill="url(#fillProfit)"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            )}
          </ReportCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ReportCard
              title={t("reports.customerReport")}
              description={t("reports.salesDesc")}
              icon={<Users className="size-4" />}
            >
              {salesLoading ? (
                <ChartSkeleton />
              ) : topCustomers.length === 0 ? (
                <ReportEmpty
                  icon={<Users />}
                  title={t("reports.noData")}
                  description={t("reports.salesDesc")}
                />
              ) : (
                <ChartContainer
                  config={salesChartConfig}
                  className="aspect-auto h-[300px] w-full"
                >
                  <BarChart
                    data={topCustomers}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={tickFormat}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <Bar
                      dataKey="totalSales"
                      radius={[0, 4, 4, 0]}
                      barSize={16}
                    >
                      {topCustomers.map((_, index) => (
                        <Cell
                          key={index}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </ReportCard>

            <ReportCard
              title={t("reports.topItems")}
              description={t("reports.topItemsDesc")}
              icon={<Package className="size-4" />}
            >
              {itemsLoading ? (
                <ChartSkeleton />
              ) : topItemsData.length === 0 ? (
                <ReportEmpty
                  icon={<Package />}
                  title={t("reports.noData")}
                  description={t("reports.topItemsDesc")}
                />
              ) : (
                <ChartContainer
                  config={itemsChartConfig}
                  className="aspect-auto h-[300px] w-full"
                >
                  <BarChart
                    data={topItemsData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={tickFormat}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Bar
                      dataKey="totalRevenue"
                      radius={[0, 4, 4, 0]}
                      barSize={16}
                    >
                      {topItemsData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </ReportCard>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="mt-0 flex flex-col gap-4">
          <ReportCard
            title={`${t("reports.totalRevenue")} vs ${t("reports.totalExpenses")}`}
            description={t("reports.profitAndLossDescription")}
            icon={<BarChart3 className="size-4" />}
          >
            {revExpLoading ? (
              <ChartSkeleton />
            ) : revExpIsEmpty ? (
              <ReportEmpty
                icon={<BarChart3 />}
                title={t("reports.noData")}
                description={t("reports.profitAndLossDescription")}
              />
            ) : (
              <ChartContainer
                config={revExpChartConfig}
                className="aspect-auto h-[300px] w-full"
              >
                <BarChart
                  data={revExpData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                >
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={tickFormat}
                  />
                  <Bar
                    dataKey="revenue"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                    fill="hsl(var(--chart-1))"
                  />
                  <Bar
                    dataKey="expenses"
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                    fill="hsl(var(--chart-3))"
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            )}
          </ReportCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ReportCard
              title={t("common.status")}
              description={t("reports.invoiceStatusDistributionDescription")}
              icon={<FileText className="size-4" />}
            >
              {statusLoading ? (
                <ChartSkeleton />
              ) : !invoiceStatusDist || invoiceStatusDist.length === 0 ? (
                <ReportEmpty
                  icon={<FileText />}
                  title={t("reports.noData")}
                  description={t(
                    "reports.invoiceStatusDistributionDescription",
                  )}
                />
              ) : (
                <ChartContainer
                  config={statusChartConfig}
                  className="aspect-auto h-[300px] w-full"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={invoiceStatusDist}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {invoiceStatusDist.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={
                            statusChartConfig[
                              entry.status as keyof typeof statusChartConfig
                            ]?.color ?? "hsl(var(--chart-1))"
                          }
                        />
                      ))}
                    </Pie>
                    <ChartLegend
                      content={<ChartLegendContent nameKey="status" />}
                      verticalAlign="bottom"
                    />
                  </PieChart>
                </ChartContainer>
              )}
            </ReportCard>

            <ReportCard
              title={t("invoices.outstanding")}
              description={t("reports.arAgingDescription")}
              icon={<Receipt className="size-4" />}
            >
              {agingLoading ? (
                <ChartSkeleton />
              ) : agingIsEmpty ? (
                <ReportEmpty
                  icon={<Receipt />}
                  title={t("reports.noOutstandingReceivables")}
                  description={t("reports.arAgingDescription")}
                />
              ) : (
                <ChartContainer
                  config={agingChartConfig}
                  className="aspect-auto h-[300px] w-full"
                >
                  <BarChart
                    data={arAging}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          formatter={(value: any) => format(Number(value))}
                        />
                      }
                    />
                    <XAxis
                      dataKey="bucket"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={tickFormat}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={32}>
                      {arAging.map((entry, index) => {
                        const color =
                          index === 0
                            ? "hsl(var(--chart-2))"
                            : index <= 2
                              ? "hsl(var(--chart-4))"
                              : "hsl(var(--chart-5))";
                        return <Cell key={entry.bucket} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </ReportCard>
          </div>
        </TabsContent>
      </Tabs>
    </ReportLayout>
  );
}
