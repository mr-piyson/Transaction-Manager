'use client';

import { SplashScreen } from '@/components/Splash-Screen';
import { SidebarProvider } from '@/components/sidebar';
import { AppSidebar } from './AppSidebar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertProvider } from '@/components/Alert-dialog';
import { BottomNavigation } from '@/components/nav-bar';
// import { BottomNavigation } from "@/components/BottomNavigation";
export const queryClient = new QueryClient();

export default function App(props: any) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* <SplashScreen> */}
      <AlertProvider>
        <SidebarProvider className="flex h-screen overflow-hidden">
          <AppSidebar />
          <div className="relative flex flex-col flex-1 min-h-full">
            {/* Toolbar fixed at top */}
            {/* Scrollable main area */}
            <div className="flex flex-col flex-1 overflow-auto relative">
              {props.children}
            </div>
            {/* Bottom Navigation */}
            <BottomNavigation />
          </div>
        </SidebarProvider>
      </AlertProvider>
      {/* </SplashScreen> */}
    </QueryClientProvider>
  );
}
