'use client';

import { AllCommunityModule, ModuleRegistry, type ColDef, type GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import {
  Box,
  Columns3,
  Download,
  Eye,
  Layers,
  Maximize2,
  Minimize2,
  Package,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Tag,
  Truck,
  Weight,
  X,
  XCircle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/App-Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/hooks/use-currency';
import { useTableTheme } from '@/hooks/use-table-theme';
import { trpc } from '@/lib/trpc/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

ModuleRegistry.registerModules([AllCommunityModule]);

type ItemRow = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  image: string | null;
  type: string;
  unit: string;
  isActive: boolean;
  isSaleable: boolean;
  isPurchasable: boolean;
  purchasePrice: number;
  salesPrice: number;
  averageCost: number;
  minStock: number;
  reorderPoint: number;
  reorderQty: number;
  weightKg: number | null;
  description: string | null;
  createdAt: Date;
  categoryName: string | null;
  categoryColor: string | null;
  familyName: string | null;
  className: string | null;
  commodityName: string | null;
  taxRateName: string | null;
  taxRatePercent: number | null;
  stockByWarehouse: { warehouseId: string; warehouseName: string; quantity: number }[];
  totalStock: number;
  stockStatus: string;
  inventoryValue: number;
  supplierNames: string[];
  warehouseNames: string[];
};

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const QUICK_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'saleable', label: 'Saleable' },
  { key: 'purchasable', label: 'Purchasable' },
  { key: 'low', label: 'Low Stock' },
  { key: 'out', label: 'Out of Stock' },
  { key: 'recent', label: 'Recently Added' },
] as const;

type QuickFilterKey = (typeof QUICK_FILTERS)[number]['key'];

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  icon,
  loading,
  variant,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
  variant?: 'default' | 'warning' | 'danger';
}) {
  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            'size-9 rounded-xl flex items-center justify-center transition-colors',
            variant === 'warning'
              ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400'
              : variant === 'danger'
                ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                : 'bg-primary/10 text-primary group-hover:bg-primary/20',
          )}
        >
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

// ─── Chart Skeleton ────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="flex items-center justify-center h-[200px]">
      <Skeleton className="h-[180px] w-full" />
    </div>
  );
}

// ─── Item Detail Sheet ─────────────────────────────────────────────────────────

function ItemDetailSheet({
  item,
  open,
  onOpenChange,
}: {
  item: ItemRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const { format } = useCurrency();

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md px-4">
        <SheetHeader>
          <SheetTitle>{item.name}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          <div className="space-y-4 pr-4">
            {/* Image */}
            {item.image ? (
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <Package className="size-12 text-muted-foreground/30" />
              </div>
            )}

            {/* Info Rows */}
            <div className="space-y-2">
              <DetailRow label={t('items.sku')} value={item.sku} mono />
              <DetailRow label={t('items.barcode')} value={item.barcode ?? '—'} mono />
              <DetailRow label={t('common.type')} value={item.type} />
              <DetailRow label={t('common.unit')} value={item.unit} />
              <DetailRow label={t('items.category')} value={item.categoryName ?? '—'} />
            </div>

            <Separator />

            {/* Pricing */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t('items.pricing')}
              </p>
              <div className="space-y-2">
                <DetailRow label={t('items.purchasePrice')} value={format(item.purchasePrice)} />
                <DetailRow label={t('items.salesPrice')} value={format(item.salesPrice)} />
                <DetailRow label={t('items.avgCost')} value={format(item.averageCost)} />
                <DetailRow label={t('common.tax')} value={item.taxRateName ?? '—'} />
                {item.taxRatePercent !== null && (
                  <DetailRow label={`${t('items.rate')}`} value={`${item.taxRatePercent}%`} />
                )}
              </div>
            </div>

            <Separator />

            {/* Stock */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {t('items.stockReorder')}
              </p>
              <div className="space-y-2">
                <DetailRow
                  label={t('items.totalStock')}
                  value={`${item.totalStock} ${item.unit}`}
                />
                <DetailRow label={t('items.minStock')} value={`${item.minStock}`} />
                <DetailRow label={t('items.reorderAt')} value={`${item.reorderPoint}`} />
                <DetailRow label={t('items.reorderQty')} value={`${item.reorderQty}`} />
              </div>
              {item.stockByWarehouse.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {t('items.perWarehouse')}
                  </p>
                  {item.stockByWarehouse.map((sw) => (
                    <div
                      key={sw.warehouseId}
                      className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers className="size-3.5 text-muted-foreground" />
                        {sw.warehouseName}
                      </span>
                      <span className={cn('font-medium', sw.quantity <= 0 && 'text-destructive')}>
                        {sw.quantity} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Flags & Dimensions */}
            <div className="space-y-2">
              <DetailRow label={t('items.saleable')} value={item.isSaleable ? 'Yes' : 'No'} />
              <DetailRow label={t('items.purchasable')} value={item.isPurchasable ? 'Yes' : 'No'} />
              {item.weightKg !== null && (
                <DetailRow label={t('items.weight')} value={`${item.weightKg} kg`} />
              )}
            </div>

            {item.supplierNames.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {t('layout.suppliers')}
                  </p>
                  <div className="space-y-1">
                    {item.supplierNames.map((name, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 text-sm p-2 rounded bg-muted/50"
                      >
                        <Truck className="size-3.5 text-muted-foreground" />
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {item.description && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {t('common.description')}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {item.description}
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}

// ─── Export Utilities ──────────────────────────────────────────────────────────

function exportCsv(api: GridApi, fileName: string) {
  api.exportDataAsCsv({ fileName });
  toast.success('CSV exported successfully');
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ItemReportPage() {
  const t = useTranslations();
  const router = useRouter();
  const { format } = useCurrency();
  const tableTheme = useTableTheme();

  const { data: rawItems, isLoading } = trpc.items.report.useQuery();

  const gridApiRef = useRef<GridApi | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>('all');
  const [selectedItem, setSelectedItem] = useState<ItemRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    image: true,
    sku: true,
    barcode: true,
    name: true,
    categoryName: true,
    type: true,
    purchasePrice: true,
    salesPrice: true,
    totalStock: true,
    warehouseNames: true,
    stockStatus: true,
    id: true,
  });

  const utils = trpc.useUtils();

  const handleRefresh = useCallback(() => {
    utils.items.report.invalidate();
    toast.success('Data refreshed');
  }, [utils]);

  const toggleColumn = useCallback((field: string) => {
    setVisibleColumns((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const items = (rawItems ?? []) as unknown as ItemRow[];

  // ── Apply Filters ──────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    let result = items;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const searchable = [
          item.sku,
          item.barcode,
          item.name,
          item.categoryName,
          item.familyName,
          item.className,
          item.commodityName,
          ...item.supplierNames,
          ...item.warehouseNames,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchable.includes(q);
      });
    }

    // Quick Filter
    if (quickFilter === 'saleable') {
      result = result.filter((item) => item.isSaleable && item.totalStock > 0);
    } else if (quickFilter === 'purchasable') {
      result = result.filter((item) => item.isPurchasable);
    } else if (quickFilter === 'low') {
      result = result.filter((item) => item.stockStatus === 'low');
    } else if (quickFilter === 'out') {
      result = result.filter((item) => item.stockStatus === 'out');
    } else if (quickFilter === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      result = result.filter((item) => new Date(item.createdAt) >= sevenDaysAgo);
    }

    return result;
  }, [items, searchQuery, quickFilter]);

  // ── KPIs ──────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const total = items.length;
    const categories = new Set(items.map((i) => i.categoryName).filter(Boolean)).size;
    const lowStock = items.filter((i) => i.stockStatus === 'low').length;
    const outOfStock = items.filter((i) => i.stockStatus === 'out').length;
    const avgPrice =
      items.length > 0 ? items.reduce((s, i) => s + i.salesPrice, 0) / items.length : 0;
    const inventoryValue = items.reduce((s, i) => s + i.inventoryValue, 0);
    return { total, categories, lowStock, outOfStock, avgPrice, inventoryValue };
  }, [items]);

  // ── Charts Data ──────────────────────────────────────────────────────

  const categoryChartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const cat = item.categoryName ?? 'Uncategorized';
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [items]);

  const warehouseChartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      for (const sw of item.stockByWarehouse) {
        map.set(sw.warehouseName, (map.get(sw.warehouseName) ?? 0) + sw.quantity);
      }
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [items]);

  // ── AG-Grid Column Definitions ────────────────────────────────────────

  const columnDefs = useMemo<ColDef<ItemRow>[]>(
    () => [
      {
        headerName: '',
        field: 'image',
        width: 40,
        hide: !visibleColumns.image,
        sortable: false,
        filter: false,
        suppressMenu: true,
        cellRenderer: (params: { data: ItemRow }) => {
          const item = params.data;
          if (item.image) {
            return (
              <div className="size-6 rounded overflow-hidden bg-muted">
                <img src={item.image} alt="" className="w-full h-full object-cover" />
              </div>
            );
          }
          return (
            <div className="size-6 rounded bg-muted flex items-center justify-center">
              <Package className="size-3 text-muted-foreground/50" />
            </div>
          );
        },
      },
      {
        headerName: 'SKU',
        field: 'sku',
        flex: 1,
        hide: !visibleColumns.sku,
        filter: 'agTextColumnFilter',
        cellClass: 'font-mono text-[11px]',
      },
      {
        headerName: 'Barcode',
        field: 'barcode',
        flex: 1,

        hide: !visibleColumns.barcode,
        filter: 'agTextColumnFilter',
        cellClass: 'font-mono text-[11px]',
        valueFormatter: (params) => params.value ?? '—',
      },
      {
        headerName: 'Name',
        field: 'name',
        flex: 1,
        hide: !visibleColumns.name,
        filter: 'agTextColumnFilter',
        cellClass: 'font-medium text-[12px]',
      },
      {
        headerName: 'Category',
        field: 'categoryName',
        width: 110,
        hide: !visibleColumns.categoryName,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: { value: string | null; data: ItemRow }) => {
          if (!params.value)
            return (
              <Badge variant="outline" className=" px-1.5 py-0">
                —
              </Badge>
            );
          return (
            <Badge
              variant="secondary"
              className=" px-1.5 py-0 font-medium"
              style={
                params.data.categoryColor
                  ? {
                      backgroundColor: params.data.categoryColor + '18',
                      color: params.data.categoryColor,
                    }
                  : undefined
              }
            >
              {params.value}
            </Badge>
          );
        },
      },
      {
        headerName: 'Type',
        field: 'type',
        width: 85,
        hide: !visibleColumns.type,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: { value: string }) => {
          const variants: Record<string, string> = {
            PRODUCT:
              'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
            SERVICE:
              'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
            BUNDLE:
              'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200 dark:border-orange-800',
          };
          return (
            <Badge
              variant="outline"
              className={cn(' px-1.5 py-0 font-medium', variants[params.value])}
            >
              {params.value}
            </Badge>
          );
        },
      },
      {
        headerName: 'Buy Price',
        field: 'purchasePrice',
        width: 95,
        hide: !visibleColumns.purchasePrice,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        cellClass: 'text-[12px] tabular-nums',
        valueFormatter: (params) => format(params.value),
      },
      {
        headerName: 'Sell Price',
        field: 'salesPrice',
        width: 95,
        hide: !visibleColumns.salesPrice,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        cellClass: 'text-[12px] tabular-nums font-medium',
        valueFormatter: (params) => format(params.value),
      },
      {
        headerName: 'Stock',
        field: 'totalStock',
        width: 85,
        hide: !visibleColumns.totalStock,
        filter: 'agNumberColumnFilter',
        type: 'numericColumn',
        cellRenderer: (params: { value: number; data: ItemRow }) => {
          const status = params.data.stockStatus;
          const badgeClass =
            status === 'out'
              ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800'
              : status === 'low'
                ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                : 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 border-green-200 dark:border-green-800';
          return (
            <Badge
              variant="outline"
              className={cn(' px-1.5 py-0 font-semibold tabular-nums', badgeClass)}
            >
              {params.value} {params.data.unit}
            </Badge>
          );
        },
      },
      {
        headerName: 'Warehouse',
        field: 'warehouseNames',
        width: 140,
        hide: !visibleColumns.warehouseNames,
        filter: 'agTextColumnFilter',
        cellClass: 'text-[11px]',
        valueFormatter: (params: { value: string[] }) => params.value?.join(', ') ?? '—',
      },
      {
        headerName: 'Status',
        field: 'stockStatus',
        width: 80,
        hide: !visibleColumns.stockStatus,
        filter: 'agTextColumnFilter',
        cellRenderer: (params: { value: string }) => {
          const config: Record<string, { label: string; className: string }> = {
            in_stock: {
              label: 'Active',
              className:
                'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 border-green-200 dark:border-green-800',
            },
            low: {
              label: 'Low',
              className:
                'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
            },
            out: {
              label: 'Out',
              className:
                'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800',
            },
          };
          const c = config[params.value] ?? config.in_stock;
          return (
            <Badge variant="outline" className={cn(' px-1.5 py-0 font-medium', c.className)}>
              {c.label}
            </Badge>
          );
        },
      },
      {
        headerName: '',
        field: 'id',
        width: 36,
        hide: !visibleColumns.id,
        sortable: false,
        filter: false,
        suppressMenu: true,
        cellRenderer: (params: { data: ItemRow }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedItem(params.data);
              setDrawerOpen(true);
            }}
            className="size-6 rounded hover:bg-muted flex items-center justify-center"
          >
            <Eye className="size-3 text-muted-foreground" />
          </button>
        ),
      },
    ],
    [format, visibleColumns],
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      suppressHeaderMenuButton: false,
      suppressMovable: true,
      minWidth: 60,
    }),
    [],
  );

  // ── Filter Handlers ──────────────────────────────────────────────────

  const handleClearAll = useCallback(() => {
    setQuickFilter('all');
    setSearchQuery('');
    if (gridApiRef.current) {
      gridApiRef.current.setFilterModel(null);
      gridApiRef.current.onFilterChanged();
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header title={t('reports.inventoryReport')} subtitle={`${kpis.total} items`} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              title="Total Items"
              value={kpis.total.toString()}
              icon={<Package className="size-4" />}
              loading={isLoading}
            />
            <KpiCard
              title="Categories"
              value={kpis.categories.toString()}
              icon={<Tag className="size-4" />}
              loading={isLoading}
            />
            <KpiCard
              title="Low Stock"
              value={kpis.lowStock.toString()}
              icon={<Weight className="size-4" />}
              loading={isLoading}
              variant="warning"
            />
            <KpiCard
              title="Out of Stock"
              value={kpis.outOfStock.toString()}
              icon={<XCircle className="size-4" />}
              loading={isLoading}
              variant="danger"
            />
            <KpiCard
              title="Avg Price"
              value={format(kpis.avgPrice)}
              icon={<Tag className="size-4" />}
              loading={isLoading}
            />
            <KpiCard
              title="Inventory Value"
              value={format(kpis.inventoryValue)}
              icon={<ShoppingCart className="size-4" />}
              loading={isLoading}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Box className="size-4 text-primary" />
                  Items by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartSkeleton />
                ) : categoryChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    {t('common.noData')}
                  </p>
                ) : (
                  <ChartContainer config={{}} className="aspect-auto h-[220px] w-full">
                    <BarChart
                      data={categoryChartData.slice(0, 8)}
                      margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                    >
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={24}>
                        {categoryChartData.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  Stock by Warehouse
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ChartSkeleton />
                ) : warehouseChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    {t('common.noData')}
                  </p>
                ) : (
                  <ChartContainer config={{}} className="aspect-auto h-[220px] w-full">
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Pie
                        data={warehouseChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {warehouseChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartLegend
                        content={<ChartLegendContent nameKey="name" />}
                        verticalAlign="bottom"
                      />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content: Grid */}
          <div className="space-y-4">
            {/* Search + Quick Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1 w-full sm:max-w-md">
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <Search className="size-3.5" />
                  </InputGroupAddon>
                  <InputGroupInput
                    placeholder="Search SKU, barcode, name, category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <InputGroupAddon align="inline-end">
                      <button
                        onClick={() => setSearchQuery('')}
                        className="size-5 rounded hover:bg-muted flex items-center justify-center"
                      >
                        <X className="size-3 text-muted-foreground" />
                      </button>
                    </InputGroupAddon>
                  )}
                </InputGroup>
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_FILTERS.map((qf) => (
                  <Button
                    key={qf.key}
                    variant={quickFilter === qf.key ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setQuickFilter(qf.key)}
                  >
                    {qf.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* AG-Grid Card */}
            <Card
              className={cn(
                isFullscreen
                  ? 'fixed inset-0 z-50 rounded-none border-0 bg-background flex flex-col'
                  : 'flex flex-col',
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 border-b shrink-0">
                <div></div>
                <div className="flex items-center gap-1">
                  {/* Refresh */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={handleRefresh}
                    title={t('common.refresh')}
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>

                  {/* Export Dropdown */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Export"
                    onClick={() => {
                      if (gridApiRef.current) exportCsv(gridApiRef.current, 'items-report');
                    }}
                  >
                    <Download className="size-3.5" />
                  </Button>

                  {/* Column Toggle */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7" title="Toggle columns">
                        <Columns3 className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48"
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      {Object.entries(visibleColumns).map(([field, visible]) => {
                        const labels: Record<string, string> = {
                          image: 'Image',
                          sku: 'SKU',
                          barcode: 'Barcode',
                          name: 'Name',
                          categoryName: 'Category',
                          type: 'Type',
                          purchasePrice: 'Buy Price',
                          salesPrice: 'Sell Price',
                          totalStock: 'Stock',
                          warehouseNames: 'Warehouse',
                          stockStatus: 'Status',
                          id: 'Actions',
                        };
                        return (
                          <DropdownMenuItem
                            key={field}
                            onSelect={(e) => {
                              e.preventDefault();
                              toggleColumn(field);
                            }}
                            className="gap-2"
                          >
                            <div
                              className={cn(
                                'size-3.5 rounded border flex items-center justify-center',
                                visible
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-muted-foreground/30',
                              )}
                            >
                              {visible && (
                                <svg className="size-2.5" viewBox="0 0 12 12" fill="none">
                                  <path
                                    d="M2 6l3 3 5-5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </div>
                            <span className="flex-1">{labels[field] ?? field}</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Fullscreen */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="size-3.5" />
                    ) : (
                      <Maximize2 className="size-3.5" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent
                className={cn('p-0', isFullscreen ? 'flex-1 min-h-0 overflow-hidden' : '')}
              >
                <div className={cn('w-full', isFullscreen ? 'h-full' : 'h-[500px]')}>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Skeleton className="h-[500px] w-full" />
                    </div>
                  ) : (
                    <AgGridReact
                      rowData={filteredItems}
                      columnDefs={columnDefs}
                      defaultColDef={defaultColDef}
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
                    />
                  )}
                </div>
              </CardContent>
              <CardFooter className="m-0">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredItems.length} of {items.length} items
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      {/* Detail Drawer */}
      <ItemDetailSheet item={selectedItem} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
