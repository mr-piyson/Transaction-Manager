import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions/server";
import InvoiceNewPage from "./invoice-form";

export default async function NewInvoiceRoute() {
  await requirePermission("invoice:create");
  return (
    <Suspense fallback={null}>
      <InvoiceNewPage />
    </Suspense>
  );
}
