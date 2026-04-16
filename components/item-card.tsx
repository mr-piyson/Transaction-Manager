'use client';
import { Package, Hash, Boxes } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatAmount } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function SimpleItemCard({
  data,
  onClick,
  disabled,
}: {
  data: any;
  onClick?: (data: any) => void;
  disabled?: boolean;
}) {
  if (!data) return null;

  const totalStock = data.type === 'PRODUCT' 
    ? (data.stockEntries?.reduce((acc: number, s: any) => acc + s.quantity, 0) || 0)
    : null;

  const isOutOfStock = data.type === 'PRODUCT' && totalStock <= 0;

  return (
    <div
      onClick={() => !disabled && !isOutOfStock && onClick?.(data)}
      className={cn(
        "flex items-center gap-3 h-18 min-h-18 max-h-18 px-3.5 py-3 overflow-hidden cursor-pointer transition-colors",
        isOutOfStock || disabled ? "opacity-50 cursor-not-allowed bg-muted/20" : "hover:bg-accent/50"
      )}
    >
      {/* Avatar */}
      <Avatar className="size-11 after:border-0 shrink-0 ">
        <AvatarImage
          src={data?.image ? data.image : undefined}
          alt={data.name}
          className="object-cover rounded-lg"
        />
        <AvatarFallback className="border-0 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
          <Package size={23} />
        </AvatarFallback>
      </Avatar>

      {/* Name + description */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold leading-tight truncate text-foreground">
            {data.name}
          </p>
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
            {data.type}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground truncate leading-tight flex items-center gap-1">
            <Hash size={10} />
            {data.sku || 'No SKU'}
          </p>
          {data.category && (
            <p className="text-[10px] text-muted-foreground/70 truncate">
              • {data.category.name}
            </p>
          )}
        </div>
      </div>

      {/* Stock info if product */}
      {data.type === 'PRODUCT' && (
        <div className="shrink-0 text-right px-3 border-r border-border/50">
          <div className={cn(
            "text-xs font-bold tabular-nums",
            isOutOfStock ? "text-destructive" : "text-foreground"
          )}>
            {totalStock}
          </div>
          <div className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">
            Stock
          </div>
        </div>
      )}

      {/* Prices */}
      <div className="shrink-0 flex flex-col gap-0.5 text-right">
        <div className="text-sm font-black text-foreground tabular-nums">
          {formatAmount(data.salesPrice)}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
          Sales Price
        </div>
      </div>
    </div>
  );
}
