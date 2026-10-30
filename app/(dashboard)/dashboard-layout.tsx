"use client";

import { AlertProvider } from "@/components/Alert-dialog";
import { HotkeysProviderClient } from "@/components/hotkeys/hotkeys-provider-client";
import { CurrencyProvider } from "@/hooks/use-currency";
import { DashboardShell } from "./dashboard-shell";
import { SplashScreen } from "./splash-screen";

export default function DashboardLayout({
  children,
  customHotkeys,
}: {
  children: React.ReactNode;
  customHotkeys?: Record<string, string | null>;
}) {
  return (
    <HotkeysProviderClient customHotkeys={customHotkeys}>
      <SplashScreen>
        <AlertProvider>
          <CurrencyProvider>
            <DashboardShell>{children}</DashboardShell>
          </CurrencyProvider>
        </AlertProvider>
      </SplashScreen>
    </HotkeysProviderClient>
  );
}
