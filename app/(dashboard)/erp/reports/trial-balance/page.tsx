'use client';

import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import {
  AlertCircle,
  CheckCircle2,
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

export default function TrialBalancePage() {
  const t = useTranslations();
  const { format } = useCurrency();
  const theme = useTableTheme();
  const gridApiRef = useRef<GridApi | null>(null);

  const [asOfDate, setAsOfDate] = useState<string>('');

  const queryParams = useMemo(() => ({
    asOf: asOfDate ? new Date(asOfDate) : undefined,
  }), [asOfDate]);

  const { data, isLoading } = trpc.reports.trialBalance.useQuery(queryParams);

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
        field: 'type',
        headerName: t('common.type') ?? 'Type',
        width: 120,
        cellRenderer: (p: any) => (
          <Badge variant="outline" className="text-[10px] h-5 mt-1.5">
            {p.value}
          </Badge>
        ),
      },
      {
        field: 'normalBalance',
        headerName: t('reports.normalBalance') ?? 'Normal',
        width: 100,
        cellRenderer: (p: any) => (
          <span className={cn(
            'text-xs font-medium',
            p.value === 'DEBIT' ? 'text-blue-600 dark:text-blue-500' : 'text-purple-600 dark:text-purple-500',
          )}>
            {p.value}
          </span>
        ),
      },
      {
        field: 'totalDebit',
        headerName: t('reports.totalDebit') ?? 'Debit',
        width: 130,
        type: 'rightAligned',
        valueFormatter: (p) => p.value > 0 ? format(p.value) : '-',
        cellClass: 'font-mono text-[11px] tabular-nums',
      },
      {
        field: 'totalCredit',
        headerName: t('reports.totalCredit') ?? 'Credit',
        width: 130,
        type: 'rightAligned',
        valueFormatter: (p) => p.value > 0 ? format(p.value) : '-',
        cellClass: 'font-mono text-[11px] tabular-nums',
      },
      {
        field: 'balance',
        headerName: t('reports.balance') ?? 'Balance',
        width: 130,
        type: 'rightAligned',
        valueFormatter: (p) => format(Math.abs(p.value)),
        cellClass: (p) => cn(
          'font-mono text-[11px] tabular-nums font-bold',
          p.value >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500',
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
        title={t('reports.trialBalance') ?? 'Trial Balance'}
        icon={<Scale className="size-5" />}
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
                {t('reports.trialBalanceDescription') ?? 'Verifies that total debits equal total credits'}
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
                        {t('reports.trialBalanced') ?? 'Trial Balance is balanced'}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="size-5 text-red-600 dark:text-red-500" />
                      <span className="text-sm font-medium text-red-600 dark:text-red-500">
                        {t('reports.trialUnbalanced') ?? 'Trial Balance is NOT balanced'}
                      </span>
                    </>
                  )}
                </div>
                <Badge variant={data.isBalanced ? 'default' : 'destructive'}>
                  {data.isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            title={t('reports.totalDebit') ?? 'Total Debits'}
            value={data ? format(data.totalDebit) : '-'}
            icon={<Scale className="size-4" />}
            variant="default"
            loading={isLoading}
          />
          <KpiCard
            title={t('reports.totalCredit') ?? 'Total Credits'}
            value={data ? format(data.totalCredit) : '-'}
            icon={<Scale className="size-4" />}
            variant="default"
            loading={isLoading}
          />
          <KpiCard
            title={t('reports.difference') ?? 'Difference'}
            value={data ? format(Math.abs(data.totalDebit - data.totalCredit)) : '-'}
            icon={<Scale className="size-4" />}
            variant={data && data.isBalanced ? 'success' : 'danger'}
            loading={isLoading}
          />
        </div>

        {/* Trial Balance Table */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="size-4 text-primary" />
                {t('reports.trialBalance') ?? 'Trial Balance'}
              </CardTitle>
              <CardDescription>
                {asOfDate ? `${t('reports.asOf') ?? 'As of'} ${asOfDate}` : t('reports.currentDate') ?? 'As of today'} · {data?.accounts.length ?? 0} {t('reports.accounts') ?? 'accounts'}
              </CardDescription>
            </div>
            {gridApiRef.current && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={() => gridApiRef.current?.exportDataAsCsv({ fileName: 'trial-balance' })}
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
                  rowData={data?.accounts ?? []}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  theme={theme}
                  animateRows
                  onGridReady={(params) => {
                    gridApiRef.current = params.api;
                  }}
                  domLayout="normal"
                  getRowId={(params) => params.data.accountId}
                  suppressScrollOnNewData
                  enableCellTextSelection
                  ensureDomOrder
                />
              </div>
            )}
          </CardContent>
          {data && (
            <div className="border-t p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('reports.totalDebit') ?? 'Total Debits'}</span>
                <span className="font-mono font-semibold">{format(data.totalDebit)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">{t('reports.totalCredit') ?? 'Total Credits'}</span>
                <span className="font-mono font-semibold">{format(data.totalCredit)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t">
                <span className="font-medium">{t('reports.difference') ?? 'Difference'}</span>
                <span className={cn(
                  'font-mono font-bold',
                  data.isBalanced ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500',
                )}>
                  {format(Math.abs(data.totalDebit - data.totalCredit))}
                </span>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
