'use client';

import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import {
  ArrowDown,
  ArrowUp,
  Clock,
  FileDown,
  Receipt,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { Header } from '@/components/layout/App-Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/use-currency';
import { useDateFormat } from '@/hooks/use-date-format';
import { useTableTheme } from '@/hooks/use-table-theme';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts';

ModuleRegistry.registerModules([AllCommunityModule]);

const BUCKET_COLORS = [
  'hsl(var(--chart-2))', // Current - green
  'hsl(var(--chart-4))', // 1-30 - yellow
  'hsl(var(--chart-4))', // 31-60 - orange
  'hsl(var(--chart-5))', // 61-90 - red
  'hsl(0 70% 50%)',     // 90+ - dark red
];

function KpiCard({
  title,
  value,
  count,
  icon,
  variant = 'default',
  loading,
}: {
  title: string;
  value: string;
  count?: number;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger';
  loading?: boolean;
}) {
  const bgColors = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-500',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-500',
  };

  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn('size-9 rounded-xl flex items-center justify-center transition-colors group-hover:opacity-80', bgColors[variant])}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {count !== undefined && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {count} {count === 1 ? 'invoice' : 'invoices'}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function ARagingPage() {
  const t = useTranslations();
  const router = useRouter();
  const { format } = useCurrency();
  const { formatShortDate } = useDateFormat();
  const theme = useTableTheme();
  const gridApiRef = useRef<GridApi | null>(null);

  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  const { data, isLoading } = trpc.invoices.arAgingDetailed.useQuery();

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.buckets.map((b) => ({
      bucket: b.bucket,
      amount: Math.round(b.amount),
      count: b.count,
    }));
  }, [data]);

  const selectedBucketData = useMemo(() => {
    if (!data || !selectedBucket) return null;
    return data.buckets.find((b) => b.bucket === selectedBucket);
  }, [data, selectedBucket]);

  const invoiceList = useMemo(() => {
    if (selectedBucketData) {
      return selectedBucketData.invoices;
    }
    if (!data) return [];
    return data.buckets.flatMap((b) => b.invoices);
  }, [data, selectedBucketData]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'serial',
        headerName: t('common.serial') ?? 'Invoice #',
        width: 140,
        cellRenderer: (p: any) => (
          <span className="font-medium text-sm">{p.value}</span>
        ),
      },
      {
        field: 'customerName',
        headerName: t('common.customer') ?? 'Customer',
        flex: 1,
        minWidth: 150,
      },
      {
        field: 'total',
        headerName: t('common.total') ?? 'Total',
        width: 120,
        type: 'rightAligned',
        valueFormatter: (p) => format(p.value),
        cellClass: 'font-mono text-[11px]',
      },
      {
        field: 'amountDue',
        headerName: t('invoices.outstanding') ?? 'Amount Due',
        width: 130,
        type: 'rightAligned',
        valueFormatter: (p) => format(p.value),
        cellClass: 'font-mono text-[11px] font-bold text-red-600 dark:text-red-500',
      },
      {
        field: 'dueDate',
        headerName: t('common.dueDate') ?? 'Due Date',
        width: 120,
        valueFormatter: (p) => p.value ? formatShortDate(p.value) : '—',
        cellClass: (p) => {
          if (!p.value) return '';
          const days = Math.floor((new Date().getTime() - new Date(p.value).getTime()) / (1000 * 60 * 60 * 24));
          if (days > 90) return 'text-red-600 dark:text-red-500 font-bold';
          if (days > 60) return 'text-red-600 dark:text-red-500';
          if (days > 30) return 'text-amber-600 dark:text-amber-500';
          return '';
        },
      },
      {
        field: 'daysOverdue',
        headerName: t('reports.daysOverdue') ?? 'Days Overdue',
        width: 120,
        type: 'rightAligned',
        cellRenderer: (p: any) => {
          if (p.value <= 0) {
            return <Badge variant="outline" className="text-[10px] h-5">Current</Badge>;
          }
          const variant = p.value > 90 ? 'destructive' : p.value > 60 ? 'destructive' : p.value > 30 ? 'default' : 'secondary';
          return <Badge variant={variant} className="text-[10px] h-5">{p.value} days</Badge>;
        },
      },
    ],
    [format, formatShortDate, t],
  );

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    [],
  );

  const chartConfig = useMemo(
    () => ({
      amount: { label: t('common.amount') ?? 'Amount' },
    }),
    [t],
  );

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12">
      <Header
        title={t('reports.arAging') ?? 'Accounts Receivable Aging'}
        icon={<Clock className="size-5" />}
      />

      <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-360 mx-auto w-full">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-7 w-24" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <KpiCard
                title="Current"
                value={data ? format(data.buckets[0].amount) : '-'}
                count={data?.buckets[0].count}
                icon={<TrendingUp className="size-4" />}
                variant="default"
                loading={isLoading}
              />
              <KpiCard
                title="1–30 Days"
                value={data ? format(data.buckets[1].amount) : '-'}
                count={data?.buckets[1].count}
                icon={<Clock className="size-4" />}
                variant="warning"
                loading={isLoading}
              />
              <KpiCard
                title="31–60 Days"
                value={data ? format(data.buckets[2].amount) : '-'}
                count={data?.buckets[2].count}
                icon={<Clock className="size-4" />}
                variant="warning"
                loading={isLoading}
              />
              <KpiCard
                title="61–90 Days"
                value={data ? format(data.buckets[3].amount) : '-'}
                count={data?.buckets[3].count}
                icon={<ArrowDown className="size-4" />}
                variant="danger"
                loading={isLoading}
              />
              <KpiCard
                title="90+ Days"
                value={data ? format(data.buckets[4].amount) : '-'}
                count={data?.buckets[4].count}
                icon={<ArrowUp className="size-4" />}
                variant="danger"
                loading={isLoading}
              />
            </>
          )}
        </div>

        {/* Chart + Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Aging Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                {t('reports.arAging') ?? 'AR Aging Distribution'}
              </CardTitle>
              <CardDescription>
                {t('reports.arAgingDescription') ?? 'Outstanding receivables by aging bucket'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  {t('reports.noOutstandingReceivables') ?? 'No outstanding receivables'}
                </p>
              ) : (
                <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    onClick={(data: any) => {
                      if (data?.activePayload?.[0]) {
                        const bucket = data.activePayload[0].payload.bucket;
                        setSelectedBucket(selectedBucket === bucket ? null : bucket);
                      }
                    }}
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
                    <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(n) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={32}>
                      {chartData.map((entry, i) => (
                        <Cell
                          key={entry.bucket}
                          fill={BUCKET_COLORS[i]}
                          fillOpacity={selectedBucket === null || selectedBucket === entry.bucket ? 1 : 0.3}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                {t('common.summary') ?? 'Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {data?.buckets.map((bucket) => (
                    <button
                      key={bucket.bucket}
                      onClick={() => setSelectedBucket(selectedBucket === bucket.bucket ? null : bucket.bucket)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg border transition-colors',
                        selectedBucket === bucket.bucket
                          ? 'bg-primary/10 border-primary/30'
                          : 'hover:bg-muted/50',
                      )}
                    >
                      <div className="text-left">
                        <div className="text-sm font-medium">{bucket.bucket}</div>
                        <div className="text-xs text-muted-foreground">{bucket.count} invoices</div>
                      </div>
                      <div className="text-sm font-semibold">{format(bucket.amount)}</div>
                    </button>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t('common.total') ?? 'Total'}</span>
                      <span className="text-sm font-bold">{data?.totalCount} invoices</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-medium">{t('invoices.outstanding') ?? 'Outstanding'}</span>
                      <span className="text-lg font-bold text-red-600 dark:text-red-500">
                        {data ? format(data.grandTotal) : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Table */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileDown className="size-4 text-primary" />
                {selectedBucket ? `${selectedBucket} - ` : ''}{t('reports.invoices') ?? 'Invoices'}
              </CardTitle>
              <CardDescription>
                {invoiceList.length} {t('reports.outstandingInvoices') ?? 'outstanding invoices'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedBucket && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBucket(null)}
                >
                  {t('common.clear') ?? 'Clear Filter'}
                </Button>
              )}
              {gridApiRef.current && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => gridApiRef.current?.exportDataAsCsv({ fileName: 'ar-aging' })}
                >
                  {t('common.export') ?? 'Export'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="h-[400px] w-full">
                <AgGridReact
                  rowData={invoiceList}
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
                  onRowClicked={(params) => {
                    router.push(`/erp/documents/invoices/${params.data.id}`);
                  }}
                  getRowClass={() => 'cursor-pointer'}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
