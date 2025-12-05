"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, ChevronDown, ChevronRight, Plus, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSubItem,
  useSidebar,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarRail,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuSubButton,
} from "@/components/sidebar";
import Logo from "@/components/Logo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { SidebarMenuAction, SidebarMenuSub } from "../ui/sidebar";
import Link from "next/link";
import { Route } from "next";
import { useI18n } from "@/hooks/use-i18n";
import { getTopLevel, routes } from "@/lib/routes";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

export function AppSidebar({ ...props }: AppSidebarProps) {
  const path = usePathname();
  const { direction } = useI18n();

  return (
    <Sidebar collapsible="icon" side={direction === "ltr" ? "left" : "right"} type="Drawer" {...props}>
      <SidebarHeader>
        <AppLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{path}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getTopLevel().map(route => (
                <Collapsible key={route.title}>
                  <SidebarMenuItem className={cn("group")}>
                    <SidebarMenuButton isActive={path === route.path} asChild>
                      <Link href={route.path as Route}>
                        <svg className={cn(route.icon)}></svg>
                        <span>{route.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="hidden bg-sidebar-accent text-sidebar-accent-foreground left-2 data-[state=open]:rotate-90" showOnHover>
                        <ChevronRight />
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <SidebarMenuAction showOnHover>{/* <Plus className="hidden group-hover:block" /> */}</SidebarMenuAction>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {/* {route.children?.map(page => (
                          <SidebarMenuSubItem key={page.name}>
                            <SidebarMenuSubButton asChild>
                              <a href="#">
                                <span>{page.emoji}</span>
                                <span>{page.name}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))} */}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function AppLogo() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="opacity-100! data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground" disabled>
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg  text-sidebar-primary-foreground">
            <Logo className="size-7" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-lg">Transaction Manager</span>
            <span className="truncate text-xs"></span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// Types
interface ActivityItem {
  title: string;
  path: string;
  icon: string;
  children?: ActivityItem[];
}

// Recursive function to check if any nested item is active
function hasActiveChild(item: ActivityItem, currentPath: string): boolean {
  if (isItemActive(item.path, currentPath)) return true;

  if (item.children) {
    return item.children.some(child => hasActiveChild(child, currentPath));
  }

  return false;
}

// Helper function to check if an item is active
function isItemActive(itemUrl: string, currentPath: string): boolean {
  console.log("ItemURL:", itemUrl, "CurrentPath:", currentPath);

  return currentPath === itemUrl;
}

// Recursive function to get all parent URLs for a given path
function getParentUrls(activities: ActivityItem[], targetPath: string): string[] {
  const parents: string[] = [];

  function findParents(items: ActivityItem[], currentParents: string[] = []): boolean {
    for (const item of items) {
      if (isItemActive(item.path, targetPath)) {
        parents.push(...currentParents);
        return true;
      }

      if (item.children) {
        if (findParents(item.children, [...currentParents, item.path])) {
          return true;
        }
      }
    }
    return false;
  }

  findParents(activities);
  return parents;
}

// Main Component
interface AppSidebarContentProps {
  role: string | undefined;
}
