import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSubItem, useSidebar, Sidebar, SidebarHeader, SidebarContent, SidebarRail } from "@/components/sidebar";
import { Activities } from "@/lib/routes";
import Logo from "@/components/Logo";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

export function AppSidebar({ ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" type="Drawer" {...props}>
      <SidebarHeader>
        <AppLogo />
      </SidebarHeader>
      <SidebarContent>
        <AppSidebarContent />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function AppLogo() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="!opacity-100 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground" disabled>
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
  url: string;
  icon: string;
  children?: ActivityItem[];
  expandable?: boolean; // For items that have children but no direct URL
}

// Activities configuration with nested structure
const ACTIVITIES_CONFIG: Record<string, ActivityItem[]> = {
  Admin: [
    {
      title: "Home",
      url: "/App",
      icon: "icon-[iconamoon--home]",
    },
    {
      title: "Dashboard",
      url: "/app/Dashboard",
      icon: "icon-[solar--chart-square-linear]",
    },
    {
      title: "Sales",
      url: "/app/Sales",
      icon: "icon-[stash--folder-alt]",
    },
    {
      title: "Customers",
      url: "/app/Customers",
      icon: "icon-[bi--people]",
    },
    {
      title: "Accounts",
      url: "/app/Accounts",
      icon: "icon-[hugeicons--user-account]",
    },
    {
      title: "Inventory",
      url: "/app/Inventory",
      icon: "icon-[solar--box-outline]",
    },
    {
      title: "Notes",
      url: "/app/Notes",
      icon: "icon-[mage--note]",
    },
    {
      title: "Settings",
      url: "/app/Settings",
      icon: "icon-[solar--settings-linear]",
    },
  ],
  User: [
    {
      title: "Dashboard",
      url: "/app/Dashboard",
      icon: "icon-[solar--chart-square-linear]",
    },
    {
      title: "Sales",
      url: "/app/Sales",
      icon: "icon-[stash--folder-alt]",
    },
  ],
};

// Optimized Activities function
export const getActivitiesForRole = (role: string | undefined | null): ActivityItem[] => {
  if (!role) return [];
  return ACTIVITIES_CONFIG[role] || [];
};

// Recursive function to check if any nested item is active
function hasActiveChild(item: ActivityItem, currentPath: string): boolean {
  if (isItemActive(item.url, currentPath)) return true;

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
      if (isItemActive(item.url, targetPath)) {
        parents.push(...currentParents);
        return true;
      }

      if (item.children) {
        if (findParents(item.children, [...currentParents, item.url])) {
          return true;
        }
      }
    }
    return false;
  }

  findParents(activities);
  return parents;
}

// Menu Item Component with recursive rendering
interface MenuItemComponentProps {
  item: ActivityItem;
  currentPath: string;
  loading: string;
  onItemClick: (url: string) => void;
  showContent: boolean;
  level: number;
  expandedItems: Set<string>;
  onToggleExpand: (url: string) => void;
}

function MenuItemComponent({ item, currentPath, loading, onItemClick, showContent, level, expandedItems, onToggleExpand }: MenuItemComponentProps) {
  const isActive = isItemActive(item.url, currentPath);
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.url);
  const hasActiveDescendant = hasActiveChild(item, currentPath);
  const isLoading = loading === item.url;

  const handleClick = () => {
    if (hasChildren) {
      onToggleExpand(item.url);
    }

    if (item.url && !item.expandable) {
      onItemClick(item.url);
    }
  };

  const MenuItemWrapper = level === 0 ? SidebarMenuItem : SidebarMenuSubItem;

  return (
    <>
      <MenuItemWrapper
        style={{
          marginLeft: level === 0 ? 0 : level * 12 + 4,
        }}
      >
        <SidebarMenuButton
          isActive={isActive}
          className={cn("group-data-[collapsible=icon]:p-1! flex data-[active=true]:bg-primary data-[active=false]:text-primary-foreground ", hasActiveDescendant && !isActive && "bg-primary/10")}
          tooltip={item.title}
          size="default"
          onClick={handleClick}
          style={{
            marginLeft: level === 0 ? 0 : level * 12 + 4,
          }}
        >
          <div className=" flex items-center gap-2 flex-1 min-w-0">
            <i className={cn(" size-6 shrink-0", item.icon, isActive ? "text-white" : "text-foreground/92", isLoading && !showContent ? "hidden" : "")} />

            <div className="flex items-center justify-between w-full min-w-0">
              <span className={cn("text-base truncate", isActive ? "text-white" : "text-foreground/92", isLoading && !showContent ? "hidden" : "")}>{item.title}</span>

              <div className=" flex items-center gap-1 shrink-0">
                {isLoading && <Loader2 className="ms-1 size-4 animate-spin text-foreground/60" />}

                {hasChildren && showContent && (
                  <>
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        onToggleExpand(item.url);
                      }}
                      className="p-1 hover:bg-background/20 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className={cn("text-muted-foreground size-3", isActive && "text-white")} />
                      ) : (
                        <ChevronRight className={cn("text-muted-foreground size-3", isActive && "text-white")} />
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </SidebarMenuButton>
      </MenuItemWrapper>

      {hasChildren && isExpanded && (
        <div className={cn("transition-all duration-200", !showContent && "hidden")}>
          {item.children!.map(child => (
            <MenuItemComponent
              key={child.title}
              item={child}
              currentPath={currentPath}
              loading={loading}
              onItemClick={onItemClick}
              showContent={showContent}
              level={level + 1}
              expandedItems={expandedItems}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </>
  );
}

// Main Component
interface AppSidebarContentProps {
  role: string | undefined;
}

export function AppSidebarContent() {
  const { isMobile, open, setOpenMobile } = useSidebar();
  const router = useRouter();
  const path = usePathname();
  const [loading, setLoading] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Memoize activities to prevent unnecessary recalculations
  const activities = Activities();

  // Auto-expand parent items based on current path
  useEffect(() => {
    const parentUrls = getParentUrls(activities, path);
    if (parentUrls.length > 0) {
      setExpandedItems(prev => new Set([...prev, ...parentUrls]));
    }
  }, [path, activities]);

  // Reset loading state when path changes
  useEffect(() => {
    if (loading && loading === path) {
      setLoading("");
      setOpenMobile(false);
    }
  }, [path, loading, setOpenMobile]);

  // Handle expand/collapse
  const handleToggleExpand = useCallback((url: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }
      return newSet;
    });
  }, []);

  // Optimize the click handler
  const handleItemClick = useCallback(
    (url: any) => {
      const currentBaseUrl = path.match(/^\/App\/[^/]+/)?.[0];

      if (currentBaseUrl === url) {
        setLoading("");
      } else {
        setLoading(url);
        router.push(url);
      }
    },
    [path, router]
  );

  // Determine if content should be shown
  const showContent = open || isMobile;

  // Early return if no activities
  if (activities.length === 0) {
    return null;
  }

  return (
    <>
      <SidebarGroup>
        <SidebarMenu>
          {activities.map(activity => (
            <MenuItemComponent
              key={activity.title}
              item={activity}
              currentPath={path}
              loading={loading}
              onItemClick={handleItemClick}
              showContent={showContent}
              level={0}
              expandedItems={expandedItems}
              onToggleExpand={handleToggleExpand}
            />
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
