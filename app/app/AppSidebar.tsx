"use client";

import { usePathname, useRouter } from "next/navigation";
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
  useSidebar,
} from "@/components/sidebar";
import Logo from "@/components/Logo";
// import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { useI18n } from "@/hooks/use-i18n";
import { sidebarRoutes } from "@/lib/routes";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

export function AppSidebar({ ...props }: AppSidebarProps) {
  const currentPath = usePathname();
  const { isMobile, open, setOpenMobile } = useSidebar();
  const router = useRouter();
  const [loading, setLoading] = useState("");
  // const { t } = useI18n();
  const i18n = useI18n();
  useEffect(() => {
    if (loading === currentPath) {
      console.log(i18n.t("common.assets"));
      if (loading !== "") setLoading("");
      setOpenMobile(false);
    }
  }, [currentPath, setOpenMobile, loading]);

  const isActive = (Activity: string) => {
    const url = currentPath.split("/").slice(0, 3).join("/");
    return url === Activity;
  };
  return (
    <Sidebar
      collapsible="icon"
      side={i18n.direction === "ltr" ? "left" : "right"}
      type="Drawer"
      {...props}
    >
      <SidebarHeader>
        <AppLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {sidebarRoutes.map(({ key, path, icon }) => (
              <SidebarMenuItem key={key}>
                <SidebarMenuButton
                  isActive={isActive(path)}
                  className={cn("flex", isActive(path) && "bg-primary!")}
                  tooltip={i18n.t(key)}
                  size={"lg"}
                  onClick={() => {
                    if (currentPath === path) {
                      return;
                    }
                    setLoading(path);
                    router.push(path);
                  }}
                >
                  <i
                    className={cn(
                      "ms-1 size-6 shrink-0",
                      icon,
                      isActive(path) ? "text-white" : "text-foreground/92",
                      loading === path && !open && !isMobile ? "hidden" : "",
                    )}
                  />
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={cn(
                        " text-base",
                        isActive(path) ? "text-white" : "text-foreground/92",
                        loading === path && !open && !isMobile ? "hidden" : "",
                      )}
                    >
                      {i18n.t(key)}
                    </span>
                    {loading === path && <Spinner />}
                  </div>
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
        <SidebarMenuButton
          size="lg"
          className="opacity-100! data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          disabled
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg  text-sidebar-primary-foreground">
            <Logo className=" size-7!" />
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
    return item.children.some((child) => hasActiveChild(child, currentPath));
  }

  return false;
}

// Helper function to check if an item is active
function isItemActive(itemUrl: string, currentPath: string): boolean {
  return currentPath === itemUrl;
}

// Recursive function to get all parent URLs for a given path
function getParentUrls(
  activities: ActivityItem[],
  targetPath: string,
): string[] {
  const parents: string[] = [];

  function findParents(
    items: ActivityItem[],
    currentParents: string[] = [],
  ): boolean {
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
