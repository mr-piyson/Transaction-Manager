"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ClipboardPen,
  Coins,
  Hash,
  Package,
  Tag,
  User,
  Warehouse,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";

export interface AdjustmentMovement {
  id: string;
  type: string;
  quantity: number;
  unitCost: number | null;
  notes: string | null;
  createdAt: string | Date;
  item: { id: string; sku: string | null; name: string; unit?: string | null };
  fromWarehouse?: { id: string; name: string } | null;
  toWarehouse?: { id: string; name: string } | null;
  user?: { id: string; name: string | null } | null;
  adjustmentReason?: {
    id: string;
    name: string;
    direction: "INCREASE" | "DECREASE";
  } | null;
}

interface AdjustmentDetailsSheetProps {
  movement: AdjustmentMovement | null;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Tag;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        <span>{label}</span>
      </div>
      <span className="max-w-[60%] truncate text-right text-sm font-medium">
        {value}
      </span>
    </div>
  );
}

export function AdjustmentDetailsSheet({
  movement,
  onOpenChange,
}: AdjustmentDetailsSheetProps) {
  const t = useTranslations();

  const isDecrease = Number(movement?.quantity ?? 0) < 0;
  const warehouseName =
    movement?.fromWarehouse?.name ?? movement?.toWarehouse?.name ?? "—";
  const value =
    movement?.unitCost != null
      ? Math.abs(Number(movement.quantity)) * Number(movement.unitCost)
      : null;

  return (
    <Sheet open={!!movement} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {t("stock.adjustments.detailsTitle")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("stock.adjustments.dialogDesc")}
          </SheetDescription>
        </SheetHeader>

        {movement && (
          <div className="space-y-4 px-4 pb-6">
            {/* Direction + quantity */}
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg border p-4",
                isDecrease ? "border-destructive/30" : "border-green-600/30",
              )}
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  isDecrease
                    ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                    : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
                )}
              >
                {isDecrease ? (
                  <ArrowUpRight className="size-5" />
                ) : (
                  <ArrowDownRight className="size-5" />
                )}
              </div>
              <div>
                <p className="text-xl font-semibold tabular-nums">
                  {isDecrease ? "" : "+"}
                  {Number(movement.quantity).toFixed(3)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {movement.item.unit ?? ""}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(`stock.movementTypes.${movement.type}`)}
                </p>
              </div>
            </div>

            {/* Details card */}
            <div className="rounded-lg border divide-y">
              <DetailRow
                icon={Package}
                label={t("common.item")}
                value={
                  <span className="inline-flex items-center gap-2">
                    {movement.item.name}
                    {movement.item.sku && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {movement.item.sku}
                      </span>
                    )}
                  </span>
                }
              />
              <DetailRow
                icon={Tag}
                label={t("stock.reason")}
                value={
                  movement.adjustmentReason ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        isDecrease &&
                          "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                        !isDecrease &&
                          "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                      )}
                    >
                      {movement.adjustmentReason.name}
                    </Badge>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailRow
                icon={Warehouse}
                label={t("common.warehouse")}
                value={warehouseName}
              />
              <DetailRow
                icon={Coins}
                label={t("stock.adjustments.unitCost")}
                value={
                  movement.unitCost != null
                    ? `${Number(movement.unitCost).toFixed(3)}${
                        value != null
                          ? ` · ${value.toFixed(3)} ${t("stock.adjustments.total")}`
                          : ""
                      }`
                    : "—"
                }
              />
              <DetailRow
                icon={User}
                label={t("common.user")}
                value={movement.user?.name ?? "—"}
              />
              <DetailRow
                icon={CalendarDays}
                label={t("common.date")}
                value={formatDateTime(movement.createdAt)}
              />
              {movement.notes && (
                <DetailRow
                  icon={Hash}
                  label={t("common.notes")}
                  value={movement.notes}
                />
              )}
            </div>

            {/* Reference */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <ClipboardPen className="size-3.5" />
                {t("stock.adjustments.immutableNote")}
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
