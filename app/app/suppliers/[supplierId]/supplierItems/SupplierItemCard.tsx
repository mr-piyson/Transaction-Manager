'use client';
import { Package } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Format } from '@/lib/format';
import { formatAmount } from '@/lib/utils';

export function InventoryItemCard(props: {
  data: any; // Using any to support included relations
  onClick?: (data: any) => void;
}) {
  if (!props.data) return null;

  const stockItem = props.data.stockItem;

  return (
    <div
      onClick={() => props.onClick?.(props.data)}
      className="flex hover:bg-accent/50 items-center gap-3 h-18 min-h-18 max-h-18 px-3.5 py-3 overflow-hidden cursor-pointer"
    >
      {/* Avatar */}
      <Avatar className="size-11 after:border-0 shrink-0 ">
        <AvatarImage
          src={props.data?.image ? props.data.image : undefined}
          alt={props.data.name}
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
            {props.data.name}
          </p>
          {stockItem && (
            <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-mono border border-primary/20">
              {stockItem.sku}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground truncate leading-tight">
            {props.data.code || 'No Code'}
          </p>
          {props.data.supplier && (
            <p className="text-[10px] text-muted-foreground/70 truncate">
              • {props.data.supplier.name}
            </p>
          )}
        </div>
      </div>

      {/* Stock info if available */}
      {stockItem?.stockEntries && (
        <div className="shrink-0 text-right px-3 border-r border-border/50">
          <div className="text-xs font-bold text-foreground tabular-nums">
            {stockItem.stockEntries.reduce((acc: number, s: any) => acc + s.quantity, 0)}
          </div>
          <div className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">
            Stock
          </div>
        </div>
      )}

      {/* Prices */}
      <div className="shrink-0 flex flex-col gap-0.5 text-right">
        <div className="text-sm font-black text-foreground tabular-nums">
          {formatAmount(props.data.basePrice)}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
          Base Price
        </div>
      </div>
    </div>
  );
}
