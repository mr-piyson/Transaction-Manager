'use client';
import { TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Money } from '@/lib/money';
import { InventoryItem } from '@prisma/client';

function PriceRow({ icon: Icon, value, className, iconClass }: { icon: React.ElementType; value: string; className?: string; iconClass?: string }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Icon size={11} className={cn('shrink-0', iconClass)} />
      <span className={cn('text-xs tabular-nums', className)}>{value}</span>
    </div>
  );
}

export function InventoryCardRenderer(props: { data: InventoryItem; onClick?: (data: InventoryItem) => void }) {
  if (!props.data) return null;

  const profit = props.data.salesPrice - props.data.purchasePrice;
  const initials = props.data.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div onClick={() => props.onClick?.(props.data)} className="flex items-center gap-3 h-18 min-h-18 max-h-18 px-3.5 py-3 overflow-hidden">
      {/* Avatar */}
      <Avatar className="h-11 w-11 after:border-0 shrink-0 ">
        <AvatarImage src={props.data.image ?? undefined} alt={props.data.name} className="object-cover  rounded-lg" />
        <AvatarFallback className="border-0 rounded-lg bg-muted text-muted-foreground text-xs font-medium">{<Package size={23} className="" />}</AvatarFallback>
      </Avatar>

      {/* Name + description */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-sm font-medium leading-tight truncate text-foreground">{props.data.name}</p>
        {props.data.description && <p className="text-xs text-muted-foreground truncate mt-0.5 leading-tight">{props.data.description}</p>}
      </div>

      {/* Prices */}
      <div className="shrink-0 flex flex-col gap-0.5 text-right min-w-22.5">
        <PriceRow icon={TrendingDown} value={Money.format(props.data.purchasePrice)} className="text-destructive" iconClass="text-destructive" />
        <PriceRow icon={DollarSign} value={Money.format(props.data.salesPrice)} className="text-foreground font-medium" iconClass="text-muted-foreground" />
        <PriceRow icon={TrendingUp} value={Money.format(profit)} className="text-success-foreground dark:text-success-foreground" iconClass="text-emerald-600 dark:text-emerald-400" />
      </div>
    </div>
  );
}
