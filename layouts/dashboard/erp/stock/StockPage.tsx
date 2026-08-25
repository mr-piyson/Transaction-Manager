"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowLeftRight,
  ClipboardPen,
  Filter,
  Package,
  Plus,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStockAdjustmentForm } from "@/components/dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

export default function StockPage() {
  const t = useTranslations();
  const { openCreate } = useStockAdjustmentForm();

  const [searchQuery, setSearchQuery] = useState("");
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [scrollReady, setScrollReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: warehouseList } = trpc.warehouses.list.useQuery({});
  const { data, isPending } = trpc.stock.list.useQuery({
    search: searchQuery.trim() || undefined,
    warehouseId: warehouseId ?? undefined,
    lowStock: lowStockOnly || undefined,
  });

  const stock = data ?? [];
  const activeFilterCount = [warehouseId, lowStockOnly ? "low" : null].filter(
    Boolean,
  ).length;

  const setScrollRef = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    setScrollReady(Boolean(node));
  }, []);
  const virtualizer = useVirtualizer({
    count: stock.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 64,
    overscan: 5,
  });

  useEffect(() => {
    if (scrollReady && stock.length > 0) {
      virtualizer.scrollToIndex(0);
    }
  }, [scrollReady, stock.length, virtualizer]);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto border-b px-4 py-2 shrink-0">
        <div className="flex min-w-max flex-1 flex-nowrap items-center gap-2">
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">
              {t("stock.adjustments.record")}
            </span>
          </Button>
          <InputGroup className="w-52 shrink-0 sm:w-64">
            <InputGroupAddon align="inline-start">
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={t("stock.searchStock")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="flex size-5 items-center justify-center rounded hover:bg-muted"
                >
                  <X className="size-3 text-muted-foreground" />
                </button>
              </InputGroupAddon>
            )}
          </InputGroup>
          <Button
            variant={lowStockOnly ? "secondary" : "outline"}
            size="sm"
            onClick={() => setLowStockOnly((v) => !v)}
          >
            <Filter className="size-3.5" />
            <span className="hidden sm:inline">{t("stock.lowStock")}</span>
          </Button>
        </div>
      </div>
      {/* Warehouse filter chips */}
      <div className="w-full min-w-0 border-b px-4 py-1.5 shrink-0 overflow-hidden">
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-1">
          <Filter className="size-3.5 text-muted-foreground shrink-0" />
          <button
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              warehouseId === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
            onClick={() => setWarehouseId(null)}
          >
            {t("common.all")}
          </button>
          {(warehouseList ?? []).map((wh) => (
            <button
              key={wh.id}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                warehouseId === wh.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
              onClick={() =>
                setWarehouseId((current) => (current === wh.id ? null : wh.id))
              }
            >
              {wh.name}
            </button>
          ))}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 shrink-0">
              {activeFilterCount}
            </Badge>
          )}
        </div>
      </div>
      {/* Virtualized list */}
      <div ref={setScrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div
          className="relative w-full"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const s = stock[virtualItem.index];
            return (
              <div
                key={s.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 w-full"
                style={{
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <div className="group flex items-center gap-3 px-4 py-2.5 border-b border-border/50 hover:bg-muted/40 cursor-default">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted">
                        {s.item.image ? (
                          // biome-ignore lint/performance/noImgElement: item images can be SVG/data URIs/external hosts that next/image cannot optimize; matches ItemListItem rendering
                          <img
                            src={s.item.image}
                            alt={s.item.name}
                            className="size-full rounded-md object-cover"
                          />
                        ) : (
                          <Package className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{s.item.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.item.sku ?? "—"} · {s.warehouse.name}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            "font-semibold tabular-nums",
                            s.quantity <= 0 && "text-destructive",
                          )}
                        >
                          {Number(s.quantity).toFixed(3)}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {s.item.unit ?? ""}
                          </span>
                        </p>
                        {s.isLowStock && (
                          <p className="text-xs text-destructive">
                            {t("stock.lowStock")}
                          </p>
                        )}
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() =>
                        openCreate({
                          itemId: s.item.id,
                          warehouseId: s.warehouse.id,
                        })
                      }
                    >
                      <ClipboardPen className="size-4 mr-2" />
                      {t("stock.adjustments.record")}
                    </ContextMenuItem>
                    <Link href={`/erp/warehouses/${s.warehouse.id}`}>
                      <ContextMenuItem>
                        <ArrowLeftRight className="size-4 mr-2" />
                        {t("stock.transfer")}
                      </ContextMenuItem>
                    </Link>
                  </ContextMenuContent>
                </ContextMenu>
              </div>
            );
          })}
        </div>
        {isPending && (
          <div className="p-4 text-center text-muted-foreground">…</div>
        )}
        {!isPending && stock.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <Package className="size-8 opacity-30" />
            <p>{t("stock.noStock")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
