'use client';

import type { ColDef, GridApi, IRowNode } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Filter, Search, X, Check, CheckSquare, Square } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Empty } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTableTheme } from '@/hooks/use-table-theme';

ModuleRegistry.registerModules([AllCommunityModule]);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FilterConfig {
  key: string;
  label: string;
  getValue: (item: any) => string | undefined;
}

export interface SelectionDialogProps<T extends Record<string, any>> {
  // Dialog
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;

  // Data
  data: T[] | undefined;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRefetch?: () => void;

  // Identity — used to track selected items
  getItemId: (item: T) => string;

  // Selection mode
  mode?: 'single' | 'multi';

  // Pre-selected items (controlled)
  selectedIds?: string[];

  // Callbacks
  onSelect: (items: T[]) => void;
  onCancel?: () => void;

  // Search
  searchPlaceholder?: string;
  searchFields: (keyof T | ((item: T) => string | undefined))[];

  // Filters
  filters?: FilterConfig[];

  // Card renderer
  cardRenderer: (item: T, selected: boolean) => React.ReactNode;

  // Empty state
  emptyIcon?: React.ReactNode;
  emptyTitle?: string | React.ReactNode;
  emptyDescription?: string | React.ReactNode;

  // Grid options
  rowHeight?: number | 'auto';
  useTheme?: boolean;

  // Labels
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SelectionDialog<T extends Record<string, any>>({
  open,
  onOpenChange,
  title = 'Select items',
  description,
  data = [],
  isLoading = false,
  isError = false,
  error = null,
  onRefetch,
  getItemId,
  mode = 'multi',
  selectedIds: controlledSelectedIds,
  onSelect,
  onCancel,
  searchPlaceholder = 'Search...',
  searchFields,
  filters = [],
  cardRenderer,
  emptyIcon,
  emptyTitle = 'No items found',
  emptyDescription = 'Try adjusting your search or filters',
  rowHeight = 'auto',
  useTheme = false,
  itemName = 'items',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: SelectionDialogProps<T>) {
  const isMobile = useIsMobile();
  const gridRef = useRef<any>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const theme = useTableTheme();
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Internal selection state (mirrors controlled if provided)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(controlledSelectedIds ?? []));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    Object.fromEntries(filters.map((f) => [f.key, 'all'])),
  );
  const [cardHeight, setCardHeight] = useState(0);

  // Sync controlled selectedIds when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(controlledSelectedIds ?? []));
      setSearchTerm('');
      setFilterValues(Object.fromEntries(filters.map((f) => [f.key, 'all'])));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ─── Filter Options ───────────────────────────────────────────────────────

  const filterOptions = useMemo(() => {
    return filters.reduce(
      (acc, filter) => {
        const values = new Set<string>(
          data.map((item) => filter.getValue(item)).filter((v): v is string => Boolean(v)),
        );
        acc[filter.key] = Array.from(values).sort();
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }, [data, filters]);

  // ─── Filtered Data ────────────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        searchFields.some((field) => {
          const value =
            typeof field === 'function' ? field(item) : String(item[field as keyof T] ?? '');
          return value?.toLowerCase().includes(searchTerm.toLowerCase());
        });

      const matchesFilters = filters.every((filter) => {
        const fv = filterValues[filter.key];
        if (fv === 'all') return true;
        return filter.getValue(item) === fv;
      });

      return matchesSearch && matchesFilters;
    });
  }, [data, searchTerm, searchFields, filters, filterValues]);

  // ─── Selection Helpers ────────────────────────────────────────────────────

  const toggleItem = useCallback(
    (item: T) => {
      const id = getItemId(item);

      if (mode === 'single') {
        // Single: replace selection or deselect
        setSelectedIds((prev) => {
          const next = new Set<string>();
          if (!prev.has(id)) next.add(id);
          return next;
        });
        return;
      }

      // Multi
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [mode, getItemId],
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredData.map(getItemId)));
  }, [filteredData, getItemId]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const allFilteredSelected =
    filteredData.length > 0 && filteredData.every((item) => selectedIds.has(getItemId(item)));

  const someFilteredSelected =
    !allFilteredSelected && filteredData.some((item) => selectedIds.has(getItemId(item)));

  // ─── Active Filters ───────────────────────────────────────────────────────

  const activeFiltersCount = useMemo(
    () => Object.values(filterValues).filter((v) => v !== 'all').length,
    [filterValues],
  );

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterValues(Object.fromEntries(filters.map((f) => [f.key, 'all'])));
  };

  const updateFilter = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ─── Card Height Measurement ──────────────────────────────────────────────

  useEffect(() => {
    if (rowHeight !== 'auto' || !cardRef.current) return;
    resizeObserverRef.current?.disconnect();

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.target.clientHeight;
        if (h > 0) setCardHeight(h + 16);
      }
    });

    resizeObserverRef.current.observe(cardRef.current);
    const immediateH = cardRef.current.clientHeight;
    if (immediateH > 0) setCardHeight(immediateH + 16);

    return () => resizeObserverRef.current?.disconnect();
  }, [filteredData.length, rowHeight]);

  useEffect(() => {
    if (cardHeight > 0) gridRef.current?.api?.resetRowHeights();
  }, [cardHeight]);

  const calculatedRowHeight = useMemo(() => {
    if (rowHeight === 'auto') return cardHeight > 0 ? cardHeight : isMobile ? 400 : 250;
    return rowHeight;
  }, [rowHeight, cardHeight, isMobile]);

  // ─── Grid ─────────────────────────────────────────────────────────────────

  const FullWidthCellRenderer = useCallback(
    (props: any) => {
      const item = props.data as T;
      const id = getItemId(item);
      const isSelected = selectedIds.has(id);
      const isFirst = props.rowIndex === 0;

      return (
        <div
          ref={isFirst && rowHeight === 'auto' ? cardRef : null}
          onClick={() => toggleItem(item)}
          className={cn(
            'cursor-pointer transition-colors w-full',
            'ring-inset',
            isSelected ? 'ring-2 ring-primary rounded-lg bg-primary/5' : 'hover:bg-muted/50',
          )}
        >
          {cardRenderer(item, isSelected)}
        </div>
      );
    },
    [cardRenderer, getItemId, selectedIds, toggleItem, rowHeight],
  );

  const columnDefs = useMemo<ColDef[]>(() => [{ field: 'id', hide: true }], []);
  const defaultColDef = useMemo(() => ({ flex: 1, minWidth: 100 }), []);

  const gridOptions = useMemo(
    () => ({
      fullWidthCellRenderer: FullWidthCellRenderer,
      isFullWidthRow: () => true,
      rowHeight: calculatedRowHeight,
      suppressHorizontalScroll: true,
      headerHeight: 0,
    }),
    [FullWidthCellRenderer, calculatedRowHeight],
  );

  // ─── Confirm / Cancel ─────────────────────────────────────────────────────

  const handleConfirm = () => {
    const selected = data.filter((item) => selectedIds.has(getItemId(item)));
    onSelect(selected);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 max-w-2xl w-full min-h-[90vh] overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Search + Filters */}
        <div className="px-4 pt-4 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-9"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {filters.length > 0 && (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button variant="outline" className="gap-2 relative shrink-0">
                      <Filter className="w-4 h-4" />
                      <span className="hidden sm:inline">Filters</span>
                      {activeFiltersCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                        >
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  }
                />
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Filters</h4>
                      {activeFiltersCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="h-7 text-xs"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                    <Separator />
                    {filters.map((filter) => (
                      <div key={filter.key} className="space-y-1.5">
                        <Label htmlFor={`${filter.key}-filter`} className="text-sm">
                          {filter.label}
                        </Label>
                        <Select
                          value={filterValues[filter.key]}
                          onValueChange={(v) => updateFilter(filter.key, v as string)}
                        >
                          <SelectTrigger className="w-full" id={`${filter.key}-filter`}>
                            <SelectValue placeholder={`All ${filter.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All {filter.label.toLowerCase()}</SelectItem>
                            {filterOptions[filter.key]?.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Active filter badges */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {filters.map((filter) => {
                const value = filterValues[filter.key];
                if (value === 'all') return null;
                return (
                  <Badge
                    key={filter.key}
                    variant="secondary"
                    className="gap-1 cursor-pointer hover:bg-secondary/80 text-xs"
                    onClick={() => updateFilter(filter.key, 'all')}
                  >
                    {filter.label}: {value}
                    <X className="w-2.5 h-2.5" />
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Select all / count row */}
          <div className="flex items-center justify-between mt-3 pb-2">
            <span className="text-xs text-muted-foreground">
              {filteredData.length} {itemName}
              {selectedIds.size > 0 && (
                <>
                  {' '}
                  · <span className="text-foreground font-medium">{selectedIds.size} selected</span>
                </>
              )}
            </span>

            {mode === 'multi' && filteredData.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={allFilteredSelected ? deselectAll : selectAll}
              >
                {allFilteredSelected ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" /> Deselect all
                  </>
                ) : someFilteredSelected ? (
                  <>
                    <Square className="w-3.5 h-3.5" /> Select all ({filteredData.length})
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" /> Select all ({filteredData.length})
                  </>
                )}
              </Button>
            )}
          </div>

          <Separator />
        </div>

        {/* Grid */}
        <div className="flex flex-col flex-1">
          {isError ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <p className="text-destructive font-semibold">Failed to load {itemName}</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
              {onRefetch && (
                <Button variant="destructive" size="sm" onClick={onRefetch}>
                  Try again
                </Button>
              )}
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
              <Spinner />
              <p className="text-sm text-muted-foreground">Loading {itemName}…</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-6 text-center">
              {emptyIcon}
              <p className="font-semibold">{emptyTitle}</p>
              <p className="text-sm text-muted-foreground">{emptyDescription}</p>
              {(searchTerm || activeFiltersCount > 0) && (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <AgGridReact
              ref={gridRef}
              rowData={filteredData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              gridOptions={gridOptions}
              animateRows
              suppressMenuHide
              theme={useTheme ? theme : undefined}
              loading={isLoading}
              isFullWidthRow={() => true}
              fullWidthCellRenderer={FullWidthCellRenderer}
              rowHeight={calculatedRowHeight}
              domLayout="normal"
              className="h-full w-full"
            />
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0">
          <Separator />
          <DialogFooter className="px-6 py-4 gap-2">
            <Button variant="outline" onClick={handleCancel}>
              {cancelLabel}
            </Button>
            <Button onClick={handleConfirm} disabled={selectedIds.size === 0} className="gap-2">
              <Check className="w-4 h-4" />
              {confirmLabel}
              {selectedIds.size > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {selectedIds.size}
                </Badge>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
