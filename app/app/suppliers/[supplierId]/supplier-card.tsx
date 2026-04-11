'use client';
import { Store } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function SupplierItemCard(props: { data: any; onClick?: (data: any) => void }) {
  if (!props.data) return null;

  return (
    <div
      onClick={() => props.onClick?.(props.data)}
      className="flex  hover:bg-accent/50 items-center gap-3 h-18 min-h-18 max-h-18 px-3.5 py-3 overflow-hidden"
    >
      {/* Avatar */}
      <Avatar className="size-11 after:border-0 shrink-0 ">
        <AvatarImage
          src={props.data?.image ? props.data.image : undefined}
          alt={props.data.name}
          className="object-cover  rounded-lg"
        />
        <AvatarFallback className="border-0 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
          <Store size={23} className="" />
        </AvatarFallback>
      </Avatar>

      {/* Name + description */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-sm font-medium leading-tight truncate text-foreground">
          {props.data.name}
        </p>
        {props.data.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5 leading-tight">
            {props.data.description}
          </p>
        )}
      </div>
    </div>
  );
}
