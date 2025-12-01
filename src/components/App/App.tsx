"use client";

import { ThemeSwitcher } from "@/components/Theme-Provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommandShortcut } from "@/components/ui/command";
import { SidebarProvider, useSidebar } from "@/components/sidebar";
import { useRouter } from "next/navigation";

import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface AppProps {
  children: React.ReactNode;
}

export default function App(props: AppProps) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <SidebarProvider className="flex h-screen overflow-hidden">
        <AppSidebar />
        <div className="relative flex flex-col flex-1 min-h-full">
          {/* Toolbar fixed at top */}
          <Toolbar className="sticky top-0 z-10" />

          {/* Scrollable main area */}
          <div className="flex-1 overflow-auto relative">{props.children}</div>
        </div>
      </SidebarProvider>
    </QueryClientProvider>
  );
}

// This is sample data.

import { Button } from "@/components/ui/button";
import { ChevronsUpDown, LogOut, Moon } from "lucide-react";
import { Toolbar } from "./Toolbar";
import { AppSidebar } from "./Sidebar";
import { signOut } from "@/lib/auth";
import { useTheme } from "next-themes";

// This component renders the user profile in the sidebar, allowing users to switch themes and log out.
export function UserMenu() {
  const theme = useTheme();
  const { isMobile } = useSidebar();
  const router = useRouter();
  const account = {
    name: "John Doe",
    email: "q3m9t@example.com",
    image: "",
    role: "admin",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={"ghost"} className=" data-[state=open]:border-border  border-2 border-transparent">
          <Avatar className="h-8 w-8">
            <AvatarImage src={account?.image ?? undefined} alt={account?.name} />
            <AvatarFallback>{account?.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="max-sm:hidden grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{account?.name}</span>
            <span className="truncate text-xs">{account?.email}</span>
          </div>
          <ChevronsUpDown className="max-sm:hidden ml-auto size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="bg-popover/95 backdrop-blur supports-[backdrop-filter]:bg-popover/85 w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        side={"bottom"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 ">
              <AvatarImage src={account?.image ?? undefined} alt={account?.name} covered />
              <AvatarFallback>{account?.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{account?.name}</span>
              <span className="truncate text-xs">{account?.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => theme.setTheme(theme.resolvedTheme === "dark" ? "light" : "dark")}>
            <Moon />
            Dark Mode
            <CommandShortcut>
              <ThemeSwitcher />
            </CommandShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={async () => await signOut()}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
