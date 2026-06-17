import { Truck } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SupplierListItemProps extends HTMLAttributes<HTMLDivElement> {
  data?: any;
}

export function SupplierListItem({ data, className, ...props }: SupplierListItemProps) {
  const { name, phone, email, code, isActive } = data || {};

  return (
    <div className={cn('flex h-18 items-center gap-3 p-3', className)} {...props}>
      <Avatar className="size-11 rounded-lg shrink-0 after:border-0">
        <AvatarFallback className="rounded-lg transition-colors">
          <Truck className="size-5" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{name}</p>
          {!isActive && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">Inactive</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{phone ?? email ?? code ?? '—'}</p>
      </div>
    </div>
  );
}
