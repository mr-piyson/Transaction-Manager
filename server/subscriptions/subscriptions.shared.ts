import type { SubscriptionBillingCycle } from "@prisma/client";

/**
 * Advances `date` by one billing cycle. Used only when the user explicitly
 * records a renewal (router `renew` mutation) — never called by the cron job.
 */
export function addBillingCycle(
  date: Date,
  cycle: SubscriptionBillingCycle,
  customCycleDays?: number | null,
): Date {
  const next = new Date(date);

  switch (cycle) {
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      return next;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      return next;
    case "SEMI_ANNUAL":
      next.setMonth(next.getMonth() + 6);
      return next;
    case "ANNUAL":
      next.setFullYear(next.getFullYear() + 1);
      return next;
    case "CUSTOM": {
      const days =
        customCycleDays && customCycleDays > 0 ? customCycleDays : 30;
      next.setDate(next.getDate() + days);
      return next;
    }
    default:
      return next;
  }
}

export const SUBSCRIPTION_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "CANCELLED",
  "EXPIRED",
] as const;

export const SUBSCRIPTION_BILLING_CYCLES = [
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUAL",
  "ANNUAL",
  "CUSTOM",
] as const;
