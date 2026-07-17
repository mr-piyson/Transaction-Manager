'use client';

import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import {
  BookOpen,
  ChevronLeft,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { Header } from '@/components/layout/App-Header';
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

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const { data: accounts, isLoading: accountsLoading } = trpc.settings.chartOfAccounts.list.useQuery();

  const queryParams = useMemo(() => ({
    accountId: selectedAccountId,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
  }), [selectedAccountId, dateFrom, dateTo]);

  const { data, isLoading } = trpc.reports.generalLedger.useQuery(queryParams, {
    enabled: !!selectedAccountId,
  });

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'date',
        headerName: t('common.date') ?? 'Date',
        width: 120,
        valueFormatter: (p) => p.value ? formatShortDate(p.value) : '—',
      },
      {
        field: 'entryNumber',
        headerName: t('common.entryNumber') ?? 'Entry #',
        width: 130,
        cellRenderer: (p: any) => (
          <span className="font-mono text-xs font-medium">{p.value}</span>
        ),
      },
      {
        field: 'description',
        headerName: t('common.description') ?? 'Description',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'reference',
        headerName: t('common.reference') ?? 'Reference',
        width: 120,
        cellRenderer: (p: any) => (
          <span className="text-xs text-muted-foreground">{p.value || '—'}</span>
        ),
      },
      {
        field: 'debit',
        headerName: t('reports.totalDebit') ?? 'Debit',
        width: 130,
        type: 'rightAligned',
        valueFormatter: (p) => p.value > 0 ? format(p.value) : '-',
        cellClass: 'font-mono text-[11px] tabular-nums',
      },
      {
        field: 'credit',
        headerName: t('reports.totalCredit') ?? 'Credit',
        width: 130,
        type: 'rightAligned',
        valueFormatter: (p) => p.value > 0 ? format(p.value) : '-',
        cellClass: 'font-mono text-[11px] tabular-nums',
      },
      {
        field: 'balance',
        headerName: t('reports.balance') ?? 'Balance',
        width: 140,
        type: 'rightAligned',
        valueFormatter: (p) => format(Math.abs(p.value)),
        cellClass: (p) => cn(
          'font-mono text-[11px] tabular-nums font-bold',
          p.value >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500',
        ),
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

  const accountOptions = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((a) => a.allowDirectPosting !== false).map((a) => ({
      id: a.id,
      label: `${a.code} - ${a.name}`,
      type: a.type,
    }));
  }, [accounts]);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12">
      <Header
        title={t('reports.generalLedger') ?? 'General Ledger'}
        icon={<BookOpen className="size-5" />}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/erp/reports')}
            className="gap-1"
          >
            <ChevronLeft className="size-4" />
            {t('common.back') ?? 'Back'}
          </Button>
        }
      />

      <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-360 mx-auto w-full">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Account Selector */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-[250px]">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('common.account') ?? 'Account'}
                </label>
                {accountsLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">{t('reports.selectAccount') ?? 'Select an account...'}</option>
                    {accountOptions.map((a) => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Date Range */}
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

        {/* Account Info */}
        {data?.account && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{data.account.code}</span>
                    <span className="font-semibold">{data.account.name}</span>
                    <Badge variant="outline" className="text-[10px]">{data.account.type}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('reports.normalBalance') ?? 'Normal Balance'}: {data.account.normalBalance}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">{t('reports.closingBalance') ?? 'Closing Balance'}</div>
                  <div className={cn(
                    'text-lg font-bold',
                    data.closingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500',
                  )}>
                    {format(Math.abs(data.closingBalance))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                {t('reports.generalLedger') ?? 'General Ledger'}
              </CardTitle>
              <CardDescription>
                {data?.transactions.length ?? 0} {t('reports.transactions') ?? 'transactions'}
                {(dateFrom || dateTo) && ` · ${dateFrom || '...'} to ${dateTo || '...'}`}
              </CardDescription>
            </div>
            {gridApiRef.current && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={() => gridApiRef.current?.exportDataAsCsv({ fileName: `general-ledger-${data?.account?.code ?? 'all'}` })}
              >
                {t('common.export') ?? 'Export'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {!selectedAccountId ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <BookOpen className="size-8 mb-2 opacity-30" />
                <p className="text-sm">{t('reports.selectAccountToView') ?? 'Select an account to view its ledger'}</p>
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
                <p className="text-sm">{t('reports.noTransactions') ?? 'No transactions found for this account'}</p>
              </div>
            ) : (
              <div className="h-[500px] w-full">
                <AgGridReact
                  rowData={data?.transactions ?? []}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  theme={theme}
                  animateRows
                  onGridReady={(params) => {
                    gridApiRef.current = params.api;
                  }}
                  domLayout="normal"
                  getRowId={(params, i) => `${params.data.entryNumber}-${i}`}
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
                <span className="text-muted-foreground">{t('reports.closingBalance') ?? 'Closing Balance'}</span>
                <span className={cn(
                  'font-mono font-bold',
                  data.closingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500',
                )}>
                  {format(Math.abs(data.closingBalance))}
                </span>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
