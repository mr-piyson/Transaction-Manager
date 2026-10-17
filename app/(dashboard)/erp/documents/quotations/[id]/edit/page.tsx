import { Suspense } from "react";
import QuotationEditPage from "../../QuotationEditPage";

export default function EditQuotationRoute() {
  return (
    <Suspense fallback={null}>
      <QuotationEditPage />
    </Suspense>
  );
}
