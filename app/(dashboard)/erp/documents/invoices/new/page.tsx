import { Suspense } from "react";
import InvoiceNewPage from "../InvoiceNewPage";

export default function NewInvoiceRoute() {
  return (
    <Suspense fallback={null}>
      <InvoiceNewPage />
    </Suspense>
  );
}
