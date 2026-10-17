import { Suspense } from "react";
import QuotationNewPage from "./quotation-form";

export default function NewQuotationRoute() {
  return (
    <Suspense fallback={null}>
      <QuotationNewPage />
    </Suspense>
  );
}
