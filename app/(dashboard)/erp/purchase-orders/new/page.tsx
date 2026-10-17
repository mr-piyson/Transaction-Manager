import { Suspense } from "react";
import PONewPage from "./po-form";

export default function NewPORoute() {
  return (
    <Suspense fallback={null}>
      <PONewPage />
    </Suspense>
  );
}
