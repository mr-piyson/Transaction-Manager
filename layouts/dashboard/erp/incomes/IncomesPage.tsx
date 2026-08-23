"use client";

import { Banknote } from "lucide-react";
import { useTranslations } from "next-intl";
import { useIncomeForm } from "@/components/dialogs";
import { Button } from "@/components/ui/button";

export default function IncomesPage() {
  const t = useTranslations();
  const { openCreate } = useIncomeForm();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <Banknote className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">{t("incomes.title")}</h2>
        <p className="text-muted-foreground mt-1">
          {t("incomes.selectDescription")}
        </p>
      </div>
      <Button onClick={() => openCreate()}>{t("incomes.newIncome")}</Button>
    </div>
  );
}
