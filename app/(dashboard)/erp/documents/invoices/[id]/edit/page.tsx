import { Suspense } from "react";
import InvoiceEditPage from "@/layouts/dashboard/erp/documents/invoices/InvoiceEditPage";

export default function EditInvoiceRoute() {
  return (
    <Suspense fallback={null}>
      <InvoiceEditPage />
    </Suspense>
  );
}
