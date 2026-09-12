import { Suspense } from "react";
import InvoiceNewPage from "@/layouts/dashboard/erp/documents/invoices/InvoiceNewPage";

export default function NewInvoiceRoute() {
  return (
    <Suspense fallback={null}>
      <InvoiceNewPage />
    </Suspense>
  );
}
