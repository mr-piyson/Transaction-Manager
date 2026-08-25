import { differenceInDays } from "date-fns";
import { CalendarClock } from "lucide-react";
import type { HTMLAttributes } from "react";
import { useDateFormat } from "@/hooks/use-date-format";
import { cn, formatAmount } from "@/lib/utils";
import { SubscriptionStatusBadge } from "./subscription-status-badge";

const cycleLabels: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMI_ANNUAL: "Semi-annual",
  ANNUAL: "Annual",
  CUSTOM: "Custom",
};

interface SubscriptionListItemProps extends HTMLAttributes<HTMLDivElement> {
  data?: any;
}

export function SubscriptionListItem({
  data,
  className,
  ...props
}: SubscriptionListItemProps) {
  const { formatDate } = useDateFormat();
  const {
    name,
    vendor,
    amount,
    currency,
    status,
    billingCycle,
    customCycleDays,
    nextRenewalDate,
    alertDaysBefore,
  } = data || {};
  const isActive = status === "ACTIVE";

  const daysUntilRenewal =
    nextRenewalDate && isActive
      ? differenceInDays(new Date(nextRenewalDate), new Date())
      : null;

  const showRenewalWarning =
    daysUntilRenewal !== null && daysUntilRenewal <= (alertDaysBefore ?? 7);

  const cycleLabel =
    billingCycle === "CUSTOM" && customCycleDays
      ? `Every ${customCycleDays} days`
      : (cycleLabels[billingCycle] ?? billingCycle);

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 p-3",
        className,
      )}
      {...props}
    >
      <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <CalendarClock className="size-5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{name}</p>
          <SubscriptionStatusBadge status={status} />
          {showRenewalWarning && (
            <span
              className="text-yellow-600 dark:text-yellow-400 shrink-0"
              title={
                daysUntilRenewal < 0
                  ? `Overdue by ${Math.abs(daysUntilRenewal)} days`
                  : `Renews in ${daysUntilRenewal} days`
              }
            >
              ⚠️
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {vendor ? `${vendor} · ` : ""}
          {cycleLabel} · renews{" "}
          {nextRenewalDate ? formatDate(nextRenewalDate) : "—"}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold">
          {formatAmount(Number(amount ?? 0), currency)}
        </p>
      </div>
    </div>
  );
}
