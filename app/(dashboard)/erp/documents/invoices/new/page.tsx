import { Suspense } from "react";
import InvoiceNewPage from "./invoice-form";

export default function NewInvoiceRoute() {
  return (
    <Suspense fallback={null}>
      <InvoiceNewPage />
    </Suspense>
  );
}
