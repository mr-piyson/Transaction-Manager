"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/App-Sidebar";
import { SidebarProvider } from "@/components/sidebar";

interface DashboardShellProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export function DashboardShell({
  children,
  showSidebar = true,
}: DashboardShellProps) {
  return (
    <SidebarProvider className="flex">
      {showSidebar && <AppSidebar />}
      <div className="relative flex w-full min-w-0 flex-col flex-1">
        <main className="flex w-full min-w-0 flex-col flex-1 relative">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
