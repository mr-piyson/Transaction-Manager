'use client';

import { useTranslations } from 'next-intl';
import { useDateFormat } from '@/hooks/use-date-format';
import {
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueryState, parseAsString } from 'nuqs';
import { toast } from 'sonner';
import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi, type FilterModel } from 'ag-grid-community';
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
import { Header } from '@/components/layout/App-Header';
import { InvoiceListItem } from '@/components/invoices/invoice-list-item';
import { useInvoiceForm } from '@/components/dialogs';
import { DocumentFilterBar } from '@/components/erp/document-filter-bar';

ModuleRegistry.registerModules([AllCommunityModule]);

const DOCUMENT_CONFIG: Record<string, { icon: typeof Receipt; trpcType: 'INVOICE' | 'QUOTE' }> = {
  invoices: { icon: Receipt, trpcType: 'INVOICE' },
  quotations: { icon: FileText, trpcType: 'QUOTE' },
};

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  DRAFT: { bg: 'bg-zinc-100 dark:bg-zinc-900/40', fg: 'text-zinc-700 dark:text-zinc-300' },
  SENT: { bg: 'bg-blue-100 dark:bg-blue-900/40', fg: 'text-blue-700 dark:text-blue-300' },
  APPROVED: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    fg: 'text-emerald-700 dark:text-emerald-300',
  },
  PARTIAL: {
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    fg: 'text-amber-700 dark:text-amber-300',
  },
  PAID: { bg: 'bg-green-100 dark:bg-green-900/40', fg: 'text-green-700 dark:text-green-300' },
  OVERDUE: { bg: 'bg-red-100 dark:bg-red-900/40', fg: 'text-red-700 dark:text-red-300' },
  CANCELLED: { bg: 'bg-red-100 dark:bg-red-900/40', fg: 'text-red-700 dark:text-red-300' },
};

export default function DocumentsLayout({ children }: { children?: React.ReactNode }) {
  const t = useTranslations();
  const params = useParams<{ type: string }>();
  const type = params.type;
  const config = DOCUMENT_CONFIG[type] ?? DOCUMENT_CONFIG.invoices;
  const tableTheme = useTableTheme();
  const { openCreate } = useInvoiceForm();
  const { formatDate } = useDateFormat();

  const [statusFilter] = useQueryState('status', parseAsString.withDefault(''));
  const [paymentStatusFilter] = useQueryState('paymentStatus', parseAsString.withDefault('all'));
  const [viewMode] = useQueryState('view', parseAsString.withDefault('list'));

  const showPaymentFilter = type === 'invoices';

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: t('invoices.draft'),
    SENT: t('invoices.sent'),
    APPROVED: t('invoices.approved'),
    PARTIAL: t('invoices.partial'),
    PAID: t('invoices.paid'),
    OVERDUE: t('invoices.overdue'),
    CANCELLED: t('invoices.cancelled'),
  };

  const { data, isPending } = trpc.invoices.list.useQuery({
    type: config.trpcType,
    status: (statusFilter || undefined) as any,
    paymentStatus:
      paymentStatusFilter === 'all' ? undefined : (paymentStatusFilter as any),
  });
  const router = useRouter();
  const pathname = usePathname();
  const segments = pathname.split('/');
  const activeItem = segments[4];
  const isListRoute = segments.length === 4;
  const isPrintRoute = pathname.endsWith('/print');

  const utils = trpc.useUtils();
  const deleteMutation = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      toast.success(t('invoices.invoiceDeleted'));
      if (activeItem) router.push(`/erp/documents/${type}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const documents = Array.isArray(data) ? data : (data?.data ?? []);

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
              href={`/erp/documents/${type}/${item.id}`}
              scroll={false}
              draggable={false}
              className="block w-full h-full"
            >
              <InvoiceListItem
                data={item}
                className={cn(
                  'hover:bg-muted/40 border border-transparent rounded-lg',
                  activeItem === item.id ? 'border-primary bg-primary/10' : '',
                )}
              />
            </Link>
          );
        },
      },
    ],
    [activeItem, type],
  );

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
          return formatDate(params.value);
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
                  onClick={() => router.push(`/erp/documents/${type}/${item.id}`)}
                >
                  <Eye className="size-4 mr-2" />
                  {t('common.viewDetails')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/erp/documents/${type}/${item.id}`)}
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
    [router, activeItem, t, deleteMutation, type],
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

  const Icon = config.icon;
  const headerTitle = type === 'invoices' ? t('layout.invoices') : t('layout.quotations');

  // Sync nuqs status filter to ag-grid filter model for table view
  const onFilterChanged = useCallback(() => {
    const api = gridApiRef.current;
    if (!api || viewMode !== 'table') return;
    // When user changes ag-grid filters, we could sync back to nuqs
    // For now, the server-side filter from nuqs takes precedence
  }, [viewMode]);

  if (isPrintRoute) return <>{children}</>;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header title={headerTitle} icon={<Icon className="size-5" />} />
      <div className="flex-1 min-h-0 w-full">
        {isListRoute ? (
          <div className="h-full w-full flex flex-col">
            <DocumentFilterBar
              type={type}
              showPaymentFilter={showPaymentFilter}
              onCreate={() => openCreate({ defaults: { type: config.trpcType } })}
            />
            <AgGridReact
              ref={gridRef}
              rowData={documents}
              columnDefs={columnDefs}
              defaultColDef={viewMode === 'list' ? undefined : defaultColDef}
              theme={tableTheme}
              animateRows
              onGridReady={(params) => {
                gridApiRef.current = params.api;
              }}
              onFilterChanged={onFilterChanged}
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
