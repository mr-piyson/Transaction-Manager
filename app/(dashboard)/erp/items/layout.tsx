'use client';

import { useTranslations } from 'next-intl';
import {
  Box,
  Download,
  Edit,
  Eye,
  List,
  MoreHorizontal,
  Package,
  Plus,
  Table2,
  Trash2,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { alert } from '@/components/Alert-dialog';
import { useTableTheme } from '@/hooks/use-table-theme';
import { useCurrency } from '@/hooks/use-currency';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/App-Header';
import { ItemListItem } from '@/components/items/item-list-item';

ModuleRegistry.registerModules([AllCommunityModule]);

const title = 'Items';

export default function ItemsLayout({ children }: { children?: React.ReactNode }) {
  const t = useTranslations();
  const { format } = useCurrency();
  const tableTheme = useTableTheme();

  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');

  const TYPE_FILTERS = [
    { value: '', label: t('common.all') },
    { value: 'PRODUCT', label: t('items.types.PRODUCT') },
    { value: 'SERVICE', label: t('items.types.SERVICE') },
  ];

  const [typeFilter, setTypeFilter] = useState('');
  const { data, isPending } = trpc.items.list.useQuery({
    type: (typeFilter || undefined) as 'PRODUCT' | 'SERVICE' | undefined,
  });
  const router = useRouter();
  const pathname = usePathname();
  const activeItem = pathname.split('/')[3];
  const isListRoute = pathname === `/erp/${title.toLowerCase()}`;

  const utils = trpc.useUtils();
  const deleteMutation = trpc.items.delete.useMutation({
    onSuccess: () => {
      utils.items.list.invalidate();
      toast.success(t('common.itemDeleted'));
      if (activeItem) router.push(`/erp/${title.toLowerCase()}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const items = Array.isArray(data) ? data : (data?.data ?? []);

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
              <ItemListItem
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
    [activeItem],
  );

  const tableColumnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: '',
        field: 'image',
        width: 60,
        sortable: false,
        filter: false,
        suppressMenu: true,
        cellRenderer: (params: { data: any }) => {
          const item = params.data;
          return item.image ? (
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div className="flex items-center justify-center h-full cursor-pointer">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="size-9 rounded object-cover border"
                  />
                </div>
              </HoverCardTrigger>
              <HoverCardContent side="right" className="w-auto p-2">
                <img
                  src={item.image}
                  alt={item.name}
                  className="max-w-56 max-h-56 rounded object-contain"
                />
              </HoverCardContent>
            </HoverCard>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="size-5 text-muted-foreground" />
            </div>
          );
        },
      },
      {
        headerName: 'SKU',
        field: 'sku',
        width: 120,
        cellClass: 'font-mono text-[11px]',
      },
      {
        headerName: 'Name',
        field: 'name',
        flex: 1,
        filter: 'agTextColumnFilter',
        cellClass: 'font-medium text-[12px]',
      },
      {
        headerName: 'Type',
        field: 'type',
        width: 110,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: { value: string }) => {
          const TYPE_STYLES: Record<string, { icon: typeof Package; bg: string; fg: string }> = {
            PRODUCT: {
              icon: Box,
              bg: 'bg-sky-100 dark:bg-sky-900/40',
              fg: 'text-sky-700 dark:text-sky-300',
            },
            SERVICE: {
              icon: Wrench,
              bg: 'bg-orange-100 dark:bg-orange-900/40',
              fg: 'text-orange-700 dark:text-orange-300',
            },
          };
          const { bg, fg, icon: Icon } = TYPE_STYLES[params.value] ?? TYPE_STYLES.PRODUCT;

          return (
            <Badge variant="outline" className={cn('gap-1 font-medium', fg)}>
              <Icon className={cn('size-4')} />
              {params.value}
            </Badge>
          );
        },
      },
      {
        headerName: 'Unit',
        field: 'unit',
        width: 70,
      },
      {
        headerName: 'Buy Price',
        field: 'purchasePrice',
        width: 100,
        type: 'numericColumn',
        filter: 'agNumberColumnFilter',
        cellClass: 'tabular-nums text-[12px]',
        valueFormatter: (params) => format(params.value),
      },
      {
        headerName: 'Sell Price',
        field: 'salesPrice',
        width: 100,
        type: 'numericColumn',
        filter: 'agNumberColumnFilter',
        cellClass: 'tabular-nums text-[12px] font-medium',
        valueFormatter: (params) => format(params.value),
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
    [format, router, activeItem, t, deleteMutation],
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
      <Header title={t('layout.items')} icon={<Package className="size-5" />} />
      <div className="flex-1 min-h-0 w-full">
        {isListRoute ? (
          <div className="h-full w-full flex flex-col">
            <div className="w-full flex flex-row justify-between border-b px-4 py-2 shrink-0">
              {/* Start Actions */}
              <div className="flex gap-2 items-center">
                <Button size={'sm'} onClick={() => router.push('/erp/items/new')}>
                  <Plus className="size-3.5" />
                  <span className="hidden md:block">{t('items.createItem')}</span>
                </Button>
                <Tabs value={typeFilter} onValueChange={setTypeFilter}>
                  <TabsList className="h-auto  justify-start">
                    {TYPE_FILTERS.map((filter) => (
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
              <div className="flex gap-2 items-center ">
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
                <Link href="/settings/item-master">
                  <Button variant="outline" size="sm">
                    <Download className="size-3.5" />
                    <span className="hidden md:block">Import</span>
                  </Button>
                </Link>
              </div>
            </div>
            <AgGridReact
              ref={gridRef}
              rowData={items}
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
