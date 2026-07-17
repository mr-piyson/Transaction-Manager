'use client';

import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { AlertCircle, CheckCircle2, Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import { ReportKpiCard, ReportAsOfFilter, ReportLayout, ReportCsvExportButton } from '@/components/reports';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/use-currency';
import { useTableTheme } from '@/hooks/use-table-theme';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function TrialBalancePage() {
  const t = useTranslations();
  const { format } = useCurrency();
  const theme = useTableTheme();
  const gridApiRef = useRef<GridApi | null>(null);

  const [asOfDate, setAsOfDate] = useState('');

  const queryParams = useMemo(() => ({
    asOf: asOfDate ? new Date(asOfDate) : undefined,
  }), [asOfDate]);

  const { data, isLoading } = trpc.reports.trialBalance.useQuery(queryParams);

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
      },
      {
        field: 'type',
        headerName: t('common.type'),
        width: 120,
        cellRenderer: (p: any) => (
          <Badge variant="outline" className="text-[10px] h-5 mt-1.5">{p.value}</Badge>
        ),
      },
      {
        field: 'normalBalance',
        headerName: t('reports.normalBalance'),
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
        headerName: t('reports.totalDebit'),
        width: 130,
        type: 'rightAligned',
        valueFormatter: (p) => (p.value > 0 ? format(p.value) : '-'),
        cellClass: 'font-mono text-[11px] tabular-nums',
      },
      {
        field: 'totalCredit',
        headerName: t('reports.totalCredit'),
        width: 130,
        type: 'rightAligned',
        valueFormatter: (p) => (p.value > 0 ? format(p.value) : '-'),
        cellClass: 'font-mono text-[11px] tabular-nums',
      },
      {
        field: 'balance',
        headerName: t('reports.balance'),
        width: 130,
        type: 'rightAligned',
        valueFormatter: (p) => format(Math.abs(p.value)),
        cellClass: (p) =>
          cn(
            'font-mono text-[11px] tabular-nums font-bold',
            p.value >= 0
              ? 'text-emerald-600 dark:text-emerald-500'
              : 'text-red-600 dark:text-red-500',
          ),
      },
    ],
    [format, t],
  );

  const defaultColDef = useMemo(() => ({ resizable: true, sortable: true, filter: true }), []);

  return (
    <ReportLayout title={t('reports.trialBalance')} icon={<Scale className="size-5" />}>
      <ReportAsOfFilter
        asOfDate={asOfDate}
        onDateChange={setAsOfDate}
        onClear={() => setAsOfDate('')}
        description={t('reports.trialBalanceDescription')}
      />

      {data && (
        <Card className="print:shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {data.isBalanced ? (
                  <>
                    <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-500">
                      {t('reports.trialBalanced')}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-5 text-red-600 dark:text-red-500" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-500">
                      {t('reports.trialUnbalanced')}
                    </span>
                  </>
                )}
              </div>
              <Badge variant={data.isBalanced ? 'default' : 'destructive'}>
                {data.isBalanced ? '\u2713 Balanced' : '\u2717 Unbalanced'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ReportKpiCard
          title={t('reports.totalDebit')}
          value={data ? format(data.totalDebit) : '-'}
          icon={<Scale className="size-4" />}
          variant="default"
          loading={isLoading}
        />
        <ReportKpiCard
          title={t('reports.totalCredit')}
          value={data ? format(data.totalCredit) : '-'}
          icon={<Scale className="size-4" />}
          variant="default"
          loading={isLoading}
        />
        <ReportKpiCard
          title={t('reports.difference')}
          value={data ? format(Math.abs(data.totalDebit - data.totalCredit)) : '-'}
          icon={<Scale className="size-4" />}
          variant={data && data.isBalanced ? 'success' : 'danger'}
          loading={isLoading}
        />
      </div>

      <Card className="print:shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="size-4 text-primary" />
              {t('reports.trialBalance')}
            </CardTitle>
            <CardDescription>
              {asOfDate
                ? `${t('reports.asOf')} ${asOfDate}`
                : t('reports.currentDate')}{' '}
              · {(data?.accounts.length ?? 0)} {t('reports.accounts')}
            </CardDescription>
          </div>
          <ReportCsvExportButton gridApiRef={gridApiRef} filename="trial-balance" />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (data?.accounts.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Scale className="size-8 mb-2 opacity-30" />
              <p className="text-sm">{t('reports.noData')}</p>
            </div>
          ) : (
            <div className="h-[500px] w-full">
              <AgGridReact
                rowData={data?.accounts ?? []}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                theme={theme}
                animateRows
                onGridReady={(params) => { gridApiRef.current = params.api; }}
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
              <span className="text-muted-foreground">{t('reports.totalDebit')}</span>
              <span className="font-mono font-semibold">{format(data.totalDebit)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">{t('reports.totalCredit')}</span>
              <span className="font-mono font-semibold">{format(data.totalCredit)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t">
              <span className="font-medium">{t('reports.difference')}</span>
              <span
                className={cn(
                  'font-mono font-bold',
                  data.isBalanced
                    ? 'text-emerald-600 dark:text-emerald-500'
                    : 'text-red-600 dark:text-red-500',
                )}
              >
                {format(Math.abs(data.totalDebit - data.totalCredit))}
              </span>
            </div>
          </div>
        )}
      </Card>
    </ReportLayout>
  );
}
