'use client';

import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import {
  AlertCircle,
  CheckCircle2,
  Landmark,
  Scale,
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

export default function BalanceSheetPage() {
  const t = useTranslations();
  const { format } = useCurrency();
  const theme = useTableTheme();
  const gridApiRef = useRef<GridApi | null>(null);

  const [asOfDate, setAsOfDate] = useState<string>('');

  const queryParams = useMemo(() => ({
    asOf: asOfDate ? new Date(asOfDate) : undefined,
  }), [asOfDate]);

  const { data, isLoading } = trpc.reports.balanceSheet.useQuery(queryParams);

  const rowData = useMemo(() => {
    if (!data) return [];

    const rows: any[] = [];

    // Assets section
    if (data.assets.length > 0) {
      rows.push({
        id: 'section-assets',
        section: 'Assets',
        code: '',
        name: 'ASSETS',
        amount: null,
        isSection: true,
      });
      data.assets.forEach((account) => {
        rows.push({
          id: `asset-${account.code}`,
          section: 'Assets',
          code: account.code,
          name: account.name,
          amount: account.balance,
          isSection: false,
        });
      });
      rows.push({
        id: 'total-assets',
        section: 'Assets',
        code: '',
        name: 'Total Assets',
        amount: data.totalAssets,
        isTotal: true,
      });
    }

    // Liabilities section
    if (data.liabilities.length > 0) {
      rows.push({
        id: 'section-liabilities',
        section: 'Liabilities',
        code: '',
        name: 'LIABILITIES',
        amount: null,
        isSection: true,
      });
      data.liabilities.forEach((account) => {
        rows.push({
          id: `liability-${account.code}`,
          section: 'Liabilities',
          code: account.code,
          name: account.name,
          amount: account.balance,
          isSection: false,
        });
      });
      rows.push({
        id: 'total-liabilities',
        section: 'Liabilities',
        code: '',
        name: 'Total Liabilities',
        amount: data.totalLiabilities,
        isTotal: true,
      });
    }

    // Equity section
    if (data.equity.length > 0) {
      rows.push({
        id: 'section-equity',
        section: 'Equity',
        code: '',
        name: 'EQUITY',
        amount: null,
        isSection: true,
      });
      data.equity.forEach((account) => {
        rows.push({
          id: `equity-${account.code}`,
          section: 'Equity',
          code: account.code,
          name: account.name,
          amount: account.balance,
          isSection: false,
        });
      });
      rows.push({
        id: 'total-equity',
        section: 'Equity',
        code: '',
        name: 'Total Equity',
        amount: data.totalEquity,
        isTotal: true,
      });
    }

    // Grand total
    rows.push({
      id: 'grand-total',
      section: 'Summary',
      code: '',
      name: 'Total Liabilities & Equity',
      amount: data.totalLiabilities + data.totalEquity,
      isGrandTotal: true,
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
        cellClass: (p) => cn(
          p.data?.isSection && 'font-bold uppercase text-xs tracking-wider',
          (p.data?.isTotal || p.data?.isGrandTotal) && 'font-bold',
        ),
      },
      {
        field: 'amount',
        headerName: t('common.amount') ?? 'Amount',
        width: 150,
        type: 'rightAligned',
        valueFormatter: (p) => p.value != null ? format(p.value) : '',
        cellClass: (p) => cn(
          'font-mono text-[11px] tabular-nums',
          p.data?.isTotal && 'font-bold border-t border-border',
          p.data?.isGrandTotal && 'font-bold border-t-2 border-primary',
          !p.data?.isSection && !p.data?.isTotal && !p.data?.isGrandTotal && 'text-emerald-600 dark:text-emerald-500',
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
        title={t('reports.balanceSheet') ?? 'Balance Sheet'}
        icon={<Landmark className="size-5" />}
      />

      <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-360 mx-auto w-full">
        {/* Date Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('reports.asOf') ?? 'As of'}
                </label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAsOfDate('')}
              >
                {t('common.clear') ?? 'Clear'}
              </Button>
              <div className="text-xs text-muted-foreground">
                {t('reports.balanceSheetDescription') ?? 'Shows account balances as of the selected date'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance Indicator */}
        {data && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {data.isBalanced ? (
                    <>
                      <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-500">
                        {t('reports.balanced') ?? 'Balance Sheet is balanced'}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="size-5 text-red-600 dark:text-red-500" />
                      <span className="text-sm font-medium text-red-600 dark:text-red-500">
                        {t('reports.unbalanced') ?? 'Balance Sheet is NOT balanced'}
                      </span>
                    </>
                  )}
                </div>
                <Badge variant={data.isBalanced ? 'default' : 'destructive'}>
                  {data.isBalanced ? '✓' : '✗'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            title={t('reports.totalAssets') ?? 'Total Assets'}
            value={data ? format(data.totalAssets) : '-'}
            icon={<Scale className="size-4" />}
            variant="success"
            loading={isLoading}
          />
          <KpiCard
            title={t('reports.totalLiabilities') ?? 'Total Liabilities'}
            value={data ? format(data.totalLiabilities) : '-'}
            icon={<Landmark className="size-4" />}
            variant="danger"
            loading={isLoading}
          />
          <KpiCard
            title={t('reports.totalEquity') ?? 'Total Equity'}
            value={data ? format(data.totalEquity) : '-'}
            icon={<Scale className="size-4" />}
            variant="default"
            loading={isLoading}
          />
        </div>

        {/* Statement Table */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="size-4 text-primary" />
                {t('reports.balanceSheet') ?? 'Balance Sheet'}
              </CardTitle>
              <CardDescription>
                {asOfDate ? `${t('reports.asOf') ?? 'As of'} ${asOfDate}` : t('reports.currentDate') ?? 'As of today'}
              </CardDescription>
            </div>
            {gridApiRef.current && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={() => gridApiRef.current?.exportDataAsCsv({ fileName: 'balance-sheet' })}
              >
                {t('common.export') ?? 'Export'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
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
                  getRowClass={(params) => {
                    if (params.data.isGrandTotal) return 'font-bold bg-primary/5';
                    if (params.data.isTotal) return 'font-semibold bg-muted/30';
                    if (params.data.isSection) return 'font-bold bg-muted/20';
                    return '';
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accounting Equation */}
        {data && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">
                  {t('reports.accountingEquation') ?? 'Accounting Equation'}
                </div>
                <div className="flex items-center justify-center gap-4 text-lg font-semibold">
                  <span className="text-emerald-600 dark:text-emerald-500">
                    {format(data.totalAssets)}
                  </span>
                  <span className="text-muted-foreground">=</span>
                  <span className="text-red-600 dark:text-red-500">
                    {format(data.totalLiabilities)}
                  </span>
                  <span className="text-muted-foreground">+</span>
                  <span className="text-primary">
                    {format(data.totalEquity)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
