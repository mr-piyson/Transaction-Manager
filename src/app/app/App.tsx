"use client";
import { SplashScreen } from "@/components/Splash-Screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/sidebar";
import { AppSidebar } from "./Sidebar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { FabProvider } from "@/hooks/use-fab";
import { useIsMobile } from "@/hooks/use-mobile";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export default function App(props: any) {
  const isMobile = useIsMobile();
  return (
    <SplashScreen>
      <QueryClientProvider client={queryClient}>
        <FabProvider>
          <SidebarProvider className="flex h-screen overflow-hidden">
            <AppSidebar />
            <div className="relative flex flex-col flex-1 min-h-full">
              {/* Toolbar fixed at top */}
              {/* <Toolbar className="sticky top-0 z-10" /> */}

              {/* Scrollable main area */}
              <div className="flex-1 overflow-auto relative">{props.children}</div>
              {isMobile && <BottomNavigation />}
            </div>
          </SidebarProvider>
        </FabProvider>
      </QueryClientProvider>
    </SplashScreen>
  );
}
