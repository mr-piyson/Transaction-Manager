import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  EXPIRED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  TERMINATED: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
};

interface ContractStatusBadgeProps {
  status: string;
  className?: string;
}

export function ContractStatusBadge({ status, className }: ContractStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(statusStyles[status] ?? '', className)}>
      {statusLabels[status] ?? status}
    </Badge>
  );
}
