"use client";

import { AlertProvider } from "@/components/Alert-dialog";
import { DashboardShell } from "@/components/layout/Dashboard-Shell";
import { SplashScreen } from "@/components/Splash-Screen";
import { CurrencyProvider } from "@/hooks/use-currency";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SplashScreen>
      <AlertProvider>
        <CurrencyProvider>
          <DashboardShell>{children}</DashboardShell>
        </CurrencyProvider>
      </AlertProvider>
    </SplashScreen>
  );
}
