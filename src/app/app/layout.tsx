"use client";

import { SplashScreen } from "@/components/Splash-Screen";
import { SidebarProvider } from "@/components/sidebar";
import { AppSidebar } from "./AppSidebar";
import { FabProvider } from "@/hooks/use-fab";
import { HeaderProvider } from "@/hooks/use-header";
import { Header } from "@/components/Header";
import { edenClient, EdenProvider } from "@/lib/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { BottomNavigation } from "@/components/BottomNavigation";

const queryClient = new QueryClient();
export default function App(props: any) {
  return (
    <QueryClientProvider client={queryClient}>
      <EdenProvider client={edenClient} queryClient={new QueryClient()}>
        <SplashScreen>
          <HeaderProvider>
            <FabProvider>
              <SidebarProvider className="flex h-screen overflow-hidden">
                <AppSidebar />
                <div className="relative flex flex-col flex-1 min-h-full">
                  {/* Toolbar fixed at top */}
                  <Header />
                  {/* Scrollable main area */}
                  <div className="flex-1 overflow-auto relative">
                    {props.children}
                  </div>
                  {/* <BottomNavigation /> */}
                </div>
              </SidebarProvider>
            </FabProvider>
          </HeaderProvider>
        </SplashScreen>
      </EdenProvider>
    </QueryClientProvider>
  );
}
