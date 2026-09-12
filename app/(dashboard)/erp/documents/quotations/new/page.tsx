import { Suspense } from "react";
import QuotationNewPage from "@/layouts/dashboard/erp/documents/quotations/QuotationNewPage";

export default function NewQuotationRoute() {
  return (
    <Suspense fallback={null}>
      <QuotationNewPage />
    </Suspense>
  );
}
