"use client";

import { AlertProvider } from "@/components/Alert-dialog";
import { CurrencyProvider } from "@/hooks/use-currency";
import { DashboardShell } from "./dashboard-shell";
import { SplashScreen } from "./splash-screen";

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
