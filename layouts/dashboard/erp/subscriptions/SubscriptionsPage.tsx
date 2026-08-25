"use client";

import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSubscriptionForm } from "@/components/dialogs/subscriptionForm";
import { Button } from "@/components/ui/button";

export default function SubscriptionsPage() {
  const { openCreate } = useSubscriptionForm();
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <CalendarClock className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">{t("subscriptions.title")}</h2>
        <p className="text-muted-foreground mt-1">
          {t("subscriptions.selectDescription")}
        </p>
      </div>
      <Button onClick={() => openCreate()}>
        {t("subscriptions.createSubscription")}
      </Button>
    </div>
  );
}
