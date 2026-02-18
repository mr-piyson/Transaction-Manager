"use client";
import { SplashScreen } from "@/components/Splash-Screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/sidebar";
import { AppSidebar } from "./Sidebar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { FabProvider } from "@/hooks/use-fab";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeaderProvider } from "@/hooks/use-header";
import { Header } from "@/components/Header";

import { queryClient } from "@/lib/client";

export default function App(props: any) {
  const isMobile = useIsMobile();
  return (
    <SplashScreen>
      <QueryClientProvider client={queryClient}>
        <HeaderProvider>
          <FabProvider>
            <SidebarProvider className="flex h-screen overflow-hidden">
              <AppSidebar />
              <div className="relative flex flex-col flex-1 min-h-full">
                {/* Toolbar fixed at top */}
                {/* {isMobile && <Header />} */}
                <Header />

                {/* Scrollable main area */}
                <div className="flex-1 overflow-auto relative">{props.children}</div>
                {isMobile && <BottomNavigation />}
              </div>
            </SidebarProvider>
          </FabProvider>
        </HeaderProvider>
      </QueryClientProvider>
    </SplashScreen>
  );
}
