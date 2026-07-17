'use client';

import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import { ReportKpiCard, ReportDateFilter, ReportLayout, ReportCsvExportButton } from '@/components/reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/use-currency';
import { useTableTheme } from '@/hooks/use-table-theme';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function ProfitAndLossPage() {
  const t = useTranslations();
  const { format } = useCurrency();
  const theme = useTableTheme();
  const gridApiRef = useRef<GridApi | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const queryParams = useMemo(
    () => ({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    }),
    [dateFrom, dateTo],
  );

  const { data, isLoading } = trpc.reports.profitAndLoss.useQuery(queryParams);

  const rowData = useMemo(() => {
    if (!data) return [];
    const rows: any[] = [];

    data.revenue.forEach((account) => {
      rows.push({
        id: `rev-${account.code}`,
        section: 'revenue',
        code: account.code,
        name: account.name,
        amount: account.balance,
        isSubtotal: false,
      });
    });

    if (data.revenue.length > 0) {
      rows.push({
        id: 'rev-total',
        section: 'revenue',
        code: '',
        name: t('reports.totalRevenue'),
        amount: data.totalRevenue,
        isSubtotal: true,
      });
    }

    data.expenses.forEach((account) => {
      rows.push({
        id: `exp-${account.code}`,
        section: 'expense',
        code: account.code,
        name: account.name,
        amount: -account.balance,
        isSubtotal: false,
      });
    });

    if (data.expenses.length > 0) {
      rows.push({
        id: 'exp-total',
        section: 'expense',
        code: '',
        name: t('reports.totalExpenses'),
        amount: -data.totalExpenses,
        isSubtotal: true,
      });
    }

    rows.push({
      id: 'net-income',
      section: 'summary',
      code: '',
      name: t('reports.netIncome'),
      amount: data.netIncome,
      isSubtotal: true,
    });

    return rows;
  }, [data, t]);

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'code',
        headerName: t('common.code'),
        width: 100,
        cellClass: 'font-mono text-[11px]',
      },
      {
        field: 'name',
        headerName: t('common.name'),
        flex: 1,
        minWidth: 200,
        cellClass: (p) => cn(p.data?.isSubtotal && 'font-semibold'),
      },
      {
        field: 'amount',
        headerName: t('common.amount'),
        width: 150,
        type: 'rightAligned',
        valueFormatter: (p) => format(Math.abs(p.value)),
        cellClass: (p) =>
          cn(
            'font-mono text-[11px] tabular-nums',
            p.data?.isSubtotal && 'font-bold',
            p.value < 0
              ? 'text-red-600 dark:text-red-500'
              : 'text-emerald-600 dark:text-emerald-500',
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

  const periodLabel = useMemo(() => {
    if (dateFrom && dateTo) return `${dateFrom} → ${dateTo}`;
    if (dateFrom) return `${dateFrom} →`;
    if (dateTo) return `→ ${dateTo}`;
    return t('reports.allTime');
  }, [dateFrom, dateTo, t]);

  return (
    <ReportLayout
      title={t('reports.profitAndLoss')}
      icon={<TrendingUp className="size-5" />}
    >
      <ReportDateFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onClear={() => { setDateFrom(''); setDateTo(''); }}
        description={t('reports.trialBalanceDescription')}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ReportKpiCard
          title={t('reports.totalRevenue')}
          value={data ? format(data.totalRevenue) : '-'}
          icon={<TrendingUp className="size-4" />}
          variant="success"
          loading={isLoading}
        />
        <ReportKpiCard
          title={t('reports.totalExpenses')}
          value={data ? format(data.totalExpenses) : '-'}
          icon={<Wallet className="size-4" />}
          variant="danger"
          loading={isLoading}
        />
        <ReportKpiCard
          title={t('reports.netIncome')}
          value={data ? format(data.netIncome) : '-'}
          icon={<DollarSign className="size-4" />}
          variant={data && data.netIncome >= 0 ? 'success' : 'danger'}
          loading={isLoading}
        />
      </div>

      <Card className="print:shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              {t('reports.profitAndLoss')}
            </CardTitle>
            <CardDescription>{periodLabel}</CardDescription>
          </div>
          <ReportCsvExportButton
            gridApiRef={gridApiRef}
            filename="profit-and-loss"
          />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rowData.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <TrendingUp className="size-8 mb-2 opacity-30" />
              <p className="text-sm">{t('reports.noData')}</p>
            </div>
          ) : (
            <div className="h-[500px] w-full">
              <AgGridReact
                rowData={rowData}
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
                getRowClass={(params) => params.data.isSubtotal ? 'font-semibold bg-muted/50' : ''}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {data && (
        <Card className="print:shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{t('reports.netIncome')}</div>
              <div
                className={cn(
                  'text-xl font-bold',
                  data.netIncome >= 0
                    ? 'text-emerald-600 dark:text-emerald-500'
                    : 'text-red-600 dark:text-red-500',
                )}
              >
                {format(data.netIncome)}
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {data.revenue.length} {t('reports.revenueAccounts')} · {data.expenses.length}{' '}
              {t('reports.expenseAccounts')}
            </div>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
