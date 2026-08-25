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

// ---------------------------------------------------------------------------
// Org-level subscription settings (stored in OrganizationSetting key/value).
// ---------------------------------------------------------------------------

export const SUBSCRIPTION_SETTING_KEYS = {
  DEFAULT_ALERT_DAYS_BEFORE: "subscriptions.defaultAlertDaysBefore",
  NOTIFY_SCOPE: "subscriptions.notifyScope",
  RENEWAL_CHECK_FREQUENCY: "subscriptions.renewalCheckFrequency",
} as const;

export const DEFAULT_ALERT_DAYS_BEFORE = 7;

export type SubscriptionNotifyScope = "ALL_USERS" | "CREATOR";
export type RenewalCheckFrequency = "DAILY_08" | "EVERY_6H" | "HOURLY";

export const RENEWAL_NOTIFY_SCOPES: SubscriptionNotifyScope[] = [
  "ALL_USERS",
  "CREATOR",
];

export const RENEWAL_CHECK_FREQUENCIES: RenewalCheckFrequency[] = [
  "DAILY_08",
  "EVERY_6H",
  "HOURLY",
];

/** Cron expressions per frequency option. Never accept raw cron strings. */
export const RENEWAL_CHECK_CRON_EXPRESSIONS: Record<
  RenewalCheckFrequency,
  string
> = {
  DAILY_08: "0 8 * * *",
  EVERY_6H: "0 */6 * * *",
  HOURLY: "0 * * * *",
};

export function resolveRenewalCronExpression(
  value: string | null | undefined,
): string {
  if (value && value in RENEWAL_CHECK_CRON_EXPRESSIONS) {
    return RENEWAL_CHECK_CRON_EXPRESSIONS[value as RenewalCheckFrequency];
  }
  return RENEWAL_CHECK_CRON_EXPRESSIONS.DAILY_08;
}
