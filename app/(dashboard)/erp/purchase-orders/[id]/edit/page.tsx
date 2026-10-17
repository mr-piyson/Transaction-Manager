import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions/server";
import POEditPage from "./po-form";

export default async function EditPORoute() {
  await requirePermission("po:update");
  return (
    <Suspense fallback={null}>
      <POEditPage />
    </Suspense>
  );
}
