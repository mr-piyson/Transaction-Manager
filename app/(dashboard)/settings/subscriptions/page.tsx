"use client";

import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { SectionCard } from "../_shared";

const FREQUENCY_OPTIONS = [
  {
    value: "DAILY_08",
    labelKey: "settings.subs.freqDaily08",
    descKey: "settings.subs.freqDaily08Desc",
  },
  {
    value: "EVERY_6H",
    labelKey: "settings.subs.freqEvery6h",
    descKey: "settings.subs.freqEvery6hDesc",
  },
  {
    value: "HOURLY",
    labelKey: "settings.subs.freqHourly",
    descKey: "settings.subs.freqHourlyDesc",
  },
] as const;

const SCOPE_OPTIONS = [
  {
    value: "ALL_USERS",
    labelKey: "settings.subs.scopeAllUsers",
    descKey: "settings.subs.scopeAllUsersDesc",
  },
  {
    value: "CREATOR",
    labelKey: "settings.subs.scopeCreator",
    descKey: "settings.subs.scopeCreatorDesc",
  },
] as const;

export default function SubscriptionsSettingsPage() {
  const t = useTranslations();
  const utils = trpc.useUtils();

  const { data: settings, isLoading } = trpc.settings.getSettings.useQuery();

  const [initialized, setInitialized] = useState(false);
  const [frequency, setFrequency] = useState<string>("DAILY_08");
  const [notifyScope, setNotifyScope] = useState<string>("ALL_USERS");
  const [defaultAlertDays, setDefaultAlertDays] = useState<string>("7");

  useMemo(() => {
    if (settings && !initialized) {
      if (settings["subscriptions.renewalCheckFrequency"]) {
        setFrequency(settings["subscriptions.renewalCheckFrequency"]);
      }
      if (settings["subscriptions.notifyScope"]) {
        setNotifyScope(settings["subscriptions.notifyScope"]);
      }
      if (settings["subscriptions.defaultAlertDaysBefore"]) {
        setDefaultAlertDays(settings["subscriptions.defaultAlertDaysBefore"]);
      }
      setInitialized(true);
    }
  }, [settings, initialized]);

  const updateRenewalSettings =
    trpc.subscriptions.updateRenewalSettings.useMutation({
      onSuccess: () => {
        utils.settings.getSettings.invalidate();
        toast.success(t("settings.subs.saved"));
      },
      onError: useCallback(
        (e: { message: string }) => toast.error(e.message),
        [],
      ),
    });

  const isPending = updateRenewalSettings.isPending;

  const handleFrequencyChange = useCallback(
    (value: string) => {
      setFrequency(value);
      updateRenewalSettings.mutate({
        renewalCheckFrequency: value as any,
      });
    },
    [updateRenewalSettings],
  );

  const handleScopeChange = useCallback(
    (value: string) => {
      setNotifyScope(value);
      updateRenewalSettings.mutate({ notifyScope: value as any });
    },
    [updateRenewalSettings],
  );

  const handleSaveAlertDays = useCallback(() => {
    const parsed = Number(defaultAlertDays);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 365) {
      toast.error(t("settings.subs.invalidAlertDays"));
      return;
    }
    updateRenewalSettings.mutate({ defaultAlertDaysBefore: parsed });
  }, [defaultAlertDays, updateRenewalSettings, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t("settings.subs.frequency")}
        description={t("settings.subs.frequencyDesc")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FREQUENCY_OPTIONS.map((opt) => {
            const selected = frequency === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={isPending}
                onClick={() => handleFrequencyChange(opt.value)}
                className={cn(
                  "relative flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-accent/50",
                )}
              >
                {selected && (
                  <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    selected ? "text-primary" : "",
                  )}
                >
                  {t(opt.labelKey)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(opt.descKey)}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("settings.subs.frequencyNote")}
        </p>
      </SectionCard>

      <SectionCard
        title={t("settings.subs.recipients")}
        description={t("settings.subs.recipientsDesc")}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SCOPE_OPTIONS.map((opt) => {
            const selected = notifyScope === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={isPending}
                onClick={() => handleScopeChange(opt.value)}
                className={cn(
                  "relative flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/50 hover:bg-accent/50",
                )}
              >
                {selected && (
                  <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    selected ? "text-primary" : "",
                  )}
                >
                  {t(opt.labelKey)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(opt.descKey)}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("settings.subs.recipientsNote")}
        </p>
      </SectionCard>

      <SectionCard
        title={t("settings.subs.formDefaults")}
        description={t("settings.subs.formDefaultsDesc")}
      >
        <div className="flex items-end gap-2 max-w-xs">
          <div className="grid gap-2 flex-1">
            <label className="text-sm font-medium" htmlFor="defaultAlertDays">
              {t("settings.subs.defaultAlertDays")}
            </label>
            <Input
              id="defaultAlertDays"
              type="number"
              min={0}
              max={365}
              value={defaultAlertDays}
              onChange={(e) => setDefaultAlertDays(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveAlertDays} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("settings.subs.defaultAlertDaysDesc")}
        </p>
      </SectionCard>
    </div>
  );
}
