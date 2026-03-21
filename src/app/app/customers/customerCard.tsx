import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Customer } from '@prisma/client';
import { User2 } from 'lucide-react';
import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils'; // Assuming you use shadcn's utility

interface CustomerCardProps extends HTMLAttributes<HTMLDivElement> {
  data: Customer;
}

export function CustomerCard({ data, className, ...props }: CustomerCardProps) {
  // Destructuring 'data' makes the code much cleaner below
  const { name, phone, id, address } = data;

  return (
    <div className={cn('flex h-18 items-center gap-3 p-3 transition-colors hover:bg-accent/50 cursor-pointer', className)} {...props}>
      <Avatar className="size-11 rounded-lg shrink-0 after:border-0">
        <AvatarFallback className={cn('rounded-lg transition-colors')}>
          <User2 className="size-6" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{name}</p>
        <p className="text-sm text-muted-foreground truncate">{phone}</p>
      </div>

      <div className="text-right text-xs space-y-0.5">
        <p className="flex items-center justify-end gap-1 text-primary">
          {/* Example Icon */}
          <span className="font-mono font-semibold">Cus-{id}</span>
        </p>
        <p className="flex items-center justify-end gap-1 text-muted-foreground">{address}</p>
      </div>
    </div>
  );
}
