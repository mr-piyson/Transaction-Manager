'use client';

import { useTranslations } from 'next-intl';
import { Edit, Eye, FileText, List, MoreHorizontal, Plus, Table2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { alert } from '@/components/Alert-dialog';
import { useTableTheme } from '@/hooks/use-table-theme';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/App-Header';
import { InvoiceListItem } from '@/components/invoices/invoice-list-item';
import { useInvoiceForm } from '@/components/dialogs';

ModuleRegistry.registerModules([AllCommunityModule]);

const title = 'Quotations';

export default function QuotationsLayout({ children }: { children?: React.ReactNode }) {
  const t = useTranslations();
  const tableTheme = useTableTheme();
  const { openCreate } = useInvoiceForm();

  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [statusFilter, setStatusFilter] = useState('');

  const STATUS_FILTERS = [
    { value: '', label: t('common.all') },
    { value: 'DRAFT', label: t('invoices.draft') },
    { value: 'SENT', label: t('invoices.sent') },
    { value: 'APPROVED', label: t('invoices.approved') },
    { value: 'CANCELLED', label: t('invoices.cancelled') },
  ];

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: t('invoices.draft'),
    SENT: t('invoices.sent'),
    APPROVED: t('invoices.approved'),
    CANCELLED: t('invoices.cancelled'),
  };

  const { data, isPending } = trpc.invoices.list.useQuery({
    type: 'QUOTE',
    status: (statusFilter || undefined) as any,
  });
  const router = useRouter();
  const pathname = usePathname();
  const activeItem = pathname.split('/')[3];
  const isListRoute = pathname === `/erp/${title.toLowerCase()}`;

  const utils = trpc.useUtils();
  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      toast.success(t('invoices.invoiceDeleted'));
      if (activeItem) router.push(`/erp/${title.toLowerCase()}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const quotes = Array.isArray(data) ? data : (data?.data ?? []);

  const listColumnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: 'item',
        flex: 1,
        sortable: false,
        filter: false,
        suppressMenu: true,
        cellRenderer: (params: { data: any }) => {
          const item = params.data;
          return (
            <Link
              href={`/erp/${title.toLowerCase()}/${item.id}`}
              scroll={false}
              draggable={false}
              className="block w-full h-full"
            >
              <InvoiceListItem
                data={item}
                className={cn(
                  'hover:bg-muted/40 border border-transparent',
                  activeItem === item.id ? 'border-primary bg-primary/10' : '',
                )}
              />
            </Link>
          );
        },
      },
    ],
    [activeItem],
  );

  const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
    DRAFT: { bg: 'bg-zinc-100 dark:bg-zinc-900/40', fg: 'text-zinc-700 dark:text-zinc-300' },
    SENT: { bg: 'bg-blue-100 dark:bg-blue-900/40', fg: 'text-blue-700 dark:text-blue-300' },
    APPROVED: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/40',
      fg: 'text-emerald-700 dark:text-emerald-300',
    },
    CANCELLED: { bg: 'bg-red-100 dark:bg-red-900/40', fg: 'text-red-700 dark:text-red-300' },
  };

  const tableColumnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: 'Serial',
        field: 'serial',
        width: 160,
        cellClass: 'font-mono text-[11px]',
      },
      {
        headerName: 'Customer',
        field: 'customer.name',
        flex: 1,
        filter: 'agTextColumnFilter',
        cellClass: 'font-medium text-[12px]',
        valueFormatter: (params) => params.data?.customer?.name ?? '—',
      },
      {
        headerName: 'Date',
        field: 'date',
        width: 110,
        filter: 'agDateColumnFilter',
        cellClass: 'text-[12px]',
        valueFormatter: (params) => {
          if (!params.value) return '—';
          return new Date(params.value).toLocaleDateString();
        },
      },
      {
        headerName: 'Total',
        field: 'total',
        width: 120,
        type: 'numericColumn',
        filter: 'agNumberColumnFilter',
        cellClass: 'tabular-nums text-[12px] font-medium',
        valueFormatter: (params) => {
          const val = Number(params.value) || 0;
          return `${val.toFixed(3)} ${params.data?.currency ?? ''}`;
        },
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 120,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: { value: string }) => {
          const style = STATUS_STYLES[params.value];
          return (
            <Badge variant="outline" className={cn('gap-1 font-medium', style?.fg)}>
              {STATUS_LABELS[params.value] ?? params.value}
            </Badge>
          );
        },
      },
      {
        headerName: '',
        field: 'id',
        width: 50,
        sortable: false,
        filter: false,
        suppressMenu: true,
        cellRenderer: (params: { data: any }) => {
          const item = params.data;
          const isDeletable = ['DRAFT', 'CANCELLED', 'DELETED'].includes(item.status);
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => router.push(`/erp/${title.toLowerCase()}/${item.id}`)}
                >
                  <Eye className="size-4 mr-2" />
                  {t('common.viewDetails')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/erp/${title.toLowerCase()}/${item.id}`)}
                >
                  <Edit className="size-4 mr-2" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    alert.delete({
                      title: t('common.confirmDeleteTitle'),
                      description: 'This action cannot be undone.',
                      confirmText: t('common.delete'),
                      onConfirm: async () => {
                        await deleteMutation.mutateAsync({ id: item.id });
                      },
                    })
                  }
                  disabled={!isDeletable}
                >
                  <Trash2 className="size-4 mr-2 text-destructive" />
                  <span className="text-destructive">{t('common.delete')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [router, activeItem, t, deleteMutation],
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 60,
    }),
    [],
  );

  const gridApiRef = useRef<GridApi | null>(null);
  const gridRef = useRef<any>(null);

  const columnDefs = viewMode === 'list' ? listColumnDefs : tableColumnDefs;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header title={t('layout.quotations')} icon={<FileText className="size-5" />} />
      <div className="flex-1 min-h-0 w-full">
        {isListRoute ? (
          <div className="h-full w-full flex flex-col">
            <div className="w-full flex flex-row justify-between border-b px-4 py-2 shrink-0">
              {/* Start Actions */}
              <div className="flex gap-2 items-center">
                <Button size={'sm'} onClick={() => openCreate({ defaults: { type: 'QUOTE' } })}>
                  <Plus className="size-3.5" />
                  <span className="hidden md:block">{t('invoices.newInvoice')}</span>
                </Button>
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                  <TabsList className="h-auto justify-start">
                    {STATUS_FILTERS.map((filter) => (
                      <TabsTrigger
                        key={filter.value}
                        value={filter.value}
                        className="text-xs px-3 py-1"
                      >
                        {filter.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
              {/* End Actions */}
              <div className="flex gap-2 items-center">
                <div className="flex items-center rounded-lg border p-0.5">
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode('list')}
                    title="List view"
                  >
                    <List className="size-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode('table')}
                    title="Table view"
                  >
                    <Table2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            <AgGridReact
              ref={gridRef}
              rowData={quotes}
              columnDefs={columnDefs}
              defaultColDef={viewMode === 'list' ? undefined : defaultColDef}
              theme={tableTheme}
              animateRows
              onGridReady={(params) => {
                gridApiRef.current = params.api;
              }}
              domLayout="normal"
              getRowId={(params) => params.data.id}
              suppressScrollOnNewData
              enableCellTextSelection
              ensureDomOrder
              loading={isPending}
              headerHeight={viewMode === 'list' ? 0 : undefined}
              rowHeight={viewMode === 'list' ? 72 : undefined}
            />
          </div>
        ) : (
          <div className="h-full w-full overflow-y-auto">{children}</div>
        )}
      </div>
    </div>
  );
}
