'use client';

import { Badge } from '@/components/ui/badge';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
  ON_LEAVE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400',
  TERMINATED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
  RESIGNED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  SUSPENDED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400',
};

export function EmployeeStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={STATUS_COLORS[status] ?? ''}>
      {status?.replace(/_/g, ' ')}
    </Badge>
  );
}
