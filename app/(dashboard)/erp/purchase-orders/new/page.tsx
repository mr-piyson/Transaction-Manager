import { Suspense } from "react";
import PONewPage from "@/layouts/dashboard/erp/purchase-orders/PONewPage";

export default function NewPORoute() {
  return (
    <Suspense fallback={null}>
      <PONewPage />
    </Suspense>
  );
}
