import { Suspense } from "react";
import InvoiceEditPage from "../../InvoiceEditPage";

export default function EditInvoiceRoute() {
  return (
    <Suspense fallback={null}>
      <InvoiceEditPage />
    </Suspense>
  );
}
