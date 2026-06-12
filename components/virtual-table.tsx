'use client';

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VirtualTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  isLoading?: boolean;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Extra content rendered to the right of the search bar */
  headerRight?: React.ReactNode;
  /** Override estimated row height (default: 52px) */
  estimateSize?: number;
  /** When set, clicking a row triggers this handler */
  onRowClick?: (row: TData) => void;
  className?: string;
  emptyMessage?: string;
  /** Height of the scroll container. Defaults to 'calc(100vh - 160px)' */
  containerHeight?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function VirtualTable<TData>({
  data,
  columns,
  isLoading = false,
  globalFilter,
  onGlobalFilterChange,
  searchPlaceholder = 'Search...',
  headerRight,
  estimateSize = 52,
  onRowClick,
  className,
  emptyMessage = 'No results found.',
  containerHeight = 'calc(100vh - 160px)',
}: VirtualTableProps<TData>) {
  const [internalFilter, setInternalFilter] = React.useState('');
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const filterValue = globalFilter !== undefined ? globalFilter : internalFilter;
  const setFilterValue = onGlobalFilterChange ?? setInternalFilter;

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: filterValue },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilterValue,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const { rows } = table.getRowModel();

  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // ── Loading skeletons ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-24 ms-auto" />
        </div>
        <div className="flex-1 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/50">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="h-6 w-16 ms-auto rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm sticky top-14 z-10">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={searchPlaceholder}
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="pl-9 pr-9 h-9"
          />
          {filterValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setFilterValue('')}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
        {filterValue && (
          <Badge variant="secondary" className="text-xs shrink-0">
            {rows.length} result{rows.length !== 1 ? 's' : ''}
          </Badge>
        )}
        {headerRight && <div className="ms-auto flex items-center gap-2">{headerRight}</div>}
      </div>

      {/* ── Table head ─────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse">
          <thead className="bg-muted/40 border-b border-border sticky top-[57px] z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      className={cn(
                        'h-10 px-3 text-start align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap select-none',
                        canSort && 'cursor-pointer hover:text-foreground transition-colors',
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-muted-foreground/50">
                            {isSorted === 'asc' ? (
                              <ChevronUp className="size-3.5" />
                            ) : isSorted === 'desc' ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ArrowUpDown className="size-3.5 opacity-40" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
        </table>
      </div>

      {/* ── Virtualized body ───────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground py-20">
          <Search className="size-10 opacity-20" />
          <p className="text-sm">{emptyMessage}</p>
          {filterValue && (
            <Button variant="outline" size="sm" onClick={() => setFilterValue('')}>
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div
          ref={parentRef}
          style={{ height: containerHeight }}
          className="overflow-auto relative"
        >
          <div style={{ height: totalSize, position: 'relative' }}>
            <table className="w-full min-w-max border-collapse">
              <tbody>
                {/* Padding top for virtualizer offset */}
                {virtualItems.length > 0 && virtualItems[0].start > 0 && (
                  <tr>
                    <td style={{ height: virtualItems[0].start }} colSpan={columns.length} />
                  </tr>
                )}

                {virtualItems.map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <tr
                      key={row.id}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      onClick={() => onRowClick?.(row.original)}
                      className={cn(
                        'border-b border-border/50 transition-colors',
                        'hover:bg-muted/50',
                        onRowClick && 'cursor-pointer',
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          style={{
                            width:
                              cell.column.getSize() !== 150 ? cell.column.getSize() : undefined,
                          }}
                          className="px-3 py-2.5 align-middle text-sm whitespace-nowrap"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}

                {/* Padding bottom for virtualizer offset */}
                {virtualItems.length > 0 && (
                  <tr>
                    <td
                      style={{
                        height:
                          totalSize -
                          (virtualItems[virtualItems.length - 1].end ?? totalSize),
                      }}
                      colSpan={columns.length}
                    />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper: status badge ─────────────────────────────────────────────────────

const STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  ACTIVE: 'default',
  DRAFT: 'secondary',
  SENT: 'default',
  PAID: 'default',
  PARTIAL: 'outline',
  OVERDUE: 'destructive',
  CANCELLED: 'destructive',
  DELETED: 'destructive',
  ORDERED: 'default',
  RECEIVED: 'default',
  PARTIAL_RECEIVED: 'outline',
  QUOTE: 'secondary',
  INVOICE: 'default',
  CREDIT_NOTE: 'outline',
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANTS[status] ?? 'secondary';
  return (
    <Badge
      variant={variant}
      className={cn(
        'text-xs font-medium capitalize',
        status === 'PAID' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        status === 'SENT' || status === 'ORDERED' || status === 'RECEIVED' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' : '',
        status === 'DRAFT' && 'bg-muted text-muted-foreground',
        status === 'PARTIAL' || status === 'PARTIAL_RECEIVED' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' : '',
        (status === 'OVERDUE' || status === 'CANCELLED' || status === 'DELETED') && 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
      )}
    >
      {status.replace(/_/g, ' ').toLowerCase()}
    </Badge>
  );
}
