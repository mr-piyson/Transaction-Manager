"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { SearchIcon, Truck } from "lucide-react";
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

export interface SupplierSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: any[];
  isLoading: boolean;
  onSelect: (supplier: any) => void;
}

export function SupplierSelectDialog({
  open,
  onOpenChange,
  suppliers,
  isLoading,
  onSelect,
}: SupplierSelectDialogProps) {
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
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(
      (s: any) =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q) ||
        s.contactName?.toLowerCase().includes(q),
    );
  }, [suppliers, search]);

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

  const handleSelect = (supplier: any) => {
    onSelect(supplier);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 h-[100dvh] sm:h-auto sm:max-h-[85vh] max-w-full sm:rounded-lg flex flex-col">
        <DialogHeader className="shrink-0 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          <DialogTitle>Select Supplier</DialogTitle>
          <DialogDescription>
            Search and select a supplier for this purchase order.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="shrink-0 flex items-center gap-2 border-t border-b px-4 py-2.5 sm:px-6 sm:py-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, or code..."
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

        {/* Virtualized list */}
        <div ref={setScrollRef} className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading suppliers...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Truck className="size-8 opacity-30" />
              <p>
                {search
                  ? "No suppliers match your search."
                  : "No suppliers available."}
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
                const supplier = filtered[virtualRow.index] as any;
                const itemCount = supplier._count?.supplierItems ?? 0;

                return (
                  <div
                    key={supplier.id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => handleSelect(supplier)}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-3 cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/30",
                    )}
                  >
                    {/* Avatar */}
                    <div className="size-8 shrink-0 overflow-hidden rounded-full border bg-muted sm:size-10">
                      <div className="flex size-full items-center justify-center">
                        <Truck className="size-4 text-muted-foreground/50 sm:size-5" />
                      </div>
                    </div>

                    {/* Supplier details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="font-medium text-sm truncate">
                          {supplier.name}
                        </span>
                        {supplier.code && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {supplier.code}
                          </span>
                        )}
                        {!supplier.isActive && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 shrink-0"
                          >
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-muted-foreground mt-0.5">
                        {supplier.contactName && (
                          <span className="truncate">
                            {supplier.contactName}
                          </span>
                        )}
                        {supplier.contactName && supplier.email && (
                          <span className="text-border">·</span>
                        )}
                        {supplier.email && (
                          <span className="truncate">{supplier.email}</span>
                        )}
                        {!supplier.contactName &&
                          !supplier.email &&
                          supplier.phone && <span>{supplier.phone}</span>}
                      </div>
                    </div>

                    {/* Item count */}
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <span className="text-sm font-medium tabular-nums">
                        {itemCount}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        items
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
            className="sm:ml-auto"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
