import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Customer } from '@prisma/client';
import { MapPin, User2 } from 'lucide-react';
import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils'; // Assuming you use shadcn's utility

interface Customer_List_Item_Props extends HTMLAttributes<HTMLDivElement> {
  data?: Customer;
  selectable?: boolean; // Optional prop to indicate if the item is selectable
}

export function Customer_List_Item({
  data,
  className,
  selectable,
  ...props
}: Customer_List_Item_Props) {
  // Destructuring 'data' makes the code much cleaner below
  const { name, phone, address } = data || {};

  return (
    <div className={cn('flex h-18 items-center gap-3 p-3', className)} {...props}>
      <Avatar className="size-11 rounded-lg shrink-0 after:border-0">
        <AvatarFallback className={cn('rounded-lg transition-colors')}>
          <User2 className="size-6" />
        </AvatarFallback>
      </Avatar>

      {name && (
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{name}</p>
          <p className="text-sm text-muted-foreground truncate">{phone}</p>
        </div>
      )}

      <div className="text-right text-xs space-y-0.5">
        <p className="flex items-center justify-end gap-1 text-primary">
          {/* Example Icon */}
          <span className="font-mono font-semibold"></span>
        </p>
        {address && (
          <p className="flex items-center justify-end gap-1 text-muted-foreground">
            {address}
            <MapPin className="size-4" />
          </p>
        )}
      </div>
    </div>
  );
}
