import { Suspense } from "react";
import PONewPage from "../PONewPage";

export default function NewPORoute() {
  return (
    <Suspense fallback={null}>
      <PONewPage />
    </Suspense>
  );
}
