'use client';

import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  DollarSign,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import { Header } from '@/components/layout/App-Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/use-currency';
import { useTableTheme } from '@/hooks/use-table-theme';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';

ModuleRegistry.registerModules([AllCommunityModule]);

function KpiCard({
  title,
  value,
  icon,
  variant = 'default',
  loading,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'danger';
  loading?: boolean;
}) {
  const bgColors = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500',
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
          <div className="text-2xl font-bold tracking-tight">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProfitAndLossPage() {
  const t = useTranslations();
  const { format } = useCurrency();
  const theme = useTableTheme();
  const gridApiRef = useRef<GridApi | null>(null);

  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const queryParams = useMemo(() => ({
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  }), [dateFrom, dateTo]);

  const { data, isLoading } = trpc.reports.profitAndLoss.useQuery(queryParams);

  const rowData = useMemo(() => {
    if (!data) return [];

    const rows: any[] = [];

    data.revenue.forEach((account) => {
      rows.push({
        id: `rev-${account.code}`,
        category: 'Revenue',
        code: account.code,
        name: account.name,
        amount: account.balance,
        isSubtotal: false,
      });
    });

    if (data.revenue.length > 0) {
      rows.push({
        id: 'rev-total',
        category: 'Revenue',
        code: '',
        name: 'Total Revenue',
        amount: data.totalRevenue,
        isSubtotal: true,
      });
    }

    data.expenses.forEach((account) => {
      rows.push({
        id: `exp-${account.code}`,
        category: 'Expense',
        code: account.code,
        name: account.name,
        amount: -account.balance,
        isSubtotal: false,
      });
    });

    if (data.expenses.length > 0) {
      rows.push({
        id: 'exp-total',
        category: 'Expense',
        code: '',
        name: 'Total Expenses',
        amount: -data.totalExpenses,
        isSubtotal: true,
      });
    }

    rows.push({
      id: 'net-income',
      category: 'Summary',
      code: '',
        name: 'Net Income',
      amount: data.netIncome,
      isSubtotal: true,
    });

    return rows;
  }, [data]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'code',
        headerName: t('common.code') ?? 'Code',
        width: 100,
        cellClass: 'font-mono text-[11px]',
      },
      {
        field: 'name',
        headerName: t('common.name') ?? 'Name',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'amount',
        headerName: t('common.amount') ?? 'Amount',
        width: 150,
        type: 'rightAligned',
        valueFormatter: (p) => format(Math.abs(p.value)),
        cellClass: (p) => cn(
          'font-mono text-[11px] tabular-nums',
          p.data?.isSubtotal && 'font-bold',
          p.value < 0 ? 'text-red-600 dark:text-red-500' : 'text-emerald-600 dark:text-emerald-500',
        ),
      },
    ],
    [format, t],
  );

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
    }),
    [],
  );

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12">
      <Header
        title={t('reports.profitAndLoss') ?? 'Profit & Loss Statement'}
        icon={<TrendingUp className="size-5" />}
      />

      <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-360 mx-auto w-full">
        {/* Date Range Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('common.from') ?? 'From'}
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('common.to') ?? 'To'}
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setDateFrom(''); setDateTo(''); }}
              >
                {t('common.clear') ?? 'Clear'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            title={t('reports.totalRevenue') ?? 'Total Revenue'}
            value={data ? format(data.totalRevenue) : '-'}
            icon={<TrendingUp className="size-4" />}
            variant="success"
            loading={isLoading}
          />
          <KpiCard
            title={t('reports.totalExpenses') ?? 'Total Expenses'}
            value={data ? format(data.totalExpenses) : '-'}
            icon={<Wallet className="size-4" />}
            variant="danger"
            loading={isLoading}
          />
          <KpiCard
            title={t('reports.netIncome') ?? 'Net Income'}
            value={data ? format(data.netIncome) : '-'}
            icon={<DollarSign className="size-4" />}
            variant={data && data.netIncome >= 0 ? 'success' : 'danger'}
            loading={isLoading}
          />
        </div>

        {/* Statement Table */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                {t('reports.profitAndLoss') ?? 'Profit & Loss Statement'}
              </CardTitle>
              <CardDescription>
                {dateFrom || dateTo
                  ? `${dateFrom || '...'} to ${dateTo || '...'}`
                  : t('reports.allTime') ?? 'All time'}
              </CardDescription>
            </div>
            {gridApiRef.current && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={() => gridApiRef.current?.exportDataAsCsv({ fileName: 'profit-and-loss' })}
              >
                {t('common.export') ?? 'Export'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="h-[500px] w-full">
                <AgGridReact
                  rowData={rowData}
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
                  getRowClass={(params) => params.data.isSubtotal ? 'font-semibold bg-muted/50' : ''}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Card */}
        {data && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {t('reports.netIncome') ?? 'Net Income'}
                </div>
                <div className={cn(
                  'text-xl font-bold',
                  data.netIncome >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500',
                )}>
                  {format(data.netIncome)}
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {data.revenue.length} {t('reports.revenueAccounts') ?? 'revenue accounts'} · {data.expenses.length} {t('reports.expenseAccounts') ?? 'expense accounts'}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
