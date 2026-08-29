"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Package, SearchIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface POItemSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: any[];
  isLoading: boolean;
  existingItemIds: string[];
  singleSelect?: boolean;
  onSelect: (items: any[]) => void;
}

export function POItemSelectDialog({
  open,
  onOpenChange,
  items,
  isLoading,
  existingItemIds,
  singleSelect = false,
  onSelect,
}: POItemSelectDialogProps) {
  const t = useTranslations();
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [scrollReady, setScrollReady] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const setScrollRef = React.useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    if (node) {
      setScrollReady(true);
    }
  }, []);

  const existingSet = React.useMemo(
    () => new Set(existingItemIds),
    [existingItemIds],
  );

  const availableCategories = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const item of items as any[]) {
      if (item.category && !map.has(item.category.id)) {
        map.set(item.category.id, item.category);
      }
    }
    return [...map.values()].sort((a: any, b: any) =>
      a.name.localeCompare(b.name),
    );
  }, [items]);

  const filtered = React.useMemo(() => {
    let list = items;
    if (categoryFilter === "others") {
      list = list.filter((item: any) => !item.category);
    } else if (categoryFilter !== "all") {
      list = list.filter((item: any) => item.category?.id === categoryFilter);
    }
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (item: any) =>
        item.name?.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.barcode?.toLowerCase().includes(q),
    );
  }, [items, search, categoryFilter]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  React.useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSearch("");
      setCategoryFilter("all");
      setScrollReady(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (scrollReady && filtered.length > 0) {
      virtualizer.scrollToIndex(0);
    }
  }, [scrollReady, filtered.length, virtualizer]);

  const toggleItem = (itemId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleAdd = () => {
    const selectedItems = items.filter(
      (item: any) => selected.has(item.id) && !existingSet.has(item.id),
    );
    onSelect(selectedItems);
  };

  const handleRowClick = (item: any, isExisting: boolean) => {
    if (singleSelect) {
      if (isExisting) return;
      onSelect([item]);
      onOpenChange(false);
      return;
    }
    if (!isExisting) toggleItem(item.id);
  };

  const availableCount = [...selected].filter(
    (id) => !existingSet.has(id),
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-picker-dialog
        className="sm:max-w-2xl gap-0 p-0 h-dvh sm:h-auto sm:max-h-[85vh] max-w-full sm:rounded-lg flex flex-col"
      >
        <DialogHeader className="shrink-0 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          <DialogTitle>Select Items</DialogTitle>
          <DialogDescription>
            Search and select products to add to this purchase order.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="shrink-0 flex items-center gap-2 border-t border-b px-4 py-2.5 sm:px-6 sm:py-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or barcode..."
            className="flex-1 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="shrink-0 flex items-center gap-2 border-b px-4 pt-2 pb-3 sm:px-6 overflow-x-auto overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
          <button
            type="button"
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              categoryFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
            onClick={() => setCategoryFilter("all")}
          >
            {t("common.all")}
          </button>
          <button
            type="button"
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              categoryFilter === "others"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
            onClick={() => setCategoryFilter("others")}
          >
            {t("common.other")}
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
                categoryFilter === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
              onClick={() =>
                setCategoryFilter((current) =>
                  current === cat.id ? "all" : cat.id,
                )
              }
            >
              {cat.color && (
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
              )}
              {cat.name}
            </button>
          ))}
        </div>

        {/* Virtualized list */}
        <div ref={setScrollRef} className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading items...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Package className="size-8 opacity-30" />
              <p>
                {search ? "No items match your search." : "No items available."}
              </p>
            </div>
          ) : (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: "relative",
                width: "100%",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const item = filtered[virtualRow.index] as any;
                const isExisting = existingSet.has(item.id);
                const isSelected = selected.has(item.id);
                const supplierItem = item.supplierItems?.[0];
                const price =
                  Number(supplierItem?.basePrice ?? item.purchasePrice) || 0;
                const stock = Number(item.totalStock) ?? 0;

                return (
                  <div
                    key={item.id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => handleRowClick(item, isExisting)}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-3 cursor-pointer border-b border-border/50 transition-colors",
                      isExisting
                        ? "opacity-40 cursor-not-allowed bg-muted/20"
                        : isSelected
                          ? "bg-accent/50"
                          : "hover:bg-accent/30",
                    )}
                  >
                    {/* Checkbox */}
                    {!singleSelect && (
                      <div
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                          isExisting
                            ? "border-muted-foreground/30 bg-muted"
                            : isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border",
                        )}
                      >
                        {(isSelected || isExisting) && (
                          <Check className="size-3" />
                        )}
                      </div>
                    )}

                    {/* Image preview */}
                    <div className="size-8 shrink-0 overflow-hidden rounded-md border bg-muted sm:size-10">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={80}
                          height={80}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <Package className="size-3.5 text-muted-foreground/40 sm:size-4" />
                        </div>
                      )}
                    </div>

                    {/* Item details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="font-medium text-sm truncate">
                          {item.name}
                        </span>
                        {isExisting && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 shrink-0"
                          >
                            Added
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono">{item.sku}</span>
                        {item.category && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {item.category.name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Price + Stock — compact layout */}
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <span className="text-sm font-medium tabular-nums">
                        {price.toFixed(3)}
                      </span>
                      <span
                        className={cn(
                          "text-xs tabular-nums",
                          item.isLowStock
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {stock} in stock
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 px-4 py-3 border-t sm:px-6 sm:py-4 flex-col sm:flex-row gap-2 sm:gap-0">
          {singleSelect ? (
            <div className="flex gap-2 sm:ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <span className="text-sm text-muted-foreground shrink-0">
                {selected.size > 0 ? (
                  <>
                    {availableCount} item{availableCount !== 1 ? "s" : ""}{" "}
                    selected
                  </>
                ) : (
                  "Tap items to select"
                )}
              </span>
              <div className="flex gap-2 sm:ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleAdd}
                  disabled={availableCount === 0}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Add {availableCount > 0 ? `${availableCount} ` : ""}item
                  {availableCount !== 1 ? "s" : ""}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
