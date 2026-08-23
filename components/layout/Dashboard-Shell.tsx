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
			<div className="relative flex w-full min-w-0 flex-col flex-1">
				<main className="flex w-full min-w-0 flex-col flex-1 relative">
					{children}
				</main>
			</div>
		</SidebarProvider>
	);
}
