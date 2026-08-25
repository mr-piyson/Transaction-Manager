import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDateFormat } from "@/hooks/use-date-format";
import { formatAmount } from "@/lib/utils";
import { SubscriptionStatusBadge } from "./subscription-status-badge";

const methodLabels: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  CHEQUE: "Cheque",
  ONLINE: "Online",
  CREDIT: "Credit Note",
  OTHER: "Other",
};

const cycleLabels: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMI_ANNUAL: "Semi-annual",
  ANNUAL: "Annual",
  CUSTOM: "Custom",
};

interface SubscriptionDetailProps {
  subscription: any;
}

export function SubscriptionDetail({ subscription }: SubscriptionDetailProps) {
  const t = useTranslations();
  const { formatDate, formatDateTime } = useDateFormat();

  const {
    vendor,
    url,
    description,
    notes,
    amount,
    currency,
    method,
    billingCycle,
    customCycleDays,
    autoRenew,
    startDate,
    nextRenewalDate,
    lastRenewedAt,
    alertDaysBefore,
    category,
    department,
    createdBy,
    updatedBy,
    createdAt,
    updatedAt,
    renewals,
  } = subscription;

  const cycleLabel =
    billingCycle === "CUSTOM" && customCycleDays
      ? `Every ${customCycleDays} days`
      : (cycleLabels[billingCycle] ?? billingCycle);

  const daysUntilRenewal = nextRenewalDate
    ? Math.ceil((new Date(nextRenewalDate).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              {t("subscriptions.amount")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {formatAmount(Number(amount ?? 0), currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {methodLabels[method as string] ?? method}
              {autoRenew ? ` · ${t("subscriptions.autoRenew")}` : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              {t("subscriptions.billingCycle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{cycleLabel}</p>
            <p className="text-xs text-muted-foreground">
              {t("subscriptions.started")}{" "}
              {startDate ? formatDate(startDate) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              {t("subscriptions.nextRenewal")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {nextRenewalDate ? formatDate(nextRenewalDate) : "—"}
            </p>
            {daysUntilRenewal !== null && (
              <p className="text-xs text-muted-foreground">
                {daysUntilRenewal >= 0
                  ? t("subscriptions.renewsIn", { days: daysUntilRenewal })
                  : t("subscriptions.overdueBy", {
                      days: Math.abs(daysUntilRenewal),
                    })}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              {t("subscriptions.vendor")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold truncate">{vendor || "—"}</p>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary flex items-center gap-1 truncate hover:underline"
              >
                {t("subscriptions.billingPortal")}
                <ExternalLink className="size-3 shrink-0" />
              </a>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Classification */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {t("subscriptions.classification")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">
              {t("subscriptions.category")}:{" "}
            </span>
            <span className="font-medium">{category?.name ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">
              {t("subscriptions.department")}:{" "}
            </span>
            <span className="font-medium">{department?.name ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">
              {t("subscriptions.alertBefore")}:{" "}
            </span>
            <span className="font-medium">
              {alertDaysBefore} {t("subscriptions.days")}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">
              {t("subscriptions.lastRenewed")}:{" "}
            </span>
            <span className="font-medium">
              {lastRenewedAt
                ? formatDate(lastRenewedAt)
                : t("subscriptions.never")}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      {description && (
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              {t("contracts.description")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{description}</p>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {notes && (
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground font-medium">
              {t("contracts.notes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Renewal history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {t("subscriptions.renewalHistory")}
          </CardTitle>
          <CardDescription>
            {t("subscriptions.renewalHistoryDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!renewals || renewals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("subscriptions.noRenewals")}
            </p>
          ) : (
            <div className="divide-y">
              {renewals.map((renewal: any) => (
                <div
                  key={renewal.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {formatDate(renewal.date)}
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        ·{" "}
                        {methodLabels[renewal.method as string] ??
                          renewal.method}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {renewal.createdBy?.name ?? "—"}
                      {renewal.createdAt
                        ? ` · ${formatDateTime(renewal.createdAt)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {renewal.journalEntryId ? (
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        {t("subscriptions.glPosted")}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        {t("subscriptions.notPosted")}
                      </Badge>
                    )}
                    <p className="font-semibold text-sm">
                      {formatAmount(Number(renewal.amount), currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status + meta info */}
      <div className="flex items-center gap-2 pb-2 flex-wrap">
        <SubscriptionStatusBadge status={subscription.status} />
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          <span>
            {t("common.created")} {createdAt ? formatDateTime(createdAt) : "—"}
            {createdBy ? ` by ${createdBy.name}` : ""}
          </span>
          <span>
            {t("common.updated")} {updatedAt ? formatDateTime(updatedAt) : "—"}
            {updatedBy ? ` by ${updatedBy.name}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
