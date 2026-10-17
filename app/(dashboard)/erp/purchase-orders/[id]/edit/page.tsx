import { Suspense } from "react";
import POEditPage from "../../POEditPage";

export default function EditPORoute() {
  return (
    <Suspense fallback={null}>
      <POEditPage />
    </Suspense>
  );
}
