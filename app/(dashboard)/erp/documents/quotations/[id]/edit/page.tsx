import { Suspense } from "react";
import QuotationEditPage from "./quotation-form";

export default function EditQuotationRoute() {
  return (
    <Suspense fallback={null}>
      <QuotationEditPage />
    </Suspense>
  );
}
