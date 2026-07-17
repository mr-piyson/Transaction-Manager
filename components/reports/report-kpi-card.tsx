'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type KpiVariant = 'default' | 'success' | 'danger' | 'warning' | 'info';

const variantStyles: Record<KpiVariant, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-500',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-500',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-500',
};

interface ReportKpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  variant?: KpiVariant;
  loading?: boolean;
  count?: number;
  countLabel?: string;
  sub?: string;
}

export function ReportKpiCard({
  title,
  value,
  icon,
  variant = 'default',
  loading,
  count,
  countLabel,
  sub,
}: ReportKpiCardProps) {
  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            'size-9 rounded-xl flex items-center justify-center transition-colors group-hover:opacity-80',
            variantStyles[variant],
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-24" />
            {count !== undefined && <Skeleton className="h-3 w-16" />}
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {count !== undefined && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {count} {countLabel ?? ''}
              </p>
            )}
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
