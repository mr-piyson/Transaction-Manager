import { Box, type Package, Wrench } from "lucide-react";
import { type HTMLAttributes, useState } from "react";
import { useCurrency } from "@/hooks/use-currency";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ItemListItemProps extends HTMLAttributes<HTMLDivElement> {
  data?: any;
}

const TYPE_STYLES: Record<
  string,
  { icon: typeof Package; bg: string; fg: string }
> = {
  PRODUCT: {
    icon: Box,
    bg: "bg-sky-100 dark:bg-sky-900/40",
    fg: "text-sky-700 dark:text-sky-300",
  },
  SERVICE: {
    icon: Wrench,
    bg: "bg-orange-100 dark:bg-orange-900/40",
    fg: "text-orange-700 dark:text-orange-300",
  },
};

const STOCK_STYLES = {
  OUT_OF_STOCK: {
    label: "Out of stock",
    textColor: "text-destructive",
  },
  BELOW_MINIMUM: {
    label: "Below minimum",
    textColor: "text-destructive",
  },
  REORDER_SOON: {
    label: "Reorder soon",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  IN_STOCK: {
    label: "In stock",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
} as const;

export function ItemListItem({ data, className, ...props }: ItemListItemProps) {
  const {
    name,
    sku,
    type,
    image,
    totalStock,
    minStock,
    reorderPoint,
    unit,
    salesPrice,
  } = data || {};
  const [imgError, setImgError] = useState(false);
  const style = TYPE_STYLES[type as string] ?? TYPE_STYLES.PRODUCT;
  const Icon = style.icon;
  const { format: formatCurrency } = useCurrency();
  const stock = Number(totalStock ?? 0);
  const stockStatus =
    stock <= 0
      ? STOCK_STYLES.OUT_OF_STOCK
      : stock <= Number(minStock ?? 0)
        ? STOCK_STYLES.BELOW_MINIMUM
        : stock <= Number(reorderPoint ?? 0)
          ? STOCK_STYLES.REORDER_SOON
          : STOCK_STYLES.IN_STOCK;

  const showPrice = salesPrice != null && Number(salesPrice) > 0;

  return (
    <div
      className={cn(
        "relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3",
        className,
      )}
      {...props}
    >
      {/* Icon / image */}
      <div
        className={cn(
          "size-11 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-inset ring-foreground/5",
          style.bg,
        )}
      >
        {image && !imgError ? (
          <img
            src={image}
            alt={name}
            className="size-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Icon className={cn("size-5", style.fg)} />
        )}
      </div>

      {/* Name + SKU */}
      <div className="min-w-0 space-y-1">
        <p className="min-w-0 truncate text-[15px] font-semibold leading-5">
          {name}
        </p>
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {sku ?? "—"}
        </p>
      </div>

      {/* Price + status badge */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        {showPrice && (
          <p className="text-sm font-semibold tabular-nums">
            {formatCurrency(salesPrice)}
          </p>
        )}
        <Badge
          variant="outline"
          className="gap-1.5 text-[11px] bg-muted/50 whitespace-nowrap"
        >
          <Icon className={cn("size-3", style.fg)} />
          {type !== "SERVICE" && (
            <>
              <Separator
                orientation="vertical"
                className="mx-0.5 min-h-3.5 self-center"
              />
              <span className={cn("font-medium", stockStatus.textColor)}>
                {stock} {unit ?? ""}
              </span>
            </>
          )}
        </Badge>
      </div>

      <Separator className="absolute inset-x-0 bottom-0 bg-border/50" />
    </div>
  );
}
