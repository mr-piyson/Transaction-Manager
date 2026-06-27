'use client';

import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Box,
  DollarSign,
  FileText,
  IndianRupee,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { useMemo, useRef, useState } from 'react';
import { Header } from '@/app/app/App-Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrency } from '@/hooks/use-currency';
import { useTableTheme } from '@/hooks/use-table-theme';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';

ModuleRegistry.registerModules([AllCommunityModule]);

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function fmtShort(n: number, format: (v: number) => string) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return format(n);
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  sub,
  icon,
  trend,
  loading,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: { dir: 'up' | 'down'; label: string };
  loading?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-colors group-hover:bg-primary/20">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            {trend && (
              <div
                className={cn(
                  'flex items-center gap-1 mt-2 text-xs font-medium',
                  trend.dir === 'up'
                    ? 'text-emerald-600 dark:text-emerald-500'
                    : 'text-red-600 dark:text-red-500',
                )}
              >
                {trend.dir === 'up' ? (
                  <ArrowUp className="size-3" />
                ) : (
                  <ArrowDown className="size-3" />
                )}
                {trend.label}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Chart Skeleton ──────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="space-y-3 p-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-[250px] w-full rounded-lg" />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const t = useTranslations();
  const MONTH_LABELS: Record<string, string> = {
    '01': t('common.monthNames.0'),
    '02': t('common.monthNames.1'),
    '03': t('common.monthNames.2'),
    '04': t('common.monthNames.3'),
    '05': t('common.monthNames.4'),
    '06': t('common.monthNames.5'),
    '07': t('common.monthNames.6'),
    '08': t('common.monthNames.7'),
    '09': t('common.monthNames.8'),
    '10': t('common.monthNames.9'),
    '11': t('common.monthNames.10'),
    '12': t('common.monthNames.11'),
  };
  const { data: summary, isLoading: summaryLoading } = trpc.reports.summary.useQuery();
  const { data: monthlyRevenue, isLoading: monthlyLoading } =
    trpc.reports.monthlyRevenue.useQuery();
  const { data: invoiceStatusDist, isLoading: statusLoading } =
    trpc.reports.invoiceStatusDistribution.useQuery();
  const { data: arAging, isLoading: agingLoading } = trpc.reports.arAging.useQuery();
  const { data: revVsExp, isLoading: revExpLoading } = trpc.reports.revenueVsExpenses.useQuery();
  const { data: salesByCustomer, isLoading: salesLoading } =
    trpc.reports.salesByCustomer.useQuery();
  const { data: topItems, isLoading: itemsLoading } = trpc.reports.topItems.useQuery();

  const chartHeight = 300;

  // ── Revenue Chart Config ─────────────────────────────────────────────────
  const revenueChartConfig = useMemo(
    () => ({
      revenue: { label: t('reports.totalRevenue'), color: 'hsl(var(--chart-1))' },
      profit: { label: t('reports.grossProfit'), color: 'hsl(var(--chart-2))' },
    }),
    [],
  );

  const revenueData = useMemo(
    () =>
      monthlyRevenue?.map((m) => ({
        month: MONTH_LABELS[m.month.slice(-2)] || m.month,
        revenue: Math.round(m.revenue),
        profit: Math.round(m.profit),
      })) ?? [],
    [monthlyRevenue],
  );

  // ── Rev vs Exp Chart Config ──────────────────────────────────────────────
  const revExpChartConfig = useMemo(
    () => ({
      revenue: { label: t('reports.totalRevenue'), color: 'hsl(var(--chart-1))' },
      expenses: { label: t('reports.totalExpenses'), color: 'hsl(var(--chart-3))' },
    }),
    [],
  );

  const revExpData = useMemo(
    () =>
      revVsExp?.map((m) => ({
        month: MONTH_LABELS[m.month.slice(-2)] || m.month,
        revenue: Math.round(m.revenue),
        expenses: Math.round(m.expenses),
      })) ?? [],
    [revVsExp],
  );

  // ── Status Config ────────────────────────────────────────────────────────
  const statusChartConfig = useMemo(
    () => ({
      count: { label: t('common.quantity'), color: 'hsl(var(--chart-1))' },
      PAID: { label: t('common.paid'), color: 'hsl(var(--chart-2))' },
      SENT: { label: t('common.sent'), color: 'hsl(var(--chart-1))' },
      PARTIAL: { label: t('common.partial'), color: 'hsl(var(--chart-4))' },
      OVERDUE: { label: t('common.overdue'), color: 'hsl(var(--chart-5))' },
      DRAFT: { label: t('common.draft'), color: 'hsl(var(--chart-3))' },
      DISPUTED: { label: t('common.rejected'), color: 'hsl(0 70% 50%)' },
      CANCELLED: { label: t('common.cancelled'), color: 'hsl(0 0% 60%)' },
    }),
    [],
  );

  // ── AR Aging Config ──────────────────────────────────────────────────────
  const agingChartConfig = useMemo(
    () => ({
      amount: { label: t('common.amount') },
    }),
    [],
  );

  // ── Sales by Customer Config ─────────────────────────────────────────────
  const salesChartConfig = useMemo(
    () => ({
      totalSales: { label: t('reports.salesReport'), color: 'hsl(var(--chart-1))' },
    }),
    [],
  );

  const topCustomers = useMemo(
    () => salesByCustomer?.slice(0, 8) ?? [],
    [salesByCustomer],
  );

  // ── Top Items Config ─────────────────────────────────────────────────────
  const itemsChartConfig = useMemo(
    () => ({
      totalRevenue: { label: t('reports.totalRevenue'), color: 'hsl(var(--chart-2))' },
    }),
    [],
  );

  const topItemsData = useMemo(() => topItems?.slice(0, 10) ?? [], [topItems]);

  // ── ag-Grid Financial Transactions ──────────────────────────────────────
  const theme = useTableTheme();
  const gridApiRef = useRef<GridApi | null>(null);

  const transactionData = useMemo(() => {
    const rows: any[] = [];

    if (monthlyRevenue) {
      for (const m of monthlyRevenue) {
        rows.push({
          id: `rev-${m.month}`,
          date: m.month,
          type: t('reports.revenue'),
          description: t('reports.invoiceRevenueDesc', { month: MONTH_LABELS[m.month.slice(-2)] || m.month }),
          amount: Math.round(m.revenue),
          status: t('common.posted'),
          category: t('reports.income'),
        });
        if (m.cost > 0) {
          rows.push({
            id: `cogs-${m.month}`,
            date: m.month,
            type: t('reports.cogs'),
            description: t('reports.cogsDesc', { month: MONTH_LABELS[m.month.slice(-2)] || m.month }),
            amount: -Math.round(m.cost),
            status: t('common.posted'),
            category: t('reports.costOfSales'),
          });
        }
      }
    }

    if (revVsExp) {
      for (const m of revVsExp) {
        if (m.expenses > 0) {
          rows.push({
            id: `exp-${m.month}`,
            date: m.month,
            type: t('reports.expense'),
            description: t('reports.expenseDesc', { month: MONTH_LABELS[m.month.slice(-2)] || m.month }),
            amount: -Math.round(m.expenses),
            status: t('common.posted'),
            category: t('reports.expensesCategory'),
          });
        }
      }
    }

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [monthlyRevenue, revVsExp]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      { field: 'date', headerName: t('common.date'), width: 100 },
      { field: 'type', headerName: t('common.type'), width: 100 },
      { field: 'description', headerName: t('common.description'), flex: 1, minWidth: 200 },
      {
        field: 'amount',
        headerName: t('common.amount'),
        width: 130,
        type: 'rightAligned',
        valueFormatter: (p) => format(p.value),
        cellStyle: (p) =>
          p.value < 0 ? { color: 'hsl(0 70% 50%)' } : { color: 'hsl(142 70% 45%)' },
      },
      {
        field: 'status',
        headerName: t('common.status'),
        width: 100,
        cellRenderer: (p: any) => (
          <Badge variant="outline" className="text-[10px] h-5 mt-1.5">
            {p.value}
          </Badge>
        ),
      },
      { field: 'category', headerName: t('items.category'), width: 120 },
    ],
    [],
  );

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    [],
  );

  const { format } = useCurrency();
  const tickFormat = useMemo(() => (n: number) => fmtShort(n, format), [format]);
  const summaryLoadingState = summaryLoading;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12">
      <Header title={t('reports.title')} icon={<BarChart3 className="size-5" />} />

      <main className="flex-1 p-4 lg:p-8 space-y-8 max-w-360 mx-auto w-full">
        {/* ── KPI Cards Row ──────────────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard
              title={t('reports.totalRevenue')}
              value={summary ? format(summary.revenue.total) : '-'}
              sub={t('reports.invoiceCount', { count: summary?.revenue.count ?? 0 })}
              icon={<TrendingUp className="size-4" />}
              loading={summaryLoadingState}
            />
            <KpiCard
              title={t('reports.grossProfit')}
              value={summary ? format(summary.grossProfit) : '-'}
              sub={t('reports.marginPercent', { percent: summary ? ((summary.grossProfit / summary.revenue.total) * 100).toFixed(1) : 0 })}
              icon={<Wallet className="size-4" />}
              loading={summaryLoadingState}
              trend={
                summary?.grossProfit
                  ? { dir: summary.grossProfit > 0 ? 'up' : 'down', label: t('reports.beforeExpenses') }
                  : undefined
              }
            />
            <KpiCard
              title={t('reports.netProfit')}
              value={summary ? format(summary.netProfit) : '-'}
              sub={t('reports.afterExpenses', { amount: summary ? format(summary.expenses) : 0 })}
              icon={<DollarSign className="size-4" />}
              loading={summaryLoadingState}
              trend={
                summary?.netProfit
                  ? { dir: summary.netProfit > 0 ? 'up' : 'down', label: t('reports.netResult') }
                  : undefined
              }
            />
            <KpiCard
              title={t('invoices.outstanding')}
              value={summary ? format(summary.outstanding.total) : '-'}
              sub={t('reports.openInvoiceCount', { count: summary?.outstanding.count ?? 0 })}
              icon={<Receipt className="size-4" />}
              loading={summaryLoadingState}
              trend={
                summary?.outstanding.total ? { dir: 'down', label: t('reports.needsCollection') } : undefined
              }
            />
            <KpiCard
              title={t('reports.totalExpenses')}
              value={summary ? format(summary.expenses) : '-'}
              icon={<ShoppingCart className="size-4" />}
              loading={summaryLoadingState}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <KpiCard
              title={t('invoices.totalCollected')}
              value={summary ? format(summary.collected.total) : '-'}
              icon={<IndianRupee className="size-4" />}
              loading={summaryLoadingState}
            />
            <KpiCard
              title={t('reports.purchaseReport')}
              value={summary ? format(summary.purchases.total) : '-'}
              sub={t('reports.orderCount', { count: summary?.purchases.count ?? 0 })}
              icon={<Package className="size-4" />}
              loading={summaryLoadingState}
            />
            <KpiCard
              title={t('layout.inventory')}
              value={String(summary?.inventory.itemCount ?? '-')}
              sub={t('reports.lowStockCount', { count: summary?.inventory.lowStockCount ?? 0 })}
              icon={<Box className="size-4" />}
              loading={summaryLoadingState}
            />
            <KpiCard
              title={t('reports.customerReport')}
              value={String(summary?.customers.activeCount ?? '-')}
              sub={t('reports.supplierCount', { count: summary?.suppliers.activeCount ?? 0 })}
              icon={<Users className="size-4" />}
              loading={summaryLoadingState}
            />
          </div>
        </section>

        {/* ── Charts Section ──────────────────────────────────────────────── */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList
            variant="line"
            className="w-full justify-start border-b rounded-none bg-transparent h-auto pb-0 gap-0"
          >
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-3 px-4"
            >
              {t('common.overview')}
            </TabsTrigger>
            <TabsTrigger
              value="financial"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-3 px-4"
            >
              {t('settings.financial')}
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary pb-3 px-4"
            >
              {t('common.details')}
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* OVERVIEW TAB                                                 */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" />
                    {t('reports.salesReport')}
                  </CardTitle>
                  <CardDescription>
                    {t('reports.grossProfit')}
                  </CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyLoading ? (
                  <ChartSkeleton />
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
                        <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
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
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales by Customer */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    {t('reports.customerReport')}
                  </CardTitle>
                  <CardDescription>{t('common.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {salesLoading ? (
                    <ChartSkeleton />
                  ) : topCustomers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      {t('reports.noData')}
                    </p>
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
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
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
                        <Bar dataKey="totalSales" radius={[0, 4, 4, 0]} barSize={16}>
                          {topCustomers.map((_, i) => (
                            <Cell
                              key={i}
                              fill={CHART_COLORS[i % CHART_COLORS.length]}
                              fillOpacity={0.85}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Top Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Box className="size-4 text-primary" />
                    {t('reports.salesReport')}
                  </CardTitle>
                  <CardDescription>{t('common.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {itemsLoading ? (
                    <ChartSkeleton />
                  ) : topItemsData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      {t('reports.noData')}
                    </p>
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
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
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
                        <Bar dataKey="totalRevenue" radius={[0, 4, 4, 0]} barSize={16}>
                          {topItemsData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={CHART_COLORS[i % CHART_COLORS.length]}
                              fillOpacity={0.85}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* FINANCIAL TAB                                               */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="financial" className="space-y-6 mt-0">
            {/* Revenue vs Expenses */}
            <Card>
              <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" />
                    {t('reports.totalRevenue')} vs {t('reports.totalExpenses')}
                  </CardTitle>
                  <CardDescription>{t('common.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                {revExpLoading ? (
                  <ChartSkeleton />
                ) : (
                  <ChartContainer
                    config={revExpChartConfig}
                    className="aspect-auto h-[300px] w-full"
                  >
                    <BarChart data={revExpData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
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
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Invoice Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    {t('common.status')}
                  </CardTitle>
                  <CardDescription>{t('common.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {statusLoading ? (
                    <ChartSkeleton />
                  ) : !invoiceStatusDist || invoiceStatusDist.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      {t('reports.noData')}
                    </p>
                  ) : (
                    <ChartContainer
                      config={statusChartConfig}
                      className="aspect-auto h-[300px] w-full"
                    >
                      <PieChart>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
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
                                statusChartConfig[entry.status as keyof typeof statusChartConfig]
                                  ?.color ?? 'hsl(var(--chart-1))'
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
                </CardContent>
              </Card>

              {/* AR Aging */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="size-4 text-primary" />
                    {t('invoices.outstanding')}
                  </CardTitle>
                  <CardDescription>{t('common.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {agingLoading ? (
                    <ChartSkeleton />
                  ) : !arAging || arAging.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      {t('reports.noData')}
                    </p>
                  ) : (
                    <ChartContainer
                      config={agingChartConfig}
                      className="aspect-auto h-[300px] w-full"
                    >
                      <BarChart data={arAging} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              indicator="dot"
                              formatter={(value: any) => format(Number(value))}
                            />
                          }
                        />
                        <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={tickFormat}
                        />

                        <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={32}>
                          {arAging.map((entry, i) => {
                            const color =
                              i === 0
                                ? 'hsl(var(--chart-2))'
                                : i <= 2
                                  ? 'hsl(var(--chart-4))'
                                  : 'hsl(var(--chart-5))';
                            return <Cell key={entry.bucket} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* DETAILS TAB                                                 */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <TabsContent value="details" className="mt-0">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" />
                    {t('settings.financial')}
                  </CardTitle>
                  <CardDescription>{t('common.details')}</CardDescription>
                </div>
                {gridApiRef.current && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => gridApiRef.current?.exportDataAsCsv()}
                  >
                    {t('common.export')}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] w-full">
                  <AgGridReact
                    rowData={transactionData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    theme={theme}
                    animateRows
                    onGridReady={(params) => {
                      gridApiRef.current = params.api;
                    }}
                    domLayout="normal"
                    getRowId={(params) => params.data.id}
                    suppressScrollOnNewData
                    enableCellTextSelection
                    ensureDomOrder
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
