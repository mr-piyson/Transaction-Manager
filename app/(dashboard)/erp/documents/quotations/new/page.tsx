import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions/server";
import QuotationNewPage from "./quotation-form";

export default async function NewQuotationRoute() {
  await requirePermission("invoice:create");
  return (
    <Suspense fallback={null}>
      <QuotationNewPage />
    </Suspense>
  );
}
