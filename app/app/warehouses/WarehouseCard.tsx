'use client';
import { cn } from '@/lib/utils';
import { Warehouse as WarehouseIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function WarehouseCard(props: {
  data: any;
  onClick?: (data: any) => void;
  className?: string;
}) {
  if (!props.data) return null;

  return (
    <div
      onClick={() => props.onClick?.(props.data)}
      className={cn(
        'flex hover:bg-accent/50 items-center gap-3 h-18 px-3.5 py-3 overflow-hidden cursor-pointer',
        props.className,
      )}
    >
      <Avatar className="size-11 after:border-0 shrink-0 ">
        <AvatarFallback className="border-0 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
          <WarehouseIcon size={23} />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-sm font-medium leading-tight truncate text-foreground">
          {props.data.name}
        </p>
        {props.data.address && (
          <p className="text-xs text-muted-foreground truncate mt-0.5 leading-tight">
            {props.data.address}
          </p>
        )}
      </div>
    </div>
  );
}
