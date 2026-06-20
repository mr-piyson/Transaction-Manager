import { Handshake } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, isAfter } from 'date-fns';

interface ContractListItemProps extends HTMLAttributes<HTMLDivElement> {
  data?: any;
}

export function ContractListItem({ data, className, ...props }: ContractListItemProps) {
  const { customer, serial, startDate, endDate, contractValue, currency } = data || {};
  const expired = endDate && !isAfter(new Date(endDate), new Date());

  return (
    <div className={cn('flex items-center gap-3 p-3', className)} {...props}>
      <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Handshake className="size-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{customer?.name ?? serial}</p>
          {expired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {serial} · {startDate ? format(new Date(startDate), 'dd MMM yyyy') : '—'}
          {endDate ? ` → ${format(new Date(endDate), 'dd MMM yyyy')}` : ''}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold">{Number(contractValue).toFixed(3)} {currency}</p>
      </div>
    </div>
  );
}
