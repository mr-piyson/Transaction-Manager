"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDirection } from "@/components/ui/direction";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type ListViewSearchField<T> =
  | keyof T
  | string
  | {
      key: string;
      label?: string;
      getValue: (item: T) => unknown;
    };

export interface ListViewSearchConfig<T> {
  fields: ListViewSearchField<T>[];
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  collapsible?: boolean;
  /** Override the default case-insensitive text matching for domain-specific search. */
  filter?: (item: T, query: string, field: string | "__all__") => boolean;
}

export interface ListViewProps<T> {
  data: T[];
  isLoading?: boolean;
  className?: string;
  rowHeight?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  cardRenderer: (item: T) => React.ReactNode;
  getItemKey?: (item: T, index: number) => React.Key;
  search?: ListViewSearchConfig<T>;
  /** Content anchored at the logical start of the list toolbar. */
  toolbarStart?: React.ReactNode;
  /** Content shown after the search control in the list toolbar. */
  toolbarEnd?: React.ReactNode;
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

function getDefaultItemKey(item: object, index: number): React.Key {
  const id = (item as { id?: unknown }).id;
  return typeof id === "string" || typeof id === "number" ? id : index;
}

function normalizeSearchFields<T>(fields: ListViewSearchField<T>[]) {
  return fields.map((field) => {
    if (typeof field === "object") return field;
    const key = String(field);
    return {
      key,
      label: key,
      getValue: (item: T) => getNestedValue(item, key),
    };
  });
}

export function ListView<T extends object>({
  data,
  isLoading = false,
  className,
  rowHeight = 72,
  emptyTitle = "No items found",
  emptyDescription,
  emptyIcon,
  cardRenderer,
  getItemKey,
  search: searchConfig,
  toolbarStart,
  toolbarEnd,
}: ListViewProps<T>) {
  const [uncontrolledSearch, setUncontrolledSearch] = useState("");
  const [searchField, setSearchField] = useState("__all__");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrollReady, setScrollReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dir = useDirection();
  const isRtl = dir === "rtl";
  const fields = useMemo(
    () => normalizeSearchFields(searchConfig?.fields ?? []),
    [searchConfig?.fields],
  );
  const isSearchEnabled = fields.length > 0;
  const search = searchConfig?.value ?? uncontrolledSearch;
  const searchPlaceholderText = searchConfig?.placeholder ?? "Search...";
  const isCollapsibleSearch = searchConfig?.collapsible ?? false;

  const setSearch = useCallback(
    (value: string) => {
      if (searchConfig?.value === undefined) setUncontrolledSearch(value);
      searchConfig?.onValueChange?.(value);
    },
    [searchConfig],
  );

  const setScrollRef = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    if (node) {
      setScrollReady(true);
    }
  }, []);

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;

    const query = search.toLowerCase();
    const fieldsToSearch =
      searchField === "__all__"
        ? fields
        : fields.filter((field) => field.key === searchField);

    if (searchConfig?.filter) {
      return data.filter((item) =>
        searchConfig.filter!(item, query, searchField),
      );
    }

    return data.filter((item) =>
      fieldsToSearch.some((field) => {
        const value = field.getValue(item);
        return value != null && String(value).toLowerCase().includes(query);
      }),
    );
  }, [data, fields, search, searchConfig, searchField]);

  const virtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  useEffect(() => {
    if (scrollReady && filteredData.length > 0) {
      virtualizer.scrollToIndex(0);
    }
  }, [scrollReady, filteredData.length, virtualizer]);

  const showSearch = isSearchEnabled && (!isCollapsibleSearch || isSearchOpen);
  const closeSearch = () => {
    setSearch("");
    setIsSearchOpen(false);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex h-14 shrink-0 items-center gap-1.5 border-b px-3">
        {toolbarStart}
        {showSearch ? (
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
              isRtl ? "flex-row-reverse" : "flex-row",
            )}
          >
            {fields.length > 1 && (
              <Select value={searchField} onValueChange={setSearchField}>
                <SelectTrigger
                  size="sm"
                  className={cn(
                    "h-8 w-auto shrink-0 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0",
                    isRtl ? "border-l" : "border-r",
                  )}
                >
                  <SelectValue
                    placeholder={isRtl ? "جميع الحقول" : "All fields"}
                  />
                </SelectTrigger>
                <SelectContent align={isRtl ? "end" : "start"}>
                  <SelectItem value="__all__">
                    {isRtl ? "جميع الحقول" : "All fields"}
                  </SelectItem>
                  {fields.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label ?? field.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="relative flex-1">
              <Search
                className={cn(
                  "absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
                  isRtl ? "right-2.5" : "left-2.5",
                )}
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholderText}
                className={cn(
                  "h-8 border-0 bg-transparent shadow-none focus-visible:ring-0",
                  isRtl ? "pr-8 text-right" : "pl-8",
                )}
              />
            </div>
            {isCollapsibleSearch && (
              <button
                type="button"
                onClick={closeSearch}
                className="mr-1 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="Close search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}
        {toolbarEnd}
        {isSearchEnabled && isCollapsibleSearch && !isSearchOpen && (
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label={searchPlaceholderText}
          >
            <Search className="size-4" />
          </button>
        )}
      </div>
      <div ref={setScrollRef} className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : filteredData.length === 0 ? (
          <Empty className="p-6">
            {emptyIcon && <>{emptyIcon}</>}
            <EmptyContent>
              <EmptyTitle>{emptyTitle}</EmptyTitle>
              {emptyDescription && (
                <EmptyDescription>{emptyDescription}</EmptyDescription>
              )}
            </EmptyContent>
          </Empty>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: "relative",
              width: "100%",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const item = filteredData[virtualRow.index];
              return (
                <div
                  key={
                    getItemKey?.(item, virtualRow.index) ??
                    getDefaultItemKey(item, virtualRow.index)
                  }
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="border-b border-border/50"
                >
                  {cardRenderer(item)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
