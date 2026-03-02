"use client";

import { SplashScreen } from "@/components/Splash-Screen";
import { SidebarProvider } from "@/components/sidebar";
import { AppSidebar } from "./AppSidebar";
import { FabProvider } from "@/hooks/use-fab";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/client";
import { AlertProvider } from "@/components/Alert-dialog";
// import { BottomNavigation } from "@/components/BottomNavigation";

export default function App(props: any) {
  return (
    <QueryClientProvider client={queryClient}>
      <SplashScreen>
        <FabProvider>
          <AlertProvider>
            <SidebarProvider className="flex h-screen overflow-hidden">
              <AppSidebar />
              <div className="relative flex flex-col flex-1 min-h-full">
                {/* Toolbar fixed at top */}
                {/* Scrollable main area */}
                <div className="flex-1 overflow-auto relative">
                  {props.children}
                </div>
                {/* <BottomNavigation /> */}
              </div>
            </SidebarProvider>
          </AlertProvider>
        </FabProvider>
      </SplashScreen>
    </QueryClientProvider>
  );
}
