"use client";

import * as React from "react";
import { Menu, Settings, Plus, User, LogOut, Bell, CreditCard } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFab } from "@/hooks/use-fab";

interface BottomNavigationProps {
  sidebarContent?: React.ReactNode;
  /** @deprecated Use useFabConfig hook instead for route-based FAB configuration */
  onFabClick?: () => void;
  /** @deprecated Use useFabConfig hook instead for route-based FAB configuration */
  fabIcon?: React.ReactNode;
  className?: string;
}

export function BottomNavigation({ sidebarContent, onFabClick, fabIcon, className }: BottomNavigationProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { config: fabConfig } = useFab();

  // Use context config, fall back to props for backwards compatibility
  const currentFabIcon = fabConfig.icon || fabIcon || <Plus className="size-6" />;
  const currentFabClick = fabConfig.onClick || onFabClick;
  const fabLabel = fabConfig.label || "Primary action";
  const fabVisible = fabConfig.visible ?? true;

  return (
    <>
      {/* Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[280px] sm:w-[320px]">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Navigate through your application</SheetDescription>
          </SheetHeader>
          <div className="mt-6">{sidebarContent || <DefaultSidebarContent />}</div>
        </SheetContent>
      </Sheet>

      {/* Bottom Navigation Bar */}
      <nav className={cn("fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80", className)}>
        <div className="relative mx-auto flex h-16 max-w-lg items-center justify-between px-6">
          {/* Sidebar Trigger */}
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar menu" className="size-11 rounded-full">
            <Menu className="size-5" />
          </Button>

          {/* FAB - Floating Action Button */}
          {fabVisible && (
            <div className="absolute left-1/2 -top-6 -translate-x-1/2">
              <Button size="icon" onClick={currentFabClick} aria-label={fabLabel} className="size-14 rounded-full shadow-lg hover:shadow-xl transition-shadow">
                {currentFabIcon}
              </Button>
            </div>
          )}

          {/* User Settings Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="User settings" className="size-11 rounded-full">
                <Avatar className="size-8">
                  <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
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
                <DropdownMenuItem>
                  <Bell className="mr-2 size-4" />
                  <span>Notifications</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CreditCard className="mr-2 size-4" />
                  <span>Billing</span>
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

function DefaultSidebarContent() {
  const menuItems = [
    { icon: <User className="size-4" />, label: "Dashboard" },
    { icon: <Bell className="size-4" />, label: "Notifications" },
    { icon: <CreditCard className="size-4" />, label: "Billing" },
    { icon: <Settings className="size-4" />, label: "Settings" },
  ];

  return (
    <div className="flex flex-col gap-1">
      {menuItems.map(item => (
        <Button key={item.label} variant="ghost" className="w-full justify-start gap-3">
          {item.icon}
          {item.label}
        </Button>
      ))}
    </div>
  );
}
