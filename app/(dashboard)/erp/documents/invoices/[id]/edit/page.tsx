import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions/server";
import InvoiceEditPage from "./invoice-form";

export default async function EditInvoiceRoute() {
  await requirePermission("invoice:update");
  return (
    <Suspense fallback={null}>
      <InvoiceEditPage />
    </Suspense>
  );
}
