"use client";

import type { ReactNode } from "react";
import { SidebarProvider } from "@/components/sidebar";
import { AppSidebar } from "./App-Sidebar";

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
			<div className="relative flex flex-col flex-1 min-h-full overflow-x-hidden">
				<main className="flex flex-col flex-1 relative overflow-x-hidden">{children}</main>
			</div>
		</SidebarProvider>
	);
}
