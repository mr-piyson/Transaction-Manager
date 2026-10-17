import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions/server";
import PONewPage from "./po-form";

export default async function NewPORoute() {
  await requirePermission("po:create");
  return (
    <Suspense fallback={null}>
      <PONewPage />
    </Suspense>
  );
}
