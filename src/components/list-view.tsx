"use client";

import type { ColDef, GridApi } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Filter, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTableTheme } from "@/hooks/use-table-theme";

ModuleRegistry.registerModules([AllCommunityModule]);

// Filter configuration type
export interface FilterConfig {
  key: string;
  label: string;
  getValue: (item: any) => string | undefined;
}

// Props interface
export interface UniversalListViewProps<T = any> {
  // Data
  data: T[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRefetch?: () => void;

  // Search configuration
  searchPlaceholder?: string;
  searchFields: (keyof T | ((item: T) => string | undefined))[];

  // Filter configuration
  filters?: FilterConfig[];

  // Card renderer
  cardRenderer: React.ComponentType<{ data: T }>;

  // Empty state
  emptyIcon?: React.ReactNode;
  emptyTitle?: string | React.ReactNode;
  emptyDescription?: string | React.ReactNode;

  // Grid options
  rowHeight?: number | "auto";
  useTheme?: boolean;
  containerClassName?: string;

  // Results text
  itemName?: string; // e.g., "assets", "printers"
}

export function ListView<T extends Record<string, any>>({
  data = [],
  isLoading = false,
  isError = false,
  error = null,
  onRefetch,
  searchPlaceholder = "Search...",
  searchFields,
  filters = [],
  cardRenderer: CardRenderer,
  emptyIcon,
  emptyTitle = "No items found",
  emptyDescription = "Try adjusting your search or filters",
  rowHeight = "auto",
  useTheme = false,
  containerClassName = "",
  itemName = "items",
}: UniversalListViewProps<T>) {
  const isMobile = useIsMobile();
  const gridRef = useRef<any>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const theme = useTableTheme();
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // State
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>(Object.fromEntries(filters.map(f => [f.key, "all"])));
  const [cardHeight, setCardHeight] = useState(0);

  // Extract unique values for each filter
  const filterOptions = useMemo(() => {
    return filters.reduce(
      (acc, filter) => {
        const values = new Set<string>(data.map(item => filter.getValue(item)).filter((v): v is string => Boolean(v)));
        acc[filter.key] = Array.from(values).sort();
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }, [data, filters]);

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        searchFields.some(field => {
          const value = typeof field === "function" ? field(item) : String(item[field] || "");
          return value?.toLowerCase().includes(searchTerm.toLowerCase());
        });

      // Custom filters
      const matchesFilters = filters.every(filter => {
        const filterValue = filterValues[filter.key];
        if (filterValue === "all") return true;
        const itemValue = filter.getValue(item);
        return itemValue === filterValue;
      });

      return matchesSearch && matchesFilters;
    });
  }, [data, searchTerm, searchFields, filters, filterValues]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    return Object.values(filterValues).filter(v => v !== "all").length;
  }, [filterValues]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setFilterValues(Object.fromEntries(filters.map(f => [f.key, "all"])));
  }, [filters]);

  // Clear search only
  const clearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  // Update individual filter
  const updateFilter = useCallback((key: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  }, []);

  // Measure card height using ResizeObserver (for auto height mode)
  useEffect(() => {
    if (rowHeight !== "auto" || !cardRef.current) return;

    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    resizeObserverRef.current = new ResizeObserver(entries => {
      for (const entry of entries) {
        const height = entry.target.clientHeight;
        if (height > 0) {
          setCardHeight(height + 16); // Add padding
        }
      }
    });

    resizeObserverRef.current.observe(cardRef.current);

    const immediateHeight = cardRef.current.clientHeight;
    if (immediateHeight > 0) {
      setCardHeight(immediateHeight + 16);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [filteredData.length, rowHeight]);

  // Update grid when height changes
  useEffect(() => {
    if (gridRef.current && cardHeight > 0) {
      gridRef.current.api?.resetRowHeights();
    }
  }, [cardHeight]);

  // Full-width row renderer wrapper
  const FullWidthCellRenderer = useCallback(
    (props: any) => {
      const isFirstRow = props.rowIndex === 0;
      const itemData = props.data as T;

      return (
        <div ref={isFirstRow && rowHeight === "auto" ? cardRef : null}>
          <CardRenderer data={itemData} />
        </div>
      );
    },
    [CardRenderer, rowHeight],
  );

  // Column definitions (hidden, just for AG Grid structure)
  // add ag-grid types
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "id",
        hide: true,
      },
    ],
    [],
  );

  // Default column properties
  const defaultColDef = useMemo(
    () => ({
      flex: 1,
      minWidth: 100,
    }),
    [],
  );

  // Calculate row height
  const calculatedRowHeight = useMemo(() => {
    if (rowHeight === "auto") {
      return cardHeight > 0 ? cardHeight : isMobile ? 400 : 250;
    }
    return rowHeight;
  }, [rowHeight, cardHeight, isMobile]);

  // Grid options
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

  // Error state
  if (isError) {
    return (
      <Card className="m-8">
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <h2 className="text-lg font-semibold mb-2">Error Loading Data</h2>
            <p className="mb-4">{error instanceof Error ? error.message : "An error occurred"}</p>
            {onRefetch && (
              <Button variant={"destructive"} onClick={onRefetch}>
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Empty>
        {emptyIcon}
        <h3 className="text-lg font-semibold mb-2">Loading {itemName}...</h3>
        <Spinner />
      </Empty>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col ${containerClassName}`}>
      {/* Search and Filter Section */}
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="space-y-3">
          {/* Search Bar with Optional Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={searchPlaceholder} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-10" />
              {searchTerm && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={clearSearch}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Filter Popover (only show if filters exist) */}
            {filters.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 relative">
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filters</span>
                    {activeFiltersCount > 0 && (
                      <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
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

                    {/* Dynamic Filters */}
                    {filters.map(filter => (
                      <div key={filter.key} className="space-y-2">
                        <Label htmlFor={`${filter.key}-filter`} className="text-sm font-medium">
                          {filter.label}
                        </Label>
                        <Select value={filterValues[filter.key]} onValueChange={value => updateFilter(filter.key, value)}>
                          <SelectTrigger className="w-full" id={`${filter.key}-filter`}>
                            <SelectValue placeholder={`All ${filter.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All {filter.label.toLowerCase()}</SelectItem>
                            {filterOptions[filter.key]?.map(option => (
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

          {/* Results Count and Active Filters */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {filteredData.length} of {data.length} {itemName}
            </span>
            {activeFiltersCount > 0 && (
              <>
                <span>•</span>
                <div className="flex flex-wrap items-center gap-2">
                  {filters.map(filter => {
                    const value = filterValues[filter.key];
                    if (value === "all") return null;
                    return (
                      <Badge key={filter.key} variant="secondary" className="gap-1 cursor-pointer hover:bg-secondary/80" onClick={() => updateFilter(filter.key, "all")}>
                        {filter.label}: {value}
                        <X className="w-3 h-3" />
                      </Badge>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div className="flex-1 min-h-0 p-0">
        {filteredData.length === 0 ? (
          <Empty>
            {emptyIcon}
            <h3 className="text-lg font-semibold mb-2">{emptyTitle}</h3>
            <p className="text-muted-foreground mb-4">{emptyDescription}</p>
            {(searchTerm || activeFiltersCount > 0) && (
              <Button variant="outline" onClick={clearAllFilters}>
                Clear {searchTerm && activeFiltersCount > 0 ? "All" : searchTerm ? "Search" : "Filters"}
              </Button>
            )}
          </Empty>
        ) : (
          <div className="h-full w-full">
            <AgGridReact
              ref={gridRef}
              rowData={filteredData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              gridOptions={gridOptions}
              animateRows={true}
              suppressMenuHide={true}
              theme={useTheme ? theme : undefined}
              loading={isLoading}
              isFullWidthRow={() => true}
              fullWidthCellRenderer={FullWidthCellRenderer}
              rowHeight={calculatedRowHeight}
              onGridReady={params => setGridApi(params.api)}
              domLayout="normal"
            />
          </div>
        )}
      </div>
    </div>
  );
}
