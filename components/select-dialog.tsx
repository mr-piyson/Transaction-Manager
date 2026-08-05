'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, CheckSquare, Filter, Search, Square, X } from 'lucide-react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
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

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FilterConfig<T> {
  key: string;
  label: string;
  getValue: (item: T) => string | undefined;
}

export interface SelectionDialogProps<T> {
  // Dialog
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;

  // Data
  data: T[];
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
  searchFields: Array<keyof T | ((item: T) => string | undefined)>;

  // Filters
  filters?: FilterConfig<T>[];

  // Card renderer
  cardRenderer: (item: T, selected: boolean) => React.ReactNode;

  // Empty state
  emptyIcon?: React.ReactNode;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;

  // List options
  rowHeight?: number | 'auto';

  // Labels
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SelectionDialog<T>({
  open,
  onOpenChange,
  title = 'Select items',
  description,
  children,
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
  searchPlaceholder = 'Search ...',
  searchFields,
  filters = [],
  cardRenderer,
  emptyIcon,
  emptyTitle = 'No items found',
  emptyDescription = 'Try adjusting your search or filters',
  rowHeight = 'auto',
  itemName = 'items',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: SelectionDialogProps<T>) {
  // Refs keep latest values available to the open-reset effect without
  // re-running it when the props change identity.
  const controlledIdsRef = useRef(controlledSelectedIds);
  controlledIdsRef.current = controlledSelectedIds;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Internal selection state (mirrors the controlled prop while open)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(controlledSelectedIds ?? []),
  );
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(filters.map((f) => [f.key, 'all'])),
  );

  // Reset internal state whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set(controlledIdsRef.current ?? []));
    setSearchTerm('');
    setFilterValues(Object.fromEntries(filtersRef.current.map((f) => [f.key, 'all'])));
  }, [open]);

  // ─── Filter Options ───────────────────────────────────────────────────────

  const filterOptions = useMemo(
    () =>
      filters.reduce(
        (acc, filter) => {
          const values = new Set<string>(
            data.map((item) => filter.getValue(item)).filter((v): v is string => Boolean(v)),
          );
          acc[filter.key] = Array.from(values).sort();
          return acc;
        },
        {} as Record<string, string[]>,
      ),
    [data, filters],
  );

  // ─── Filtered Data ────────────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase();

    return data.filter((item) => {
      const matchesSearch =
        !query ||
        searchFields.some((field) => {
          const value = typeof field === 'function' ? field(item) : String(item[field] ?? '');
          return value?.toLowerCase().includes(query);
        });

      const matchesFilters = filters.every((filter) => {
        const fv = filterValues[filter.key] ?? 'all';
        if (fv === 'all') return true;
        return filter.getValue(item) === fv;
      });

      return matchesSearch && matchesFilters;
    });
  }, [data, deferredSearchTerm, searchFields, filters, filterValues]);

  // ─── Selection Helpers ────────────────────────────────────────────────────

  const toggleItem = useCallback(
    (item: T) => {
      const id = getItemId(item);

      if (mode === 'single') {
        setSelectedIds(new Set([id]));
        return;
      }

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

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setFilterValues(Object.fromEntries(filters.map((f) => [f.key, 'all'])));
  }, [filters]);

  const updateFilter = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ─── Virtualized List ─────────────────────────────────────────────────────

  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: filteredData.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (typeof rowHeight === 'number' ? rowHeight : 100),
    overscan: 8,
  });

  const handleListKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (filteredData.length === 0) return;

      const focused = document.activeElement as HTMLElement | null;
      const currentIndex = focused?.dataset.index;
      if (currentIndex === undefined) return;

      const current = Number(currentIndex);
      const next =
        event.key === 'ArrowDown'
          ? Math.min(current + 1, filteredData.length - 1)
          : Math.max(current - 1, 0);

      if (next === current) return;
      event.preventDefault();

      virtualizer.scrollToIndex(next, { align: 'auto' });
      requestAnimationFrame(() => {
        scrollRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus();
      });
    },
    [filteredData.length, virtualizer],
  );

  // ─── Confirm / Cancel ─────────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    const selected = data.filter((item) => selectedIds.has(getItemId(item)));
    onSelect(selected);
    onOpenChange(false);
  }, [data, selectedIds, getItemId, onSelect, onOpenChange]);

  const handleCancel = useCallback(() => {
    onCancel?.();
    onOpenChange(false);
  }, [onCancel, onOpenChange]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 max-w-2xl w-full h-[90vh] sm:h-auto sm:max-h-[85vh] overflow-hidden bg-background border shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-2 shrink-0 border-b bg-muted/20">
          <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
          {description && (
            <DialogDescription className="mt-1 text-sm">{description}</DialogDescription>
          )}
        </div>

        {/* Search + Filters + Optional Children (Tabs etc) */}
        <div className="px-6 pt-4 shrink-0 bg-background">
          {children && <div className="mb-4">{children}</div>}

          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="pl-10 pr-9 h-11 bg-muted/40 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
              />
              {searchTerm && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </Button>
              )}
            </div>

            {filters.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 h-11 px-4 shrink-0 border-dashed">
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filters</span>
                    {activeFiltersCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-1 h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
                      >
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4" align="end">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Filters</h4>
                      {activeFiltersCount > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="h-7 text-xs hover:text-destructive"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                    <Separator />
                    {filters.map((filter) => (
                      <div key={filter.key} className="space-y-1.5">
                        <Label htmlFor={`${filter.key}-filter`} className="text-xs font-medium">
                          {filter.label}
                        </Label>
                        <Select
                          value={filterValues[filter.key] ?? 'all'}
                          onValueChange={(v) => updateFilter(filter.key, v)}
                        >
                          <SelectTrigger className="w-full h-9" id={`${filter.key}-filter`}>
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
            <div className="flex flex-wrap gap-1.5 mt-3">
              {filters.map((filter) => {
                const value = filterValues[filter.key];
                if (!value || value === 'all') return null;
                return (
                  <Badge
                    key={filter.key}
                    variant="secondary"
                    className="gap-1 pr-1 pl-2 py-0.5 cursor-pointer hover:bg-secondary/80 text-[10px] items-center"
                    onClick={() => updateFilter(filter.key, 'all')}
                  >
                    <span className="opacity-70">{filter.label}:</span> {value}
                    <X className="w-3 h-3 ml-0.5 text-muted-foreground" />
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Select all / count row */}
          <div className="flex items-center justify-between mt-4 pb-2">
            <span className="text-xs text-muted-foreground font-medium">
              {filteredData.length} {itemName} found
              {selectedIds.size > 0 && (
                <>
                  {' '}
                  · <span className="text-primary font-semibold">{selectedIds.size} selected</span>
                </>
              )}
            </span>

            {mode === 'multi' && filteredData.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5 hover:bg-muted font-medium"
                onClick={allFilteredSelected ? deselectAll : selectAll}
              >
                {allFilteredSelected ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-primary" /> Deselect all
                  </>
                ) : (
                  <>
                    {someFilteredSelected ? (
                      <Square className="w-3.5 h-3.5 text-primary/60" />
                    ) : (
                      <CheckSquare className="w-3.5 h-3.5" />
                    )}
                    Select all
                  </>
                )}
              </Button>
            )}
          </div>

          <Separator />
        </div>

        {/* List Content */}
        <div className="flex flex-col min-h-0 flex-1 bg-background px-4">
          {isError ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
              <div className="p-3 bg-destructive/10 rounded-full">
                <X className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-base font-semibold">Failed to load {itemName}</p>
                <p className="max-w-75 mt-1 text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : 'An unexpected error occurred'}
                </p>
              </div>
              {onRefetch && (
                <Button type="button" variant="outline" size="sm" onClick={onRefetch}>
                  Try again
                </Button>
              )}
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
              <Spinner className="size-8 text-primary" />
              <p className="text-sm font-medium text-muted-foreground animate-pulse">
                Loading {itemName}…
              </p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center animate-in fade-in transition-all">
              <div className="p-4 bg-muted/30 rounded-full">
                {emptyIcon ?? <Search className="w-8 h-8 text-muted-foreground/50" />}
              </div>
              <div>
                <p className="text-base font-semibold">{emptyTitle}</p>
                <p className="max-w-75 mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
              </div>
              {(searchTerm || activeFiltersCount > 0) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="mt-2"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div
              ref={scrollRef}
              onKeyDown={handleListKeyDown}
              className="h-full min-h-0 overflow-y-auto py-2"
            >
              <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const item = filteredData[virtualItem.index];
                  const id = getItemId(item);
                  const isSelected = selectedIds.has(id);

                  return (
                    <div
                      key={id}
                      ref={virtualizer.measureElement}
                      data-index={virtualItem.index}
                      className="absolute top-0 left-0 w-full"
                      style={{ transform: `translateY(${virtualItem.start}px)` }}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        data-index={virtualItem.index}
                        aria-pressed={isSelected}
                        onClick={() => toggleItem(item)}
                        className={cn(
                          'h-auto w-full cursor-pointer py-1 group transition-all duration-200 ring-inset',
                        )}
                      >
                        <div
                          className={cn(
                            'w-full rounded-xl border transition-all duration-200 overflow-hidden',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'border-transparent hover:border-muted-foreground/30 hover:bg-muted/50',
                          )}
                        >
                          {cardRenderer(item, isSelected)}
                        </div>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0">
          <div className="flex w-full items-center justify-between gap-4">
            <Button type="button" variant="ghost" onClick={handleCancel} className="font-medium">
              {cancelLabel}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="gap-2 px-6 h-11 font-semibold shadow-lg shadow-primary/20"
            >
              <Check className="w-5 h-5" />
              {confirmLabel}
              {selectedIds.size > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 bg-primary-foreground/20 text-primary-foreground border-none h-5 px-1.5 text-xs"
                >
                  {selectedIds.size}
                </Badge>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
