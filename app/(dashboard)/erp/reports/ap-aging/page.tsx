'use client';

import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { ArrowDown, ArrowUp, Clock, FileDown, TrendingUp, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { ReportKpiCard, ReportLayout, ReportCsvExportButton } from '@/components/reports';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/use-currency';
import { useDateFormat } from '@/hooks/use-date-format';
import { useTableTheme } from '@/hooks/use-table-theme';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts';

ModuleRegistry.registerModules([AllCommunityModule]);

const BUCKET_COLORS = [
  'hsl(var(--chart-2))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(0 70% 50%)',
];

const BUCKET_KEYS = ['agingCurrent', 'aging1to30', 'aging31to60', 'aging61to90', 'aging90plus'] as const;

export default function APAgingPage() {
  const t = useTranslations();
  const router = useRouter();
  const { format } = useCurrency();
  const { formatShortDate } = useDateFormat();
  const theme = useTableTheme();
  const gridApiRef = useRef<GridApi | null>(null);

  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  const { data, isLoading } = trpc.reports.apAgingDetailed.useQuery();

  const bucketLabels = useMemo(
    () => BUCKET_KEYS.map((key) => t(`reports.${key}`)),
    [t],
  );

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.buckets.map((b, i) => ({
      bucket: bucketLabels[i] ?? b.bucket,
      rawBucket: b.bucket,
      amount: Math.round(b.amount),
      count: b.count,
    }));
  }, [data, bucketLabels]);

  const selectedBucketData = useMemo(() => {
    if (!data || !selectedBucket) return null;
    return data.buckets.find((b) => b.bucket === selectedBucket);
  }, [data, selectedBucket]);

  const poList = useMemo(() => {
    if (selectedBucketData) return selectedBucketData.pos;
    if (!data) return [];
    return data.buckets.flatMap((b) => b.pos);
  }, [data, selectedBucketData]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'serial',
        headerName: t('common.serial'),
        width: 140,
        cellRenderer: (p: any) => <span className="font-medium text-sm">{p.value}</span>,
      },
      { field: 'supplierName', headerName: t('common.supplier'), flex: 1, minWidth: 150 },
      {
        field: 'total',
        headerName: t('common.total'),
        width: 120,
        type: 'rightAligned',
        valueFormatter: (p) => format(p.value),
        cellClass: 'font-mono text-[11px]',
      },
      {
        field: 'amountOwed',
        headerName: t('invoices.outstanding'),
        width: 130,
        type: 'rightAligned',
        valueFormatter: (p) => format(p.value),
        cellClass: 'font-mono text-[11px] font-bold text-red-600 dark:text-red-500',
      },
      {
        field: 'dueDate',
        headerName: t('common.dueDate'),
        width: 120,
        valueFormatter: (p) => (p.value ? formatShortDate(p.value) : '\u2014'),
        cellClass: (p) => {
          if (!p.value) return '';
          const days = Math.floor(
            (new Date().getTime() - new Date(p.value).getTime()) / (1000 * 60 * 60 * 24),
          );
          if (days > 90) return 'text-red-600 dark:text-red-500 font-bold';
          if (days > 60) return 'text-red-600 dark:text-red-500';
          if (days > 30) return 'text-amber-600 dark:text-amber-500';
          return '';
        },
      },
      {
        field: 'daysOverdue',
        headerName: t('reports.daysOverdue'),
        width: 120,
        type: 'rightAligned',
        cellRenderer: (p: any) => {
          if (p.value <= 0) {
            return (
              <Badge variant="outline" className="text-[10px] h-5">
                {t('reports.agingCurrent')}
              </Badge>
            );
          }
          const variant =
            p.value > 90 ? 'destructive' : p.value > 60 ? 'destructive' : p.value > 30 ? 'default' : 'secondary';
          return (
            <Badge variant={variant} className="text-[10px] h-5">
              {p.value} {t('common.days')}
            </Badge>
          );
        },
      },
    ],
    [format, formatShortDate, t],
  );

  const defaultColDef = useMemo(() => ({ resizable: true, sortable: true, filter: true }), []);

  const chartConfig = useMemo(() => ({ amount: { label: t('common.amount') } }), [t]);

  return (
    <ReportLayout title={t('reports.apAging')} icon={<Clock className="size-5" />}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-7 w-24" />
                </CardContent>
              </Card>
            ))
          : data?.buckets.map((bucket, i) => (
              <ReportKpiCard
                key={bucket.bucket}
                title={bucketLabels[i] ?? bucket.bucket}
                value={format(bucket.amount)}
                count={bucket.count}
                countLabel={t('reports.poCount', { count: bucket.count })}
                icon={<Clock className="size-4" />}
                variant={i === 0 ? 'default' : i <= 2 ? 'warning' : 'danger'}
              />
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 print:shadow-none">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="size-4 text-primary" />
              {t('reports.apAging')}
            </CardTitle>
            <CardDescription>{t('reports.apAgingDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                {t('reports.noOutstandingPayables')}
              </p>
            ) : (
              <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  onClick={(data: any) => {
                    if (data?.activePayload?.[0]) {
                      const rawBucket = data.activePayload[0].payload.rawBucket;
                      setSelectedBucket(selectedBucket === rawBucket ? null : rawBucket);
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
                    tickFormatter={(n) => (n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n))}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={32}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={entry.rawBucket}
                        fill={BUCKET_COLORS[i]}
                        fillOpacity={selectedBucket === null || selectedBucket === entry.rawBucket ? 1 : 0.3}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              {t('common.summary')}
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
                {data?.buckets.map((bucket, i) => (
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
                      <div className="text-sm font-medium">{bucketLabels[i] ?? bucket.bucket}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('reports.poCount', { count: bucket.count })}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{format(bucket.amount)}</div>
                  </button>
                ))}
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('reports.totalPOs')}</span>
                    <span className="text-sm font-bold">{data?.totalCount}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-medium">{t('reports.totalOutstanding')}</span>
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

      <Card className="print:shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileDown className="size-4 text-primary" />
              {selectedBucket ? `${selectedBucket} - ` : ''}
              {t('reports.purchaseOrders')}
            </CardTitle>
            <CardDescription>
              {poList.length} {t('reports.outstandingPOs')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            {selectedBucket && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedBucket(null)}>
                {t('common.clear')}
              </Button>
            )}
            <ReportCsvExportButton gridApiRef={gridApiRef} filename="ap-aging" />
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
                rowData={poList}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                theme={theme}
                animateRows
                onGridReady={(params) => { gridApiRef.current = params.api; }}
                domLayout="normal"
                getRowId={(params) => params.data.id}
                suppressScrollOnNewData
                enableCellTextSelection
                ensureDomOrder
                onRowClicked={(params) => {
                  router.push(`/erp/purchase-orders/${params.data.id}`);
                }}
                getRowClass={() => 'cursor-pointer'}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </ReportLayout>
  );
}
