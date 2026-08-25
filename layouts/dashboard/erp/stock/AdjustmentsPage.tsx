"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardPen,
  Eye,
  Plus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStockAdjustmentForm } from "@/components/dialogs";
import {
  AdjustmentDetailsSheet,
  type AdjustmentMovement,
} from "@/components/stock/adjustment-details-sheet";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/date";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

export default function AdjustmentsPage() {
  const t = useTranslations();
  const { openCreate } = useStockAdjustmentForm();

  const [direction, setDirection] = useState<string>("all");
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [reasonId, setReasonId] = useState<string>("all");
  const [selectedMovement, setSelectedMovement] =
    useState<AdjustmentMovement | null>(null);
  const [scrollReady, setScrollReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: warehouseList } = trpc.warehouses.list.useQuery({});
  const { data: reasonList } = trpc.stock.reasons.list.useQuery();
  const { data, isPending } = trpc.stock.adjustments.useQuery({
    direction:
      direction === "all"
        ? undefined
        : direction === "DECREASE"
          ? "DECREASE"
          : "INCREASE",
    warehouseId: warehouseId === "all" ? undefined : warehouseId,
    reasonId: reasonId === "all" ? undefined : reasonId,
  });

  const movements = (data ?? []) as unknown as AdjustmentMovement[];

  const setScrollRef = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    setScrollReady(Boolean(node));
  }, []);
  const virtualizer = useVirtualizer({
    count: movements.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 64,
    overscan: 5,
  });

  useEffect(() => {
    if (scrollReady && movements.length > 0) {
      virtualizer.scrollToIndex(0);
    }
  }, [scrollReady, movements.length, virtualizer]);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto border-b px-4 py-2 shrink-0">
        <Button size="sm" onClick={() => openCreate()}>
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">
            {t("stock.adjustments.record")}
          </span>
        </Button>
        <Select value={direction} onValueChange={setDirection}>
          <SelectTrigger className="w-36 shrink-0" aria-label="Direction">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            <SelectItem value="DECREASE">
              {t("stock.adjustments.writeOffs")}
            </SelectItem>
            <SelectItem value="INCREASE">
              {t("stock.adjustments.increases")}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={reasonId} onValueChange={setReasonId}>
          <SelectTrigger className="w-40 shrink-0" aria-label="Reason">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("stock.allReasons")}</SelectItem>
            {(reasonList ?? []).map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger className="w-40 shrink-0" aria-label="Warehouse">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {(warehouseList ?? []).map((wh) => (
              <SelectItem key={wh.id} value={wh.id}>
                {wh.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Virtualized list */}
      <div ref={setScrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div
          className="relative w-full"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const m = movements[virtualItem.index];
            const isDecrease = Number(m.quantity) < 0;
            const warehouseName =
              m.fromWarehouse?.name ?? m.toWarehouse?.name ?? "—";
            return (
              <div
                key={m.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 w-full"
                style={{
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setSelectedMovement(m)}
                      className="block h-full w-full text-left"
                    >
                      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 hover:bg-muted/40">
                        <div
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-full",
                            isDecrease
                              ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                              : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
                          )}
                        >
                          {isDecrease ? (
                            <ArrowUpRight className="size-4" />
                          ) : (
                            <ArrowDownRight className="size-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{m.item.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.adjustmentReason?.name ??
                              t(`stock.movementTypes.${m.type}`)}{" "}
                            · {warehouseName}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={cn(
                              "font-semibold tabular-nums",
                              isDecrease
                                ? "text-destructive"
                                : "text-green-600 dark:text-green-400",
                            )}
                          >
                            {isDecrease ? "" : "+"}
                            {Number(m.quantity).toFixed(3)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => setSelectedMovement(m)}>
                      <Eye className="size-4 mr-2" />
                      {t("common.viewDetails")}
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() =>
                        openCreate({
                          itemId: m.item.id,
                          warehouseId: m.fromWarehouse?.id ?? m.toWarehouse?.id,
                        })
                      }
                    >
                      <ClipboardPen className="size-4 mr-2" />
                      {t("stock.adjustments.record")}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </div>
            );
          })}
        </div>
        {isPending && (
          <div className="p-4 text-center text-muted-foreground">…</div>
        )}
        {!isPending && movements.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <ClipboardPen className="size-8 opacity-30" />
            <p>{t("stock.adjustments.empty")}</p>
            <Button size="sm" variant="outline" onClick={() => openCreate()}>
              <Plus className="size-3.5 mr-1" />
              {t("stock.adjustments.record")}
            </Button>
          </div>
        )}
      </div>

      <AdjustmentDetailsSheet
        movement={selectedMovement}
        onOpenChange={(open) => {
          if (!open) setSelectedMovement(null);
        }}
      />
    </div>
  );
}
