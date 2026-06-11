'use client';

import {
  Boxes,
  ChevronDown,
  FilePenLine,
  LayoutDashboard,
  type LucideIcon,
  ShoppingCartIcon,
  SidebarIcon,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
import type { TranslationKeys } from '@/i18n/config';
import { useI18n } from '@/i18n/use-i18n';
import type { AppActions, AppSubjects } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { NavUser } from './User-Options';

// 1. Define what a single route looks like
export type RouteConfig = {
  type: 'item' | 'group';
  key: TranslationKeys; // for i18n lookup
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

// Derive a type from the const
export type Routes = typeof ROUTES;

// Define the routes as a const to get literal types
export const ROUTES = [
  {
    type: 'group',
    label: 'Navigation',
    key: 'common.navigation',
    children: [
      {
        type: 'item',
        label: 'Dashboard',
        key: 'common.dashboard',
        href: '/app',
        icon: LayoutDashboard,
      },
      {
        type: 'item',
        label: 'Customers',
        key: 'common.customers',
        href: '/app/customers',
        icon: User,
        auth: { action: 'read', subject: 'Customer' },
      },
      {
        type: 'item',
        label: 'Purchase Order',
        key: 'common.purchaseOrders',
        href: '/app/purchase-order',
        icon: ShoppingCartIcon,
      },
      {
        type: 'item',
        label: 'Products & Services',
        key: 'common.productsAndServices',
        href: '/app/items',
        icon: Boxes,
      },
      {
        type: 'item',
        label: 'Invoices',
        key: 'common.invoices',
        href: '/app/invoices',
        icon: FilePenLine,
      },
    ],
  },
] as const satisfies RouteConfig[];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

export function AppSidebar({ ...props }: AppSidebarProps) {
  const currentPath = usePathname();
  const { isMobile, open, setOpenMobile } = useSidebar();
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const i18n = useI18n();

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
    <Sidebar
      collapsible="icon"
      type="Drawer"
      side={i18n.direction === 'ltr' ? 'left' : 'right'}
      {...props}
    >
      <SidebarHeader>
        <AppLogo />
      </SidebarHeader>

      <SidebarContent>
        {ROUTES.map((route) =>
          route.type === 'group' ? (
            <RouteGroup
              key={route.key}
              route={route}
              isActive={isActive}
              loading={loading}
              open={open}
              isMobile={isMobile}
              showSpinnerFor={showSpinnerFor}
              onNavigate={handleNavigate}
              i18n={i18n}
            />
          ) : (
            // Top-level items without a group wrapper
            <SidebarGroup key={route.key}>
              <SidebarMenu>
                <RouteItem
                  route={route}
                  isActive={isActive}
                  loading={loading}
                  open={open}
                  isMobile={isMobile}
                  showSpinnerFor={showSpinnerFor}
                  onNavigate={handleNavigate}
                  i18n={i18n}
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
  i18n: ReturnType<typeof useI18n>;
}

function RouteGroup({
  route,
  ...shared
}: SharedProps & { route: RouteConfig & { type: 'group' } }) {
  const { i18n } = shared;
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
        <SidebarGroupLabel style={{ flex: 1 }}>{i18n.t(route.key)}</SidebarGroupLabel>

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
            <RouteItem key={child.key} route={child} {...shared} />
          ))}
        </SidebarMenu>
      )}
    </SidebarGroup>
  );
}

// ─── Route Item (leaf or nested) ─────────────────────────────────────────────

function RouteItem({ route, ...shared }: SharedProps & { route: RouteConfig }) {
  const { isActive, loading, showSpinnerFor, onNavigate, i18n } = shared;

  const active = isActive(route.href);
  const href = route.href as string | undefined;
  const label = i18n.t(route.key);
  const Icon = route.icon;

  const hasChildren = route.children && route.children.length > 0;

  if (hasChildren) {
    return (
      <SidebarMenuItem>
        {/* Parent button – navigates if it has an href, otherwise just a label */}
        <SidebarMenuButton
          isActive={active}
          tooltip={label}
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
              {label}
            </span>
            {href && loading === href && <Spinner />}
          </div>
        </SidebarMenuButton>

        {/* Sub-items */}
        <SidebarMenuSub>
          {route.children?.map((child) => {
            const childHref = child.href as string | undefined;
            const childActive = isActive(childHref);
            const childLabel = i18n.t(child.key);
            const ChildIcon = child.icon;

            return (
              <SidebarMenuSubItem key={child.key}>
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
        tooltip={label}
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
            {label}
          </span>
          {href && loading === href && <Spinner />}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function AppLogo() {
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
              <span className="truncate font-semibold text-lg">Transaction Manager</span>
            </div>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function SidebarToggleButton(props: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      aria-label="Toggle Sidebar"
      {...props}
    >
      <SidebarIcon className="size-5" />
    </Button>
  );
}
