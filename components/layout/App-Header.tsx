"use client";

import { type LucideIcon, MoreHorizontal, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { CommandPaletteTrigger } from "@/components/command-palette";
import { NavUser } from "@/components/layout/User-Options";
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
      {/* Command Palette */}
      <CommandPaletteTrigger />
      {/* User DropDown */}
      <NavUser />
    </header>
  );
}
