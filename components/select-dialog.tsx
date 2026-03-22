'use client';

import type { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Filter, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useTableTheme } from '@/hooks/use-table-theme';
import { ButtonProps } from './button';
import React from 'react';

ModuleRegistry.registerModules([AllCommunityModule]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterConfig<T = any> {
  key: string;
  label: string;
  getValue: (item: T) => string | undefined;
}

export interface SelectDialogProps<T extends Record<string, any> = Record<string, any>> {
  /** Anything here becomes the dialog trigger */
  children?: ReactNode;
  title?: string;
  /** Controlled open state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  /** Called with the item the user clicked; dialog closes automatically */
  onSelect: (item: T) => void;

  // Data
  data: T[] | undefined;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRefetch?: () => void;

  // Search
  searchPlaceholder?: string;
  searchFields: Array<keyof T | ((item: T) => string | undefined)>;

  // Filters
  filters?: FilterConfig<T>[];

  /** Card renderer component */
  cardRenderer: React.ComponentType<{ data: T } | any>;

  // Empty state
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;

  // Grid
  rowHeight: number;
  useTheme?: boolean;
  itemName?: string;
  props?: ButtonProps;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SelectDialog<T extends Record<string, any>>({
  children,
  title = 'Select item',
  open: controlledOpen,
  onOpenChange,
  onSelect,
  data = [],
  isLoading = false,
  isError = false,
  error = null,
  onRefetch,
  searchPlaceholder = 'Search...',
  searchFields,
  filters = [],
  cardRenderer: CardRenderer,
  emptyTitle = 'No items found',
  emptyDescription = 'Try adjusting your search or filters',
  rowHeight,
  useTheme = false,
  itemName = 'items',
  ...props
}: SelectDialogProps<T>) {
  // ── open state ────────────────────────────────────────────────────────────
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? (controlledOpen as boolean) : internalOpen;

  const setOpen = useCallback(
    (val: boolean) => {
      if (!isControlled) setInternalOpen(val);
      onOpenChange?.(val);
    },
    [isControlled, onOpenChange],
  );

  // ── refs ──────────────────────────────────────────────────────────────────
  const gridRef = useRef<AgGridReact<T>>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── hooks ─────────────────────────────────────────────────────────────────
  const theme = useTableTheme();

  // ── local state ───────────────────────────────────────────────────────────
  const [gridApi, setGridApi] = useState<GridApi<T> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(filters.map((f) => [f.key, 'all'])),
  );

  // ── reset when dialog opens ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchTerm('');
    setFilterValues(Object.fromEntries(filters.map((f) => [f.key, 'all'])));
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── filter option lists ───────────────────────────────────────────────────
  const filterOptions = useMemo(() => {
    return filters.reduce<Record<string, string[]>>((acc, filter) => {
      const values = new Set<string>(data.map((item) => filter.getValue(item)).filter((v): v is string => Boolean(v)));
      acc[filter.key] = Array.from(values).sort();
      return acc;
    }, {});
  }, [data, filters]);

  // ── filtered data ─────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        searchFields.some((field) => {
          const value = typeof field === 'function' ? field(item) : String((item[field as keyof T] as unknown) ?? '');
          return value?.toLowerCase().includes(searchTerm.toLowerCase());
        });

      const matchesFilters = filters.every((filter) => {
        const filterValue = filterValues[filter.key];
        if (filterValue === 'all') return true;
        return filter.getValue(item) === filterValue;
      });

      return matchesSearch && matchesFilters;
    });
  }, [data, searchTerm, searchFields, filters, filterValues]);

  // ── active filters count ──────────────────────────────────────────────────
  const activeFiltersCount = useMemo(
    () => Object.values(filterValues).filter((v) => v !== 'all').length,
    [filterValues],
  );

  // ── helpers ───────────────────────────────────────────────────────────────
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setFilterValues(Object.fromEntries(filters.map((f) => [f.key, 'all'])));
  }, [filters]);

  const updateFilter = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSelect = useCallback(
    (item: T) => {
      onSelect(item);
      setOpen(false);
    },
    [onSelect, setOpen],
  );

  // ── AG Grid: full-width cell renderer ─────────────────────────────────────
  // NOTE: no highlightedIndex dependency — hover is handled purely via CSS on
  // the wrapper div, so this callback never changes and AG Grid never
  // re-renders rows unnecessarily.
  const FullWidthCellRenderer = useCallback(
    (props: { data: T }) => (
      <div onClick={() => handleSelect(props.data)} className="cursor-pointer h-full transition-colors hover:bg-accent">
        <CardRenderer data={props.data} />
      </div>
    ),
    [CardRenderer, handleSelect],
  );

  // ── AG Grid: column / grid config ─────────────────────────────────────────
  const columnDefs = useMemo<any>(() => [{ field: 'id' as keyof T & string, hide: true }], []);

  const defaultColDef = useMemo<ColDef<T>>(() => ({ flex: 1, minWidth: 100 }), []);

  const gridOptions = useMemo(
    () => ({
      fullWidthCellRenderer: FullWidthCellRenderer,
      isFullWidthRow: () => true,
      rowHeight,
      suppressHorizontalScroll: true,
      headerHeight: 0,
    }),
    [FullWidthCellRenderer, rowHeight],
  );

  const onGridReady = useCallback((params: GridReadyEvent<T>) => setGridApi(params.api), []);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger render={React.isValidElement(children) ? children : <Button type="button">Select</Button>} />

      <DialogContent className="h-120 max-w-2xl max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* ── Search + Filters ──────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  tabIndex={-1}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="w-4 h-4" />
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
                ></PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Filters</h4>
                      {activeFiltersCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 text-xs">
                          Clear all
                        </Button>
                      )}
                    </div>
                    <Separator />
                    {filters.map((filter) => (
                      <div key={filter.key} className="space-y-2">
                        <Label htmlFor={`${filter.key}-filter`} className="text-sm font-medium">
                          {filter.label}
                        </Label>
                        <Select
                          value={filterValues[filter.key]}
                          onValueChange={(value) => updateFilter(filter.key, value as string)}
                        >
                          <SelectTrigger id={`${filter.key}-filter`} className="w-full">
                            <SelectValue placeholder={`All ${filter.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All {filter.label.toLowerCase()}</SelectItem>
                            {filterOptions[filter.key]?.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
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

          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.map((filter) => {
                const value = filterValues[filter.key];
                if (value === 'all') return null;
                return (
                  <Badge
                    key={filter.key}
                    variant="secondary"
                    className="gap-1 cursor-pointer hover:bg-secondary/80"
                    onClick={() => updateFilter(filter.key, 'all')}
                  >
                    {filter.label}: {value}
                    <X className="w-3 h-3" />
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        <Separator className="shrink-0" />

        {/* ── Results count ─────────────────────────────────────────────── */}
        <div className="px-4 py-1.5 shrink-0">
          <p className="text-xs text-muted-foreground">
            {filteredData.length} {filteredData.length === 1 ? itemName.replace(/s$/, '') : itemName}
          </p>
        </div>

        {/* ── Grid / states ─────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Spinner />
              <p className="text-sm">Loading {itemName}…</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <p className="text-sm font-medium text-destructive">Error loading data</p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
              {onRefetch && (
                <Button variant="destructive" size="sm" onClick={onRefetch}>
                  Try Again
                </Button>
              )}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
              <p className="text-sm font-medium">{emptyTitle}</p>
              <p className="text-xs text-muted-foreground">{emptyDescription}</p>
              {(searchTerm || activeFiltersCount > 0) && (
                <Button variant="outline" size="sm" className="mt-2" onClick={clearAllFilters}>
                  Clear {searchTerm && activeFiltersCount > 0 ? 'All' : searchTerm ? 'Search' : 'Filters'}
                </Button>
              )}
            </div>
          ) : (
            <AgGridReact<T>
              ref={gridRef}
              rowData={filteredData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              gridOptions={gridOptions}
              animateRows={true}
              suppressMenuHide={true}
              theme={theme}
              loading={isLoading}
              isFullWidthRow={() => true}
              fullWidthCellRenderer={FullWidthCellRenderer}
              rowHeight={rowHeight}
              onGridReady={onGridReady}
              domLayout="normal"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
