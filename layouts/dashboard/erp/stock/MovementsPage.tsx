"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
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

const MOVEMENT_TYPES = [
  "PURCHASE_INBOUND",
  "SALE_OUTBOUND",
  "RETURN_INBOUND",
  "RETURN_OUTBOUND",
  "ADJUSTMENT_UP",
  "ADJUSTMENT_DOWN",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "OPENING_BALANCE",
  "DAMAGE",
  "ASSEMBLY_CONSUME",
  "ASSEMBLY_PRODUCE",
] as const;

function directionOf(type: string): "in" | "out" | "neutral" {
  if (
    [
      "PURCHASE_INBOUND",
      "RETURN_INBOUND",
      "ADJUSTMENT_UP",
      "TRANSFER_IN",
      "ASSEMBLY_PRODUCE",
    ].includes(type)
  ) {
    return "in";
  }
  if (
    [
      "SALE_OUTBOUND",
      "RETURN_OUTBOUND",
      "ADJUSTMENT_DOWN",
      "DAMAGE",
      "TRANSFER_OUT",
      "ASSEMBLY_CONSUME",
    ].includes(type)
  ) {
    return "out";
  }
  return "neutral";
}

export default function MovementsPage() {
  const t = useTranslations();

  const [type, setType] = useState<string>("all");
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [scrollReady, setScrollReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: warehouseList } = trpc.warehouses.list.useQuery({});
  const { data, isPending } = trpc.stock.movements.useQuery({
    type: type === "all" ? undefined : type,
    warehouseId: warehouseId === "all" ? undefined : warehouseId,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const movements = data ?? [];

  const setScrollRef = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    setScrollReady(Boolean(node));
  }, []);
  const virtualizer = useVirtualizer({
    count: movements.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  useEffect(() => {
    if (scrollReady && movements.length > 0) {
      virtualizer.scrollToIndex(0);
    }
  }, [scrollReady, movements.length, virtualizer]);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Filters */}
      <div className="flex w-full items-center gap-2 border-b px-4 py-2 shrink-0 overflow-x-auto">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-44 shrink-0" aria-label="Movement type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("stock.allTypes")}</SelectItem>
            {MOVEMENT_TYPES.map((mt) => (
              <SelectItem key={mt} value={mt}>
                {t(`stock.movementTypes.${mt}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger className="w-44 shrink-0" aria-label="Warehouse">
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
            const dir = directionOf(m.type);
            const warehouseName =
              m.fromWarehouse?.name && m.toWarehouse?.name
                ? `${m.fromWarehouse.name} → ${m.toWarehouse.name}`
                : (m.toWarehouse?.name ?? m.fromWarehouse?.name ?? "—");
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
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50">
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full",
                      dir === "in"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                        : dir === "out"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {dir === "in" ? (
                      <ArrowDownRight className="size-4" />
                    ) : dir === "out" ? (
                      <ArrowUpRight className="size-4" />
                    ) : (
                      <ArrowLeftRight className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t(`stock.movementTypes.${m.type}`)} · {warehouseName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "font-semibold tabular-nums",
                        Number(m.quantity) > 0 &&
                          "text-green-600 dark:text-green-400",
                        Number(m.quantity) < 0 && "text-destructive",
                      )}
                    >
                      {Number(m.quantity) > 0 ? "+" : ""}
                      {Number(m.quantity).toFixed(3)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {isPending && (
          <div className="p-4 text-center text-muted-foreground">…</div>
        )}
        {!isPending && movements.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {t("common.noResults")}
          </div>
        )}
      </div>
    </div>
  );
}
