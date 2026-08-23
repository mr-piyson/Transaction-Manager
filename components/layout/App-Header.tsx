"use client";

import { type LucideIcon, MoreHorizontal, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { CommandPaletteTrigger } from "@/components/command-palette";
import { NavUser } from "@/components/layout/User-Options";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SidebarToggleButton } from "./App-Sidebar";

export interface PageAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
}

interface HeaderProps {
  title?: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  showBorder?: boolean;
  sticky?: boolean;
  transparent?: boolean;
  className?: string;
  description?: string;
  actions?: PageAction[];
  rightContent?: ReactNode;
  children?: ReactNode;
}

export function Header({
  title,
  subtitle,
  icon,
  showBorder = true,
  sticky = true,
  transparent = false,
  className,
  description,
  actions,
  rightContent,
  children,
}: HeaderProps) {
  const _t = useTranslations();
  return (
    <header
      className={cn(
        "flex h-14 items-center gap-2 px-2 z-50 transition-all duration-300 print:hidden",
        sticky && "sticky top-0",
        transparent
          ? "bg-transparent"
          : "bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/60",
        showBorder && "border-b border-border",
        className,
      )}
    >
      <SidebarToggleButton />
      <Separator
        orientation="vertical"
        className="bg-border w-1 h-1/2 rounded-2xl"
      />

      {/* Left Section */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-2 truncate">
          {title && (
            <div className="flex flex-row gap-2 items-center truncate">
              {icon && (
                <span className="text-muted-foreground shrink-0">{icon}</span>
              )}
              <div className="truncate">
                <h1 className="text-lg font-semibold capitalize truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground truncate">
                    {subtitle}
                  </p>
                )}
              </div>
              {description && (
                <p className="text-sm text-muted-foreground truncate hidden sm:block">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Children / Actions */}
      {children && (
        <div className="flex items-center gap-2 shrink-0">{children}</div>
      )}
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          {actions.slice(0, 1).map((action, i) => {
            const Icon = action.icon ?? Plus;
            return (
              <Button
                key={i}
                size="sm"
                variant={action.variant ?? "default"}
                onClick={action.onClick}
              >
                <Icon className="size-4 mr-1" />
                <span className="hidden sm:block">{action.label}</span>
              </Button>
            );
          })}
          {actions.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.slice(1).map((action, i) => {
                  const Icon = action.icon ?? Plus;
                  return (
                    <DropdownMenuItem
                      key={i}
                      onClick={action.onClick}
                      className="cursor-pointer"
                    >
                      <Icon className="size-4 mr-2" />
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      )}
      {/* Command Palette */}
      <CommandPaletteTrigger />
      {/* User DropDown */}
      <NavUser />
    </header>
  );
}
