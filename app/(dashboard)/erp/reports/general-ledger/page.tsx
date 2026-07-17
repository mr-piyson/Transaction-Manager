'use client';

import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { ReportLayout, ReportCsvExportButton } from '@/components/reports';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/use-currency';
import { useDateFormat } from '@/hooks/use-date-format';
import { useTableTheme } from '@/hooks/use-table-theme';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function GeneralLedgerPage() {
  const t = useTranslations();
  const router = useRouter();
  const { format } = useCurrency();
  const { formatShortDate } = useDateFormat();
  const theme = useTableTheme();
  const gridApiRef = useRef<GridApi | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: accounts, isLoading: accountsLoading } = trpc.settings.chartOfAccounts.list.useQuery();

  const queryParams = useMemo(
    () => ({
      accountId: selectedAccountId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    }),
    [selectedAccountId, dateFrom, dateTo],
  );

  const { data, isLoading } = trpc.reports.generalLedger.useQuery(queryParams, {
    enabled: !!selectedAccountId,
  });

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'date',
        headerName: t('common.date'),
        width: 120,
        valueFormatter: (p) => (p.value ? formatShortDate(p.value) : '\u2014'),
      },
      {
        field: 'entryNumber',
        headerName: t('common.entryNumber'),
        width: 130,
        cellRenderer: (p: any) => (
          <span className="font-mono text-xs font-medium">{p.value}</span>
        ),
      },
      {
        field: 'description',
        headerName: t('common.description'),
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'reference',
        headerName: t('common.reference'),
        width: 120,
        cellRenderer: (p: any) => (
          <span className="text-xs text-muted-foreground">{p.value || '\u2014'}</span>
        ),
      },
      {
        field: 'debit',
        headerName: t('reports.totalDebit'),
        width: 130,
        type: 'rightAligned',
        valueFormatter: (p) => (p.value > 0 ? format(p.value) : '-'),
        cellClass: 'font-mono text-[11px] tabular-nums',
      },
      {
        field: 'credit',
        headerName: t('reports.totalCredit'),
        width: 130,
        type: 'rightAligned',
        valueFormatter: (p) => (p.value > 0 ? format(p.value) : '-'),
        cellClass: 'font-mono text-[11px] tabular-nums',
      },
      {
        field: 'balance',
        headerName: t('reports.balance'),
        width: 140,
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
    [format, formatShortDate, t],
  );

  const defaultColDef = useMemo(() => ({ resizable: true, sortable: true, filter: true }), []);

  const accountOptions = useMemo(() => {
    if (!accounts) return [];
    return accounts
      .filter((a) => a.allowDirectPosting !== false)
      .map((a) => ({
        id: a.id,
        label: `${a.code} - ${a.name}`,
        type: a.type,
      }));
  }, [accounts]);

  const periodLabel = useMemo(() => {
    if (dateFrom && dateTo) return `${dateFrom} \u2192 ${dateTo}`;
    if (dateFrom) return `${dateFrom} \u2192`;
    if (dateTo) return `\u2192 ${dateTo}`;
    return '';
  }, [dateFrom, dateTo]);

  return (
    <ReportLayout
      title={t('reports.generalLedger')}
      icon={<BookOpen className="size-5" />}
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/erp/reports')}
          className="gap-1 print:hidden"
        >
          <ChevronLeft className="size-4" />
          {t('common.back')}
        </Button>
      }
    >
      <Card className="print:shadow-none">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[250px]">
              <label className="text-xs font-medium text-muted-foreground">
                {t('common.account')}
              </label>
              {accountsLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t('reports.selectAccount')}</option>
                  {accountOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('common.from')}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('common.to')}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setDateFrom(''); setDateTo(''); }}
              >
                {t('common.clear')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {data?.account && (
        <Card className="print:shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">{data.account.code}</span>
                  <span className="font-semibold">{data.account.name}</span>
                  <Badge variant="outline" className="text-[10px]">{data.account.type}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('reports.normalBalance')}: {data.account.normalBalance}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">{t('reports.closingBalance')}</div>
                <div
                  className={cn(
                    'text-lg font-bold',
                    data.closingBalance >= 0
                      ? 'text-emerald-600 dark:text-emerald-500'
                      : 'text-red-600 dark:text-red-500',
                  )}
                >
                  {format(Math.abs(data.closingBalance))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="print:shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              {t('reports.generalLedger')}
            </CardTitle>
            <CardDescription>
              {data?.transactions.length ?? 0} {t('reports.transactions')}
              {periodLabel && ` \u00B7 ${periodLabel}`}
            </CardDescription>
          </div>
          {selectedAccountId && (
            <ReportCsvExportButton
              gridApiRef={gridApiRef}
              filename={`general-ledger-${data?.account?.code ?? 'all'}`}
            />
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!selectedAccountId ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <BookOpen className="size-8 mb-2 opacity-30" />
              <p className="text-sm">{t('reports.selectAccountToView')}</p>
            </div>
          ) : isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data?.transactions.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <BookOpen className="size-8 mb-2 opacity-30" />
              <p className="text-sm">{t('reports.noTransactions')}</p>
            </div>
          ) : (
            <div className="h-[500px] w-full">
              <AgGridReact
                rowData={data?.transactions ?? []}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                theme={theme}
                animateRows
                onGridReady={(params) => { gridApiRef.current = params.api; }}
                domLayout="normal"
                getRowId={(params) => `${params.data.entryNumber}-${params.data.id}`}
                suppressScrollOnNewData
                enableCellTextSelection
                ensureDomOrder
              />
            </div>
          )}
        </CardContent>
        {data && data.transactions.length > 0 && (
          <div className="border-t p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('reports.closingBalance')}</span>
              <span
                className={cn(
                  'font-mono font-bold',
                  data.closingBalance >= 0
                    ? 'text-emerald-600 dark:text-emerald-500'
                    : 'text-red-600 dark:text-red-500',
                )}
              >
                {format(Math.abs(data.closingBalance))}
              </span>
            </div>
          </div>
        )}
      </Card>
    </ReportLayout>
  );
}
