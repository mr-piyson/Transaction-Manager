'use client';

import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { AlertCircle, CheckCircle2, Landmark, Scale } from 'lucide-react';
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

export default function BalanceSheetPage() {
  const t = useTranslations();
  const { format } = useCurrency();
  const theme = useTableTheme();
  const gridApiRef = useRef<GridApi | null>(null);

  const [asOfDate, setAsOfDate] = useState('');

  const queryParams = useMemo(() => ({
    asOf: asOfDate ? new Date(asOfDate) : undefined,
  }), [asOfDate]);

  const { data, isLoading } = trpc.reports.balanceSheet.useQuery(queryParams);

  const rowData = useMemo(() => {
    if (!data) return [];
    const rows: any[] = [];

    if (data.assets.length > 0) {
      rows.push({
        id: 'section-assets',
        section: 'assets',
        code: '',
        name: t('reports.totalAssets'),
        amount: null,
        isSection: true,
      });
      data.assets.forEach((account) => {
        rows.push({
          id: `asset-${account.code}`,
          section: 'assets',
          code: account.code,
          name: account.name,
          amount: account.balance,
          isSection: false,
        });
      });
      rows.push({
        id: 'total-assets',
        section: 'assets',
        code: '',
        name: t('reports.totalAssets'),
        amount: data.totalAssets,
        isTotal: true,
      });
    }

    if (data.liabilities.length > 0) {
      rows.push({
        id: 'section-liabilities',
        section: 'liabilities',
        code: '',
        name: t('reports.totalLiabilities'),
        amount: null,
        isSection: true,
      });
      data.liabilities.forEach((account) => {
        rows.push({
          id: `liability-${account.code}`,
          section: 'liabilities',
          code: account.code,
          name: account.name,
          amount: account.balance,
          isSection: false,
        });
      });
      rows.push({
        id: 'total-liabilities',
        section: 'liabilities',
        code: '',
        name: t('reports.totalLiabilities'),
        amount: data.totalLiabilities,
        isTotal: true,
      });
    }

    if (data.equity.length > 0) {
      rows.push({
        id: 'section-equity',
        section: 'equity',
        code: '',
        name: t('reports.totalEquity'),
        amount: null,
        isSection: true,
      });
      data.equity.forEach((account) => {
        rows.push({
          id: `equity-${account.code}`,
          section: 'equity',
          code: account.code,
          name: account.name,
          amount: account.balance,
          isSection: false,
        });
      });
      rows.push({
        id: 'total-equity',
        section: 'equity',
        code: '',
        name: t('reports.totalEquity'),
        amount: data.totalEquity,
        isTotal: true,
      });
    }

    rows.push({
      id: 'grand-total',
      section: 'summary',
      code: '',
      name: `${t('reports.totalLiabilities')} + ${t('reports.totalEquity')}`,
      amount: data.totalLiabilities + data.totalEquity,
      isGrandTotal: true,
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
        cellClass: (p) => cn(
          p.data?.isSection && 'font-bold uppercase text-xs tracking-wider',
          (p.data?.isTotal || p.data?.isGrandTotal) && 'font-bold',
        ),
      },
      {
        field: 'amount',
        headerName: t('common.amount'),
        width: 150,
        type: 'rightAligned',
        valueFormatter: (p) => (p.value != null ? format(p.value) : ''),
        cellClass: (p) =>
          cn(
            'font-mono text-[11px] tabular-nums',
            p.data?.isTotal && 'font-bold border-t border-border',
            p.data?.isGrandTotal && 'font-bold border-t-2 border-primary',
            !p.data?.isSection && !p.data?.isTotal && !p.data?.isGrandTotal && 'text-emerald-600 dark:text-emerald-500',
          ),
      },
    ],
    [format, t],
  );

  const defaultColDef = useMemo(() => ({ resizable: true, sortable: true, filter: true }), []);

  return (
    <ReportLayout title={t('reports.balanceSheet')} icon={<Landmark className="size-5" />}>
      <ReportAsOfFilter
        asOfDate={asOfDate}
        onDateChange={setAsOfDate}
        onClear={() => setAsOfDate('')}
        description={t('reports.balanceSheetDescription')}
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
                      {t('reports.balanced')}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-5 text-red-600 dark:text-red-500" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-500">
                      {t('reports.unbalanced')}
                    </span>
                  </>
                )}
              </div>
              <Badge variant={data.isBalanced ? 'default' : 'destructive'}>
                {data.isBalanced ? '\u2713' : '\u2717'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ReportKpiCard
          title={t('reports.totalAssets')}
          value={data ? format(data.totalAssets) : '-'}
          icon={<Scale className="size-4" />}
          variant="success"
          loading={isLoading}
        />
        <ReportKpiCard
          title={t('reports.totalLiabilities')}
          value={data ? format(data.totalLiabilities) : '-'}
          icon={<Landmark className="size-4" />}
          variant="danger"
          loading={isLoading}
        />
        <ReportKpiCard
          title={t('reports.totalEquity')}
          value={data ? format(data.totalEquity) : '-'}
          icon={<Scale className="size-4" />}
          variant="default"
          loading={isLoading}
        />
      </div>

      <Card className="print:shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="size-4 text-primary" />
              {t('reports.balanceSheet')}
            </CardTitle>
            <CardDescription>
              {asOfDate
                ? `${t('reports.asOf')} ${asOfDate}`
                : t('reports.currentDate')}
            </CardDescription>
          </div>
          <ReportCsvExportButton gridApiRef={gridApiRef} filename="balance-sheet" />
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rowData.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Landmark className="size-8 mb-2 opacity-30" />
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

      {data && (
        <Card className="print:shadow-none">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">
                {t('reports.accountingEquation')}
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
                <span className="text-primary">{format(data.totalEquity)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </ReportLayout>
  );
}
