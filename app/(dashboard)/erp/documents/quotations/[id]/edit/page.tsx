import { Suspense } from "react";
import QuotationEditPage from "@/layouts/dashboard/erp/documents/quotations/QuotationEditPage";

export default function EditQuotationRoute() {
  return (
    <Suspense fallback={null}>
      <QuotationEditPage />
    </Suspense>
  );
}
