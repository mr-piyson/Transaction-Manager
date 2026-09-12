import { Suspense } from "react";
import POEditPage from "@/layouts/dashboard/erp/purchase-orders/POEditPage";

export default function EditPORoute() {
  return (
    <Suspense fallback={null}>
      <POEditPage />
    </Suspense>
  );
}
