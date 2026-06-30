import {
  type LucideIcon,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Calendar,
  FilePenLine,
  Handshake,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  User,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react';
import type { RouteConfig } from '@/app/app/App-Sidebar';

export type AppInfo = {
  slug: string;
  nameKey: string;
  icon: LucideIcon;
  isActive: boolean;
  getRoutes: (t: (key: string) => string) => RouteConfig[];
};

function getErpRoutes(t: (key: string) => string): RouteConfig[] {
  return [
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
      label: t('layout.notifications'),
      children: [
        { type: 'item', label: t('layout.notifications'), href: '/app/notifications', icon: Bell },
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
}

function getHrRoutes(t: (key: string) => string): RouteConfig[] {
  return [
    {
      type: 'group',
      label: t('layout.navigation'),
      children: [
        { type: 'item', label: t('hr.dashboard'), href: '/app/hr', icon: LayoutDashboard },
      ],
    },
    {
      type: 'group',
      label: t('hr.workforce'),
      children: [
        { type: 'item', label: t('hr.employees'), href: '/app/hr/employees', icon: User },
        { type: 'item', label: t('hr.departments'), href: '/app/hr/departments', icon: Building2 },
      ],
    },
    {
      type: 'group',
      label: t('hr.timeManagement'),
      children: [
        { type: 'item', label: t('hr.attendance'), href: '/app/hr/attendance', icon: Calendar },
        { type: 'item', label: t('hr.leave'), href: '/app/hr/leave', icon: Calendar },
      ],
    },
    {
      type: 'group',
      label: t('hr.compensation'),
      children: [
        { type: 'item', label: t('hr.payroll'), href: '/app/hr/payroll', icon: Wallet },
      ],
    },
  ];
}

export const apps: AppInfo[] = [
  {
    slug: 'erp',
    nameKey: 'apps.erp',
    icon: Building2,
    isActive: true,
    getRoutes: getErpRoutes,
  },
  {
    slug: 'hr',
    nameKey: 'apps.hr',
    icon: Users,
    isActive: true,
    getRoutes: getHrRoutes,
  },
];

export function getAppBySlug(slug: string): AppInfo | undefined {
  return apps.find((app) => app.slug === slug);
}

export function getAppFromPath(pathname: string): AppInfo {
  const slug = pathname.startsWith('/app/hr') ? 'hr' : 'erp';
  return getAppBySlug(slug) ?? apps[0];
}
