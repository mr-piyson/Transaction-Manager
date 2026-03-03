"use client";

import { Filter, Search, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

// Filter configuration type
export interface FilterConfig {
  key: string;
  label: string;
  getValue: (item: any) => string | undefined;
}

// Props interface
export interface SelectDialogProps<T = any> {
  // Dialog
  children: React.ReactNode; // trigger
  title?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  // Selection
  onSelect: (item: T) => void;

  // Data
  data: T[] | undefined;
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
  cardRenderer: React.ComponentType<{ data: T; isHighlighted?: boolean }>;

  // Empty state
  emptyTitle?: string | React.ReactNode;
  emptyDescription?: string | React.ReactNode;

  // Results text
  itemName?: string;
}

export function SelectDialog<T extends Record<string, any>>({
  children,
  title = "Select item",
  open: controlledOpen,
  onOpenChange,
  onSelect,
  data = [],
  isLoading = false,
  isError = false,
  error = null,
  onRefetch,
  searchPlaceholder = "Search...",
  searchFields,
  filters = [],
  cardRenderer: CardRenderer,
  emptyTitle = "No items found",
  emptyDescription = "Try adjusting your search or filters",
  itemName = "items",
}: SelectDialogProps<T>) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (val: boolean) => {
      if (!isControlled) setInternalOpen(val);
      onOpenChange?.(val);
    },
    [isControlled, onOpenChange],
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    Object.fromEntries(filters.map((f) => [f.key, "all"])),
  );
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setFilterValues(Object.fromEntries(filters.map((f) => [f.key, "all"])));
      setHighlightedIndex(-1);
      // Focus search input after dialog animation
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Extract unique filter options
  const filterOptions = useMemo(() => {
    return filters.reduce(
      (acc, filter) => {
        const values = new Set<string>(
          data
            .map((item) => filter.getValue(item))
            .filter((v): v is string => Boolean(v)),
        );
        acc[filter.key] = Array.from(values).sort();
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }, [data, filters]);

  // Filter data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        searchFields.some((field) => {
          const value =
            typeof field === "function"
              ? field(item)
              : String(item[field] || "");
          return value?.toLowerCase().includes(searchTerm.toLowerCase());
        });

      const matchesFilters = filters.every((filter) => {
        const filterValue = filterValues[filter.key];
        if (filterValue === "all") return true;
        return filter.getValue(item) === filterValue;
      });

      return matchesSearch && matchesFilters;
    });
  }, [data, searchTerm, searchFields, filters, filterValues]);

  // Reset highlight when filtered data changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredData.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-list-item]");
    items[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const activeFiltersCount = useMemo(
    () => Object.values(filterValues).filter((v) => v !== "all").length,
    [filterValues],
  );

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterValues(Object.fromEntries(filters.map((f) => [f.key, "all"])));
  };

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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (filteredData.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredData.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredData.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredData.length) {
            handleSelect(filteredData[highlightedIndex]);
          }
          break;
        case "Escape":
          setOpen(false);
          break;
      }
    },
    [filteredData, highlightedIndex, handleSelect, setOpen],
  );

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger
        render={<span>{children ?? <Button>Select</Button>}</span>}
      ></DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Search + Filters */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="flex gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchTerm("")}
                  tabIndex={-1}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Filter Popover */}
            {filters.length > 0 && (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className="gap-2 relative shrink-0"
                    >
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="h-8 text-xs"
                        >
                          Clear all
                        </Button>
                      )}
                    </div>
                    <Separator />
                    {filters.map((filter) => (
                      <div key={filter.key} className="space-y-2">
                        <Label
                          htmlFor={`${filter.key}-filter`}
                          className="text-sm font-medium"
                        >
                          {filter.label}
                        </Label>
                        <Select
                          value={filterValues[filter.key]}
                          onValueChange={(value) =>
                            updateFilter(filter.key, value)
                          }
                        >
                          <SelectTrigger
                            className="w-full"
                            id={`${filter.key}-filter`}
                          >
                            <SelectValue
                              placeholder={`All ${filter.label.toLowerCase()}`}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              All {filter.label.toLowerCase()}
                            </SelectItem>
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

          {/* Active filter badges */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.map((filter) => {
                const value = filterValues[filter.key];
                if (value === "all") return null;
                return (
                  <Badge
                    key={filter.key}
                    variant="secondary"
                    className="gap-1 cursor-pointer hover:bg-secondary/80"
                    onClick={() => updateFilter(filter.key, "all")}
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

        {/* Results count */}
        <div className="px-4 py-1.5 shrink-0">
          <p className="text-xs text-muted-foreground">
            {filteredData.length}{" "}
            {filteredData.length === 1 ? itemName.replace(/s$/, "") : itemName}
            {highlightedIndex >= 0 && (
              <span className="ml-2 text-muted-foreground/60">
                · Use ↑↓ to navigate, Enter to select
              </span>
            )}
          </p>
        </div>

        {/* List */}
        <div ref={listRef} className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <Spinner />
              <p className="text-sm">Loading {itemName}...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
              <p className="text-sm font-medium text-destructive">
                Error loading data
              </p>
              <p className="text-xs text-muted-foreground">
                {error instanceof Error ? error.message : "An error occurred"}
              </p>
              {onRefetch && (
                <Button variant="destructive" size="sm" onClick={onRefetch}>
                  Try Again
                </Button>
              )}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-6">
              <p className="text-sm font-medium">{emptyTitle}</p>
              <p className="text-xs text-muted-foreground">
                {emptyDescription}
              </p>
              {(searchTerm || activeFiltersCount > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={clearAllFilters}
                >
                  Clear{" "}
                  {searchTerm && activeFiltersCount > 0
                    ? "All"
                    : searchTerm
                      ? "Search"
                      : "Filters"}
                </Button>
              )}
            </div>
          ) : (
            <div className="py-1">
              {filteredData.map((item, index) => {
                const isHighlighted = index === highlightedIndex;
                return (
                  <div
                    key={index}
                    data-list-item
                    data-highlighted={isHighlighted}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      cursor-pointer transition-colors
                      ${isHighlighted ? "bg-accent" : "hover:bg-accent/50"}
                    `}
                  >
                    <CardRenderer data={item} isHighlighted={isHighlighted} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
