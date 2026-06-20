import { ShoppingCart } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ORDERED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  PARTIAL_RECEIVED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  INVOICED: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

interface POListItemProps extends HTMLAttributes<HTMLDivElement> {
  data?: any;
}

export function POListItem({ data, className, ...props }: POListItemProps) {
  const { serial, status, supplier, date, total, currency, amountOwed } = data || {};

  return (
    <div className={cn('flex items-center gap-3 p-3', className)} {...props}>
      <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <ShoppingCart className="size-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{serial}</p>
          <Badge variant="outline" className={STATUS_COLORS[status] ?? ''}>
            {status?.replace(/_/g, ' ')}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {supplier?.name ?? '—'} · {date ? format(new Date(date), 'dd MMM yyyy') : '—'}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold">{Number(total).toFixed(3)} {currency}</p>
        {Number(amountOwed) > 0 && (
          <p className="text-xs text-muted-foreground">{Number(amountOwed).toFixed(3)} owed</p>
        )}
      </div>
    </div>
  );
}
