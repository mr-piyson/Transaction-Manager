import { Warehouse } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WarehouseListItemProps extends HTMLAttributes<HTMLDivElement> {
  data?: any;
}

export function WarehouseListItem({ data, className, ...props }: WarehouseListItemProps) {
  const { name, code, isDefault, _count } = data || {};

  return (
    <div className={cn('flex h-18 items-center gap-3 p-3', className)} {...props}>
      <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Warehouse className="size-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{name}</p>
          {isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
        </div>
        <p className="text-sm text-muted-foreground truncate">{code ?? '—'} · {_count?.stock ?? 0} items</p>
      </div>
    </div>
  );
}
