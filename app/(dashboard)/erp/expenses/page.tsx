"use client";

import { useTranslations } from "next-intl";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExpenseForm } from "@/components/dialogs";

export default function ExpensesPage() {
	const t = useTranslations();
	const { openCreate } = useExpenseForm();

	return (
		<div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
			<div className="size-16 rounded-full bg-muted flex items-center justify-center">
				<Wallet className="size-8 text-muted-foreground" />
			</div>
			<div>
				<h2 className="text-xl font-semibold">{t("expenses.title")}</h2>
				<p className="text-muted-foreground mt-1">
					{t("expenses.selectDescription")}
				</p>
			</div>
			<Button onClick={() => openCreate()}>{t("expenses.newExpense")}</Button>
		</div>
	);
}
