"use client";
import DevelopmentProgressPage from "@/components/Home/HomePage";

// export default function Home() {
//   return <DevelopmentProgressPage />;
// }

import { Button } from "@/components/ui/button";

export default function ThemeCustomizer() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Theme Customizer</h1>
      <Button onClick={() => window.location.reload()}>Reset to Default</Button>
    </div>
  );
}
