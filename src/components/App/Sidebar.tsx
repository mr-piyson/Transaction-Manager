"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarRail,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/sidebar";
import Logo from "@/components/Logo";
// import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { SidebarMenuAction, SidebarMenuSub } from "../ui/sidebar";
import Link from "next/link";
import { Route } from "next";
import { useI18n } from "@/hooks/use-i18n";
import { getTopLevel, routes, sidebarRoutes } from "@/lib/routes";
import { useEffect, useState } from "react";
import { Spinner } from "../ui/spinner";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

export function AppSidebar({ ...props }: AppSidebarProps) {
  const currentPath = usePathname();
  const { direction } = useI18n();
  const { isMobile, open, setOpenMobile } = useSidebar();
  const router = useRouter();
  const [loading, setLoading] = useState("");

  useEffect(() => {
    if (loading === currentPath) {
      setLoading("");
      setOpenMobile(false);
    }
  }, [currentPath, setOpenMobile, loading]);

  const isActive = (Activity: string) => {
    const url = currentPath.split("/").slice(0, 3).join("/");
    return url === Activity;
  };

  return (
    <Sidebar collapsible="icon" side={direction === "ltr" ? "left" : "right"} type="Drawer" {...props}>
      <SidebarHeader>
        <AppLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {sidebarRoutes.map(({ title, path, icon }) => (
              <SidebarMenuItem key={title}>
                <SidebarMenuButton
                  isActive={isActive(path)}
                  className={cn("flex", isActive(path) && "bg-primary!")}
                  tooltip={title}
                  size={"lg"}
                  onClick={() => {
                    if (currentPath === path) {
                      return;
                    }
                    setLoading(path);
                    router.push(path);
                  }}
                >
                  {/* <Link href={url} className="flex justify-center items-center"> */}
                  <i className={cn("ms-1 size-6 shrink-0", icon, isActive(path) ? "text-white" : "text-foreground/92", loading === path && !open && !isMobile ? "hidden" : "")} />
                  <div className="flex items-center justify-between w-full">
                    <span className={cn(" text-base", isActive(path) ? "text-white" : "text-foreground/92", loading === path && !open && !isMobile ? "hidden" : "")}>{title}</span>
                    {loading === path && <Spinner />}
                  </div>
                  {/* </Link> */}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
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
        <Link href={"/app"}>
          <SidebarMenuButton size="lg" className="opacity-100! data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg  text-sidebar-primary-foreground">
              <Logo className="me-2 size-7!" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-lg">Transaction Manager</span>
              <span className="truncate text-xs"></span>
            </div>
          </SidebarMenuButton>
        </Link>
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
