import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building2, Package, ShoppingCart } from 'lucide-react';
import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { RouterOutputs } from '@/lib/trpc/client';
import { Badge } from '@/components/ui/badge';

type SupplierListItem = RouterOutputs['suppliers']['list'][number];

interface SupplierListItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'data'> {
  data: SupplierListItem;
}

export function Supplier_List_Item({ data, className, ...props }: SupplierListItemProps) {
  const { name, email, phone, isSystem, isActive, _count } = data;

  return (
    <div className={cn('flex h-18 items-center gap-3 p-3', className)} {...props}>
      <Avatar className="size-11 rounded-lg shrink-0 after:border-0">
        <AvatarFallback className="rounded-lg transition-colors">
          <Building2 className="size-6" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{name}</p>
          {isSystem && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">System</Badge>}
          {!isActive && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Inactive</Badge>}
        </div>
        <p className="text-sm text-muted-foreground truncate">{email || phone || 'No contact info'}</p>
      </div>

      <div className="text-right text-xs space-y-0.5">
        <p className="flex items-center justify-end gap-1 text-muted-foreground">
          {_count.purchaseOrders} <ShoppingCart className="size-3" />
        </p>
        <p className="flex items-center justify-end gap-1 text-muted-foreground">
          {_count.supplierItems} <Package className="size-3" />
        </p>
      </div>
    </div>
  );
}
