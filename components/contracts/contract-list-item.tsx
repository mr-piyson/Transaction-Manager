import { Handshake } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import { useDateFormat } from '@/hooks/use-date-format';
import { ContractStatusBadge } from './contract-status-badge';
import { Progress } from '@/components/ui/progress';

interface ContractListItemProps extends HTMLAttributes<HTMLDivElement> {
  data?: any;
}

export function ContractListItem({ data, className, ...props }: ContractListItemProps) {
  const { formatDate } = useDateFormat();
  const { customer, serial, title, startDate, endDate, contractValue, currency, status, renewalAlertDays, renewalDate } = data || {};
  const expired = status === 'EXPIRED' || status === 'TERMINATED';
  const isActive = status === 'ACTIVE';

  const totalDays = startDate && endDate ? differenceInDays(new Date(endDate), new Date(startDate)) : 0;
  const daysRemaining = endDate ? differenceInDays(new Date(endDate), new Date()) : 0;
  const progressPct = totalDays > 0 ? Math.max(0, Math.min(100, ((totalDays - Math.max(0, daysRemaining)) / totalDays) * 100)) : 0;

  const daysUntilRenewal = renewalDate && isActive
    ? differenceInDays(new Date(renewalDate), new Date())
    : null;

  const showRenewalWarning = daysUntilRenewal !== null && daysUntilRenewal >= 0 && daysUntilRenewal <= (renewalAlertDays ?? 30);

  return (
    <div className={cn('flex items-center gap-3 p-3', className)} {...props}>
      <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Handshake className="size-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{serial ?? title}</p>
          <ContractStatusBadge status={status} />
          {showRenewalWarning && (
            <span className="text-yellow-600 dark:text-yellow-400 shrink-0" title={`Renewal in ${daysUntilRenewal} days`}>
              ⚠️
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {customer?.name ? `${customer.name} · ` : ''}
          {startDate ? formatDate(startDate) : '—'}
          {endDate ? ` → ${formatDate(endDate)}` : ''}
        </p>
        <Progress value={progressPct} className="h-1.5 mt-1" />
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold">{Number(contractValue ?? 0).toFixed(3)} {currency}</p>
      </div>
    </div>
  );
}
