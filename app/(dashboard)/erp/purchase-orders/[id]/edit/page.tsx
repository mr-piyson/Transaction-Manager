import { Suspense } from "react";
import POEditPage from "./po-form";

export default function EditPORoute() {
  return (
    <Suspense fallback={null}>
      <POEditPage />
    </Suspense>
  );
}
