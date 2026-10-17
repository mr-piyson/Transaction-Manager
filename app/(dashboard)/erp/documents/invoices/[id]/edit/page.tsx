import { Suspense } from "react";
import InvoiceEditPage from "./invoice-form";

export default function EditInvoiceRoute() {
  return (
    <Suspense fallback={null}>
      <InvoiceEditPage />
    </Suspense>
  );
}
