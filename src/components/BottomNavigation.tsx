"use client";

import * as React from "react";
import { Menu, Settings, Plus, User, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFab } from "@/hooks/use-fab";
import { useSidebar } from "./sidebar";

interface BottomNavigationProps {
  sidebarContent?: React.ReactNode;
  /** @deprecated Use useFabConfig hook instead for route-based FAB configuration */
  onFabClick?: () => void;
  /** @deprecated Use useFabConfig hook instead for route-based FAB configuration */
  fabIcon?: React.ReactNode;
  className?: string;
}

export function BottomNavigation({ sidebarContent, onFabClick, fabIcon, className }: BottomNavigationProps) {
  const { config: fabConfig } = useFab();
  const { setOpenMobile } = useSidebar();

  // Use context config, fall back to props for backwards compatibility
  const currentFabIcon = fabConfig.icon || fabIcon || <Plus className="size-6" />;
  const currentFabClick = fabConfig.onClick || onFabClick;
  const fabLabel = fabConfig.label || "Primary action";
  const fabVisible = fabConfig.visible ?? true;
  const renderFab = fabConfig.render;

  function openSidebar(): void {
    setOpenMobile(true);
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className={cn("print:hidden bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80", className)}>
        <div className="relative mx-auto flex h-16 max-w-lg items-center justify-between px-6">
          {/* Sidebar Trigger */}
          <Button variant="ghost" size="icon" onClick={() => openSidebar()} aria-label="Open sidebar menu" className="size-11 rounded-full">
            <Menu className="size-5" />
          </Button>

          {/* FAB - Floating Action Button */}
          {fabVisible &&
            (renderFab ? (
              renderFab()
            ) : (
              <Button variant="default" size="icon" onClick={currentFabClick} aria-label={fabLabel} className="absolute -top-6 left-1/2 -translate-x-1/2 size-14 rounded-full shadow-lg">
                {currentFabIcon}
              </Button>
            ))}

          {/* User Settings Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="User settings" className="size-11 rounded-full">
                <Avatar className="size-8">
                  <AvatarImage alt="User" />
                  <AvatarFallback>
                    <User className="size-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" sideOffset={12} className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">John Doe</p>
                  <p className="text-xs leading-none text-muted-foreground">john@example.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <User className="mr-2 size-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 size-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <LogOut className="mr-2 size-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </>
  );
}
