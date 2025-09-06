"use client";

import AppLogo from "@/Assets/Icons/Logo";
import { ThemeSwitcher } from "@/components/Theme-Provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommandShortcut } from "@/components/ui/command";
import {
  SidebarGroup,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePathname, useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface AppProps {
  children: React.ReactNode;
  account: Account | null;
}

export default function App(props: AppProps) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <SidebarProvider>
        <AppSidebar account={props.account} />
        <SidebarInset>
          <Toolbar account={props.account} />
          <div className="w-full h-full overflow-hidden">{props.children}</div>
        </SidebarInset>
      </SidebarProvider>
    </QueryClientProvider>
  );
}

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// This is sample data.

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  account: Account | null;
}

export function AppSidebar({ ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" type="Drawer" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <AppSidebarContent role={props.account?.role} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

export function TeamSwitcher() {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="!opacity-100 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          disabled
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg  text-sidebar-primary-foreground">
            <AppLogo className="size-7" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-lg">
              Transaction Manager
            </span>
            <span className="truncate text-xs"></span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

import { signOut } from "@/app/Auth/auth.actions";
import { Button } from "@/components/ui/button";
import { Account } from "@prisma/client";
import { ChevronsUpDown, Loader2, LogOut, Moon } from "lucide-react";
import { Toolbar } from "./Toolbar";
import { AppSidebarContent } from "./Sidebar";

// This component renders the user profile in the sidebar, allowing users to switch themes and log out.
export function UserMenu({ account }: { account: Account | null }) {
  const { isMobile } = useSidebar();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={"ghost"}
          className=" data-[state=open]:border-border  border-2 border-transparent"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={account?.image ?? undefined}
              alt={account?.name}
            />
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
              <AvatarImage
                src={account?.image ?? undefined}
                alt={account?.name}
                covered
              />
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
          <DropdownMenuItem>
            <Moon />
            Dark Mode
            <CommandShortcut>
              <ThemeSwitcher />
            </CommandShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
          }}
        >
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
