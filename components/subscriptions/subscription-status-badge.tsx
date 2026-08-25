import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PAUSED:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CANCELLED:
    "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  EXPIRED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

interface SubscriptionStatusBadgeProps {
  status: string;
  className?: string;
}

export function SubscriptionStatusBadge({
  status,
  className,
}: SubscriptionStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(statusStyles[status] ?? "", className)}
    >
      {statusLabels[status] ?? status}
    </Badge>
  );
}
