"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Package, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
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

export interface StockAdjustmentItemSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: any[];
  isLoading: boolean;
  onSelect: (item: any) => void;
}

export function StockAdjustmentItemSelectDialog({
  open,
  onOpenChange,
  items,
  isLoading,
  onSelect,
}: StockAdjustmentItemSelectDialogProps) {
  const t = useTranslations();
  const [search, setSearch] = React.useState("");
  const [scrollReady, setScrollReady] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const setScrollRef = React.useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    if (node) {
      setScrollReady(true);
    }
  }, []);

  const filtered = React.useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item: any) =>
          item.name?.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q) ||
          item.barcode?.toLowerCase().includes(q),
      );
    }
    return [...result].sort(
      (a: any, b: any) =>
        (Number(b.totalStock) || 0) - (Number(a.totalStock) || 0),
    );
  }, [items, search]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  React.useEffect(() => {
    if (open) {
      setSearch("");
      setScrollReady(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (scrollReady && filtered.length > 0) {
      virtualizer.scrollToIndex(0);
    }
  }, [scrollReady, filtered.length, virtualizer]);

  const handleSelect = (item: any) => {
    onSelect(item);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl gap-0 p-0 h-dvh sm:h-auto sm:max-h-[85vh] max-w-full sm:rounded-lg flex flex-col">
        <DialogHeader className="shrink-0 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          <DialogTitle>{t("stock.adjustments.selectItemTitle")}</DialogTitle>
          <DialogDescription>
            {t("stock.adjustments.selectItemDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="shrink-0 flex items-center gap-2 border-t border-b px-4 py-2.5 sm:px-6 sm:py-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("stock.adjustments.searchItems")}
            className="flex-1 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("common.clear")}
            </button>
          )}
        </div>

        {/* Virtualized list */}
        <div ref={setScrollRef} className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Package className="size-8 opacity-30" />
              <p>{search ? t("common.noResults") : t("items.noItems")}</p>
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
                    onClick={() => handleSelect(item)}
                    className="flex items-center gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-3 cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/30"
                  >
                    {/* Image preview */}
                    <div className="size-8 shrink-0 overflow-hidden rounded-md border bg-muted sm:size-10">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
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
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="font-mono truncate">{item.sku}</span>
                      </div>
                    </div>

                    {/* Stock */}
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <span
                        className={cn(
                          "text-xs tabular-nums",
                          item.isLowStock
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {stock} {t("invoices.stock").toLowerCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 px-4 py-3 border-t sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
          >
            {t("common.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
