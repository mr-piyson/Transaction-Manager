"use client";

import { FileText, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function DocumentsPage({
  documentType,
}: {
  documentType: "invoices" | "quotations";
}) {
  const t = useTranslations();
  const router = useRouter();
  const type = documentType;

  const Icon = type === "invoices" ? Receipt : FileText;

  const title =
    type === "invoices" ? t("invoices.title") : t("layout.quotations");

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1">
          {t("invoices.selectDescription")}
        </p>
      </div>
      <Button onClick={() => router.push(`/erp/documents/${type}/new`)}>
        {t("invoices.newInvoice")}
      </Button>
    </div>
  );
}
