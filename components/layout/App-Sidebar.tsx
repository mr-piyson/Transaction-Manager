'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Fuse from 'fuse.js';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Search, X, Check, ChevronDown, SidebarIcon, type LucideIcon } from 'lucide-react';

import { Tree, TreeItem, TreeItemLabel } from '@/components/reui/tree';
import { hotkeysCoreFeature, syncDataLoaderFeature, searchFeature } from '@headless-tree/core';
import { useTree } from '@headless-tree/react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import Logo from '@/components/Logo';
import type { AppActions, AppSubjects } from '@/lib/permissions';
import { apps, getAppFromPath } from '@/lib/apps';
import { cn } from '@/lib/utils';
import { NavUser } from './User-Options';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '../ui/input-group';
import { Kbd } from '../ui/kbd';

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
  const { isMobile, setOpen, setOpenMobile } = useSidebar();
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const locale = useLocale();
  const t = useTranslations();
  const isRtl = locale === 'ar';
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const itemIdByHref = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [id, data] of Object.entries(items)) {
      if (data.href) map[data.href] = id;
    }
    return map;
  }, [items]);

  const getItemIdForPath = useCallback(
    (path: string): string | undefined => {
      const exact = itemIdByHref[path];
      if (exact) return exact;
      const prefix = path.split('/').slice(0, 3).join('/');
      return itemIdByHref[prefix];
    },
    [itemIdByHref],
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

  const handleAppSwitch = useCallback(
    (slug: string) => {
      if (slug === currentApp?.slug) return;
      router.push(`/${slug}`);
    },
    [currentApp, router],
  );

  const expandedByDefault = useMemo(() => {
    return Object.entries(items)
      .filter(([, data]) => (data.children?.length ?? 0) > 0)
      .map(([id]) => id);
  }, [items]);

  const tree = useTree<TreeItemData>({
    initialState: {
      expandedItems: expandedByDefault,
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

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      tree.setSearch(value || null);
    },
    [tree],
  );

  const visibleItems = useMemo(() => {
    return tree.getItems().filter((item) => {
      const itemData = item.getItemData();
      if (!itemData.href) return false;
      if (searchQuery && matchingIds && !matchingIds.has(item.getId())) return false;
      return true;
    });
  }, [tree, searchQuery, matchingIds]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery]);

  // Scroll the focused item into view when arrow keys change selection
  useEffect(() => {
    if (focusedIndex < 0) return;
    const el = document.querySelector('[data-sidebar-focused="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < visibleItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : visibleItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < visibleItems.length) {
          const itemData = visibleItems[focusedIndex].getItemData();
          if (itemData.href) {
            handleNavigate(itemData.href);
          }
        }
      }
    },
    [visibleItems, focusedIndex, handleNavigate],
  );

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

  useEffect(() => {
    if (searchQuery) return;
    const itemId = getItemIdForPath(currentPath);
    if (!itemId) return;
    for (const ancestor of getAncestors(itemId)) {
      try {
        tree.getItemInstance(ancestor).expand();
      } catch {}
    }
  }, [currentPath, getItemIdForPath, getAncestors, tree, searchQuery]);

  // Cmd/Ctrl + K: focus search input (expand sidebar if collapsed)
  // Escape: clear search and blur input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        handleSearchChange('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setOpen, handleSearchChange]);

  const isActive = (href?: string) => {
    if (!href) return false;
    const prefix = currentPath.split('/').slice(0, 3).join('/');
    return prefix === href || currentPath === href;
  };

  return (
    <Sidebar side={isRtl ? 'right' : 'left'} collapsible="offcanvas" type="Drawer" {...props}>
      <SidebarHeader>
        <AppSwitcher
          currentApp={currentApp}
          t={t as (key: string) => string}
          onAppSwitch={handleAppSwitch}
          isRtl={isRtl}
        />
      </SidebarHeader>

      <SidebarContent>
        {/* Search */}
        <div className="relative w-full px-4">
          <InputGroup className="w-full">
            <InputGroupAddon align="inline-start">
              <Search className="size-3.5" />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchInputRef}
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <InputGroupAddon align="inline-end">
              {searchQuery ? (
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleSearchChange('')}
                >
                  <X className="size-3.5" />
                </InputGroupButton>
              ) : (
                <Kbd>
                  <span className="text-xs">⌘</span>K
                </Kbd>
              )}
            </InputGroupAddon>
          </InputGroup>
        </div>

        {/* Navigation */}
        <div className="overflow-auto">
          <Tree tree={tree} indent={indent} toggleIconType="chevron">
            {tree.getItems().map((item, itemIndex) => {
              const itemData = item.getItemData();
              const isFolder = item.isFolder();
              const active = !isFolder && itemData.href ? isActive(itemData.href) : false;
              const showSpinner = !isFolder && !!itemData.href && loading === itemData.href;

              if (searchQuery && matchingIds && !matchingIds.has(item.getId())) return null;

              const focusedItemIndex = visibleItems.findIndex((vi) => vi.getId() === item.getId());
              const isFocused = focusedItemIndex === focusedIndex && focusedIndex >= 0;

              const labelContent = (
                <>
                  {/* Active indicator: 3px colored bar on left edge */}
                  {active && <div className="absolute inset-s-0 h-6 w-1 rounded-sm bg-primary" />}
                  {itemData.icon && (
                    <itemData.icon
                      className={cn(
                        'size-4 shrink-0',
                        active ? 'text-primary' : 'text-foreground/80',
                      )}
                    />
                  )}
                  <span className="flex-1 truncate">{item.getItemName()}</span>
                  {showSpinner && <Spinner className="size-3 ml-auto shrink-0" />}
                </>
              );

              return (
                <TreeItem
                  key={item.getId()}
                  item={item}
                  className={cn(active && 'bg-primary/10!', isFocused && 'bg-accent!')}
                  data-sidebar-focused={isFocused || undefined}
                >
                  <TreeItemLabel
                    className={cn(
                      'w-full gap-2 bg-transparent! relative text-start! data-[search-match=true]:bg-transparent!',
                      active && 'text-primary font-semibold',
                      isFocused && 'bg-accent!',
                    )}
                    asChild={!isFolder && !!itemData.href}
                  >
                    {!isFolder && itemData.href ? (
                      <Link
                        href={itemData.href}
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavigate(itemData.href!);
                        }}
                        className="flex items-center gap-1 rounded-md py-1.5 px-2 text-sm"
                      >
                        {labelContent}
                      </Link>
                    ) : (
                      labelContent
                    )}
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
      <SidebarRail />
    </Sidebar>
  );
}

function AppSwitcher({
  currentApp,
  t,
  onAppSwitch,
  isRtl,
}: {
  currentApp: { slug: string; nameKey: string; icon: LucideIcon };
  t: (key: string) => string;
  onAppSwitch: (slug: string) => void;
  isRtl: boolean;
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              dir={isRtl ? 'rtl' : 'ltr'}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Logo className="size-8!" />

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-lg">{t(currentApp.nameKey)}</span>
              </div>
              <ChevronDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={'bottom'}
            align="start"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch Application
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {apps
              .filter((a) => a.isActive)
              .map((app) => (
                <DropdownMenuItem
                  key={app.slug}
                  onClick={() => onAppSwitch(app.slug)}
                  className={cn(
                    'gap-2 p-2 cursor-pointer',
                    app.slug === currentApp.slug && 'bg-accent',
                  )}
                >
                  <div className="flex size-6 items-center justify-center rounded-md bg-primary/10">
                    <app.icon className="size-3.5 text-primary" />
                  </div>
                  <span className="flex-1">{t(app.nameKey)}</span>
                  {app.slug === currentApp.slug && <Check className="size-4 text-primary" />}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
