'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Fuse from 'fuse.js';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Search, X, SidebarIcon, ChevronDown, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { Tree, TreeItem, TreeItemLabel } from '@/components/reui/tree';
import { hotkeysCoreFeature, syncDataLoaderFeature, searchFeature } from '@headless-tree/core';
import { useTree } from '@headless-tree/react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  useSidebar,
} from '@/components/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import Logo from '@/components/Logo';
import type { AppActions, AppSubjects } from '@/lib/permissions';
import { apps, getAppFromPath } from '@/lib/apps';
import { cn } from '@/lib/utils';
import { NavUser } from './User-Options';

export type RouteConfig = {
  type: 'item' | 'group';
  label: string;
  href?: string;
  icon?: LucideIcon;
  children?: RouteConfig[];
  auth?: { action: AppActions; subject: AppSubjects };
  search?: {
    keywords?: string[];
    hidden?: boolean;
  };
};

interface TreeItemData {
  name: string;
  href?: string;
  icon?: LucideIcon;
  children?: string[];
  keywords?: string[];
  appSlug?: string;
  type: 'app' | 'group' | 'item';
}

function buildSidebarItems(t: (key: string) => string): Record<string, TreeItemData> {
  const items: Record<string, TreeItemData> = {};
  const rootChildren: string[] = [];

  for (const app of apps.filter((a) => a.isActive)) {
    const appId = app.slug;
    const appChildren: string[] = [];
    rootChildren.push(appId);

    const routes = app.getRoutes(t);

    items[appId] = {
      name: t(app.nameKey),
      icon: app.icon,
      children: appChildren,
      type: 'app',
      appSlug: app.slug,
    };

    for (const route of routes) {
      if (route.children && route.children.length > 0) {
        const groupId = `${appId}::${route.label}`;
        const groupChildren: string[] = [];
        appChildren.push(groupId);

        items[groupId] = {
          name: route.label,
          children: groupChildren,
          type: 'group',
        };

        for (const child of route.children) {
          const childId = child.href
            ? child.href.replace(/\//g, '::')
            : `${groupId}::${child.label}`;
          groupChildren.push(childId);

          items[childId] = {
            name: child.label,
            href: child.href ?? undefined,
            icon: child.icon,
            keywords: child.search?.keywords,
            type: 'item',
          };
        }
      } else {
        const itemId = route.href ? route.href.replace(/\//g, '::') : `${appId}::${route.label}`;
        appChildren.push(itemId);

        items[itemId] = {
          name: route.label,
          href: route.href ?? undefined,
          icon: route.icon,
          keywords: route.search?.keywords,
          type: 'item',
        };
      }
    }
  }

  items['__root__'] = {
    name: 'Root',
    children: rootChildren,
    type: 'group',
  };

  return items;
}

const indent = 20;

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

export function AppSidebar({ ...props }: AppSidebarProps) {
  const currentPath = usePathname();
  const { isMobile, open, setOpenMobile } = useSidebar();
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const locale = useLocale();
  const t = useTranslations();
  const isRtl = locale === 'ar';

  const currentApp = getAppFromPath(currentPath);

  const items = useMemo(() => buildSidebarItems(t as (key: string) => string), [t]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const fuse = useMemo(() => {
    const searchable = Object.entries(items)
      .filter(([id]) => id !== '__root__')
      .map(([id, data]) => ({
        id,
        name: data.name,
        keywords: data.keywords ?? [],
      }));
    return new Fuse(searchable, {
      keys: ['name', 'keywords'],
      threshold: 0.4,
      includeScore: true,
    });
  }, [items]);

  const parentMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [id, data] of Object.entries(items)) {
      for (const childId of data.children ?? []) {
        map[childId] = id;
      }
    }
    return map;
  }, [items]);

  const getAncestors = useCallback(
    (id: string): string[] => {
      const ancestors: string[] = [];
      let current = id;
      while (parentMap[current] && current !== '__root__') {
        current = parentMap[current];
        if (current !== '__root__') ancestors.push(current);
      }
      return ancestors;
    },
    [parentMap],
  );

  const matchingIds = useMemo(() => {
    if (!searchQuery.trim()) return null;

    const results = fuse.search(searchQuery.trim());
    const matchedLeafIds = new Set(results.map((r) => r.item.id));

    const allIds = new Set<string>(matchedLeafIds);
    for (const id of matchedLeafIds) {
      for (const ancestor of getAncestors(id)) {
        allIds.add(ancestor);
      }
    }

    return allIds;
  }, [searchQuery, fuse, getAncestors]);

  const matchingIdsRef = useRef<typeof matchingIds>(null);
  matchingIdsRef.current = matchingIds;

  const handleNavigate = useCallback(
    (href: string) => {
      if (currentPath === href) return;
      setLoading(href);
      router.push(href);
    },
    [currentPath, router],
  );

  const tree = useTree<TreeItemData>({
    initialState: {
      expandedItems: currentApp ? [currentApp.slug] : ['erp'],
      search: null,
    },
    indent,
    rootItemId: '__root__',
    getItemName: (item) => item.getItemData().name,
    isItemFolder: (item) => {
      const data = item.getItemData();
      return (data.children?.length ?? 0) > 0;
    },
    dataLoader: {
      getItem: (itemId) => itemsRef.current[itemId],
      getChildren: (itemId) => itemsRef.current[itemId]?.children ?? [],
    },
    features: [syncDataLoaderFeature, hotkeysCoreFeature, searchFeature],
    isSearchMatchingItem: (_search, item) => {
      const set = matchingIdsRef.current;
      if (!set) return true;
      return set.has(item.getId());
    },
    onPrimaryAction: (item) => {
      const data = item.getItemData();
      if (data.href) {
        handleNavigate(data.href);
      }
    },
  });

  useEffect(() => {
    if (searchQuery.trim() && matchingIds) {
      for (const id of matchingIds) {
        if (id !== '__root__') {
          try {
            tree.getItemInstance(id).expand();
          } catch {}
        }
      }
    }
  }, [searchQuery, matchingIds, tree]);

  useEffect(() => {
    if (loading === currentPath) {
      if (loading !== '') setLoading('');
      setOpenMobile(false);
    }
  }, [currentPath, setOpenMobile, loading]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    tree.setSearch(value || null);
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    const prefix = currentPath.split('/').slice(0, 3).join('/');
    return prefix === href || currentPath === href;
  };

  return (
    <Sidebar side={isRtl ? 'right' : 'left'} collapsible="icon" type="Drawer" {...props}>
      <SidebarHeader>
        <AppSidebarHeader currentApp={currentApp} t={t as (key: string) => string} isRtl={isRtl} />
      </SidebarHeader>

      <SidebarContent>
        <div className="relative px-2 pb-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <SidebarInput
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 pr-7"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-auto">
          <Tree tree={tree} indent={indent} toggleIconType="chevron">
            {tree.getItems().map((item) => {
              const itemData = item.getItemData();
              const isFolder = item.isFolder();
              const active = !isFolder && itemData.href ? isActive(itemData.href) : false;
              const showSpinner = !isFolder && !!itemData.href && loading === itemData.href;

              if (searchQuery && matchingIds && !matchingIds.has(item.getId())) return null;

              return (
                <TreeItem
                  key={item.getId()}
                  item={item}
                  className={cn(active && 'bg-primary! text-primary-foreground!')}
                >
                  <TreeItemLabel
                    className={cn(
                      'w-full gap-2 bg-transparent',
                      active && 'text-primary-foreground! bg-primary! ',
                    )}
                  >
                    {itemData.icon && (
                      <itemData.icon
                        className={cn(
                          'size-4 shrink-0',
                          active ? 'text-primary-foreground' : 'text-foreground/80',
                        )}
                      />
                    )}
                    <span className="flex-1 truncate">{item.getItemName()}</span>
                    {showSpinner && <Spinner className="size-3 ml-auto shrink-0" />}
                  </TreeItemLabel>
                </TreeItem>
              );
            })}

            {searchQuery &&
              tree.getItems().filter((item) => matchingIds?.has(item.getId())).length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  No results found
                </div>
              )}
          </Tree>
        </div>
      </SidebarContent>

      <SidebarFooter>{!isMobile && <NavUser />}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function AppSwitcher({
  currentApp,
  t,
}: {
  currentApp: { slug: string; nameKey: string; icon: LucideIcon };
  t: (key: string) => string;
}) {
  const router = useRouter();

  const handleSwitch = (slug: string) => {
    if (slug === currentApp.slug) return;
    router.push(`/${slug}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center gap-2 px-2 justify-start h-9 data-[state=open]:bg-accent"
        >
          <currentApp.icon className="size-4 shrink-0" />
          <span className="text-sm font-medium truncate flex-1 text-left">
            {t(currentApp.nameKey)}
          </span>
          <ChevronDown className="size-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-48">
        {apps
          .filter((a) => a.isActive)
          .map((app) => {
            const AppIcon = app.icon;
            return (
              <DropdownMenuItem
                key={app.slug}
                onClick={() => handleSwitch(app.slug)}
                className={app.slug === currentApp.slug ? 'bg-accent font-medium' : ''}
              >
                <AppIcon className="size-4 mr-2" />
                <span>{t(app.nameKey)}</span>
              </DropdownMenuItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppSidebarHeader({
  currentApp,
  t,
  isRtl,
}: {
  currentApp: { slug: string; nameKey: string; icon: LucideIcon };
  t: (key: string) => string;
  isRtl: boolean;
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link href={`/${currentApp.slug}`}>
          <SidebarMenuButton
            size="lg"
            dir={isRtl ? 'rtl' : 'ltr'}
            className="flex flex-row opacity-100! data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
              <Logo className="size-7!" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-lg">{t('layout.appTitle')}</span>
            </div>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <AppSwitcher currentApp={currentApp} t={t} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function SidebarToggleButton(props: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();
  const t = useTranslations();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label={t('layout.toggleSidebar')}
      {...props}
    >
      <SidebarIcon className="size-5" />
    </Button>
  );
}
