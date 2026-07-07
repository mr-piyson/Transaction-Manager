'use client';

import { User } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { EmployeeStatusBadge } from '@/components/hrms/employee-status-badge';
import { cn } from '@/lib/utils';

interface EmployeeListItemProps extends HTMLAttributes<HTMLDivElement> {
  data?: any;
}

export function EmployeeListItem({ data, className, ...props }: EmployeeListItemProps) {
  const { employeeCode, user, department, jobPosition, status } = data || {};

  return (
    <div className={cn('flex items-center gap-3 p-3', className)} {...props}>
      <div className="size-11 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {user?.image ? (
          <img src={user.image} alt={user.name} className="size-full object-cover" />
        ) : (
          <User className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{user?.name ?? '—'}</p>
          <EmployeeStatusBadge status={status} />
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {employeeCode && <span className="font-mono">{employeeCode}</span>}
          {employeeCode && jobPosition?.name && <span> · </span>}
          {jobPosition?.name}
          {jobPosition?.name && department?.name && <span> · </span>}
          {department?.name}
        </p>
      </div>
    </div>
  );
}
