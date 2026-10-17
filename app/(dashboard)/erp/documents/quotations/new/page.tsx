import { Suspense } from "react";
import QuotationNewPage from "../QuotationNewPage";

export default function NewQuotationRoute() {
  return (
    <Suspense fallback={null}>
      <QuotationNewPage />
    </Suspense>
  );
}
