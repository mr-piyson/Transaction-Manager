'use client';

import {
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  FilePenLine,
  Handshake,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Settings,
  ShoppingCart,
  SidebarIcon,
  Truck,
  User,
  Users,
  Warehouse,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { AppActions, AppSubjects } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { NavUser } from './User-Options';

// 1. Define what a single route looks like
export type RouteConfig = {
  type: 'item' | 'group';
  label: string; // optional fallback
  href?: string;
  icon?: LucideIcon;
  children?: RouteConfig[];
  auth?: { action: AppActions; subject: AppSubjects };
  // 🔍 search metadata
  search?: {
    keywords?: string[]; // additional keywords for search
    hidden?: boolean; // exclude from search
  };
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

export function AppSidebar({ ...props }: AppSidebarProps) {
  const currentPath = usePathname();
  const { isMobile, open, setOpenMobile } = useSidebar();
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const locale = useLocale();
  const t = useTranslations();
  const isRtl = locale === 'ar';

  const ROUTES: RouteConfig[] = [
    {
      type: 'group',
      label: t('layout.navigation'),
      children: [
        { type: 'item', label: t('layout.dashboard'), href: '/app', icon: LayoutDashboard },
      ],
    },
    {
      type: 'group',
      label: t('layout.sales'),
      children: [
        { type: 'item', label: t('layout.invoices'), href: '/app/invoices', icon: FilePenLine },
        { type: 'item', label: t('layout.customers'), href: '/app/customers', icon: Users },
        { type: 'item', label: t('layout.contracts'), href: '/app/contracts', icon: Handshake },
      ],
    },
    {
      type: 'group',
      label: t('layout.purchases'),
      children: [
        { type: 'item', label: t('layout.purchaseOrders'), href: '/app/purchase-orders', icon: ShoppingCart },
        { type: 'item', label: t('layout.suppliers'), href: '/app/suppliers', icon: Truck },
      ],
    },
    {
      type: 'group',
      label: t('layout.inventory'),
      children: [
        { type: 'item', label: t('layout.stockLevels'), href: '/app/stock', icon: Boxes },
        { type: 'item', label: t('layout.items'), href: '/app/items', icon: Package },
        { type: 'item', label: t('layout.warehouses'), href: '/app/warehouses', icon: Warehouse },
      ],
    },
    {
      type: 'group',
      label: t('layout.analytics'),
      children: [
        { type: 'item', label: t('layout.reports'), href: '/app/reports', icon: BarChart3 },
      ],
    },
    {
      type: 'group',
      label: t('layout.notifications' as any),
      children: [
        { type: 'item', label: t('layout.notifications' as any), href: '/app/notifications', icon: Bell },
      ],
    },
    {
      type: 'group',
      label: t('layout.configuration'),
      children: [
        { type: 'item', label: t('layout.settings'), href: '/app/settings', icon: Settings },
      ],
    },
  ];

  useEffect(() => {
    if (loading === currentPath) {
      if (loading !== '') setLoading('');
      setOpenMobile(false);
    }
  }, [currentPath, setOpenMobile, loading]);

  /** Match /app/customers regardless of sub-paths */
  const isActive = (href?: string) => {
    if (!href) return false;
    const prefix = currentPath.split('/').slice(0, 3).join('/');
    return prefix === href || currentPath === href;
  };

  const handleNavigate = (href: string) => {
    if (currentPath === href) return;
    setLoading(href);
    router.push(href);
  };

  const showSpinnerFor = (href: string) => loading === href && (!open || isMobile);

  return (
    <Sidebar side={isRtl ? 'right' : 'left'} collapsible="icon" type="Drawer" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-1">
          <AppLogo />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {ROUTES.map((route) =>
          route.type === 'group' ? (
            <RouteGroup
              key={route.label}
              route={route as RouteConfig & { type: 'group' }}
              isActive={isActive}
              loading={loading}
              open={open}
              isMobile={isMobile}
              showSpinnerFor={showSpinnerFor}
              onNavigate={handleNavigate}
            />
          ) : (
            // Top-level items without a group wrapper
            <SidebarGroup key={route.label}>
              <SidebarMenu>
                <RouteItem
                  route={route}
                  isActive={isActive}
                  loading={loading}
                  open={open}
                  isMobile={isMobile}
                  showSpinnerFor={showSpinnerFor}
                  onNavigate={handleNavigate}
                />
              </SidebarMenu>
            </SidebarGroup>
          ),
        )}
      </SidebarContent>

      <SidebarFooter>{!isMobile && <NavUser />}</SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

// ─── Route Group ─────────────────────────────────────────────────────────────

interface SharedProps {
  isActive: (href?: string) => boolean;
  loading: string;
  open: boolean;
  isMobile: boolean;
  showSpinnerFor: (href: string) => boolean;
  onNavigate: (href: string) => void;
}

function RouteGroup({
  route,
  ...shared
}: SharedProps & { route: RouteConfig & { type: 'group' } }) {
  const [open, setOpen] = useState(true);

  return (
    <SidebarGroup>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* LABEL = navigation */}
        <SidebarGroupLabel style={{ flex: 1 }}>{route.label}</SidebarGroupLabel>

        {/* ARROW = toggle */}
        <ChevronDown
          size={16}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
          }}
          style={{
            transition: 'transform 0.2s',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </div>

      {/* COLLAPSIBLE CONTENT */}
      {open && (
        <SidebarMenu>
          {route.children?.map((child) => (
            <RouteItem key={child.label} route={child} {...shared} />
          ))}
        </SidebarMenu>
      )}
    </SidebarGroup>
  );
}

// ─── Route Item (leaf or nested) ─────────────────────────────────────────────

function RouteItem({ route, ...shared }: SharedProps & { route: RouteConfig }) {
  const { isActive, loading, showSpinnerFor, onNavigate } = shared;

  const active = isActive(route.href);
  const href = route.href as string | undefined;
  const Icon = route.icon;

  const hasChildren = route.children && route.children.length > 0;

  if (hasChildren) {
    return (
      <SidebarMenuItem>
        {/* Parent button – navigates if it has an href, otherwise just a label */}
        <SidebarMenuButton
          isActive={active}
          tooltip={route.label}
          className={cn('flex', active && 'bg-primary!')}
          onClick={() => href && onNavigate(href)}
        >
          {Icon && (
            <Icon
              className={cn(
                'ms-1 size-5 shrink-0',
                active ? 'text-white' : 'text-foreground/92',
                href && showSpinnerFor(href) ? 'hidden' : '',
              )}
            />
          )}
          <div className="flex items-center justify-between w-full">
            <span
              className={cn(
                'text-base',
                active ? 'text-white' : 'text-foreground/92',
                href && showSpinnerFor(href) ? 'hidden' : '',
              )}
            >
              {route.label}
            </span>
            {href && loading === href && <Spinner />}
          </div>
        </SidebarMenuButton>

        {/* Sub-items */}
        <SidebarMenuSub>
          {route.children?.map((child) => {
            const childHref = child.href as string | undefined;
            const childActive = isActive(childHref);
            const childLabel = child.label;
            const ChildIcon = child.icon;

            return (
              <SidebarMenuSubItem key={child.label}>
                <SidebarMenuSubButton
                  isActive={childActive}
                  className={cn(childActive && 'bg-primary! text-white')}
                  onClick={() => childHref && onNavigate(childHref)}
                >
                  {ChildIcon && (
                    <ChildIcon
                      className={cn(
                        'size-4 shrink-0',
                        childActive ? 'text-white' : 'text-foreground/80',
                      )}
                    />
                  )}
                  <span>{childLabel}</span>
                  {childHref && loading === childHref && <Spinner />}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      </SidebarMenuItem>
    );
  }

  // Leaf item
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        className={cn('flex', active && 'bg-primary!')}
        tooltip={route.label}
        onClick={() => href && onNavigate(href)}
      >
        {Icon && (
          <Icon
            className={cn(
              'size-5 shrink-0',
              active ? 'text-white' : 'text-foreground/92',
              href && showSpinnerFor(href) ? 'hidden' : '',
            )}
          />
        )}
        <div className="flex items-center justify-between w-full">
          <span
            className={cn(
              'text-base',
              active ? 'text-white' : 'text-foreground/92',
              href && showSpinnerFor(href) ? 'hidden' : '',
            )}
          >
            {route.label}
          </span>
          {href && loading === href && <Spinner />}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function AppLogo() {
  const t = useTranslations();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link href={'/app'}>
          <SidebarMenuButton
            size="lg"
            dir="ltr"
            className="flex flex-row opacity-100! data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
              <Logo className="size-7!" />
            </div>

            <div className="grid flex-1 text-left text-sm leading-tight ">
              <span className="truncate font-semibold text-lg">{t('layout.appTitle')}</span>
            </div>
          </SidebarMenuButton>
        </Link>
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
