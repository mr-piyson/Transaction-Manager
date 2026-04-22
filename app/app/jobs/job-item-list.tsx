import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Customer, Job } from '@prisma/client';
import { BriefcaseBusiness, MapPin, User2 } from 'lucide-react';
import { HTMLAttributes } from 'react';
import { cn, formatDate } from '@/lib/utils'; // Assuming you use shadcn's utility
import { Badge } from '@/components/badge';

interface Job_List_Item_Props extends HTMLAttributes<HTMLDivElement> {
  data?: Job;
  selectable?: boolean; // Optional prop to indicate if the item is selectable
}

export function Job_List_Item({ data, className, selectable, ...props }: Job_List_Item_Props) {
  // Destructuring 'data' makes the code much cleaner below
  const { title, createdAt, status } = data || ({} satisfies Partial<Job>);

  return (
    <div
      className={cn(
        'flex h-18 items-center gap-3 p-3 transition-colors hover:bg-secondary/10',
        selectable && 'hover:bg-secondary/10',
        className,
      )}
      {...props}
    >
      <Avatar className="size-11 rounded-lg shrink-0 after:border-0">
        <AvatarFallback className={cn('rounded-lg transition-colors')}>
          <BriefcaseBusiness className="size-6" />
        </AvatarFallback>
      </Avatar>

      {title && (
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{title}</p>
          <p className="text-sm text-muted-foreground truncate">{formatDate(createdAt)}</p>
        </div>
      )}

      <div className="text-right text-xs space-y-0.5">
        <p className="flex items-center justify-end gap-1 text-primary">
          {/* Example Icon */}
          <span className="font-mono font-semibold"></span>
        </p>
        {status && (
          <p className="flex items-center justify-end gap-1 text-muted-foreground">
            <StatusBadge status={status} />
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let color = 'default' as 'default' | 'warning' | 'success' | 'error';
  if (status === 'NOT_STARTED') color = 'default';
  else if (status === 'IN_PROGRESS') color = 'warning';
  else if (status === 'COMPLETED') color = 'success';
  else if (status === 'CANCELLED') color = 'error';

  return <Badge variant={color}>{status.replace('_', ' ')}</Badge>;
}
