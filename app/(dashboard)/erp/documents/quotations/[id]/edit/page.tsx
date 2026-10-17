import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions/server";
import QuotationEditPage from "./quotation-form";

export default async function EditQuotationRoute() {
  await requirePermission("invoice:update");
  return (
    <Suspense fallback={null}>
      <QuotationEditPage />
    </Suspense>
  );
}
