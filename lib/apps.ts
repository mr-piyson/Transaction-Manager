import {
  type LucideIcon,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Calendar,
  FilePenLine,
  FileText,
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
import type { RouteConfig } from '@/components/layout/App-Sidebar';

export type AppInfo = {
  slug: string;
  nameKey: string;
  icon: LucideIcon;
  isActive: boolean;
  getRoutes: (t: (key: string) => string) => RouteConfig[];
};

function getErpRoutes(t: (key: string) => string): RouteConfig[] {
  return [
    { type: 'item', label: t('layout.dashboard'), href: '/erp', icon: LayoutDashboard },
    {
      type: 'group',
      label: t('layout.sales'),
      children: [
        { type: 'item', label: t('layout.invoices'), href: '/erp/invoices', icon: FilePenLine },
        { type: 'item', label: t('layout.quotations'), href: '/erp/quotations', icon: FileText },
        { type: 'item', label: t('layout.customers'), href: '/erp/customers', icon: Users },
        { type: 'item', label: t('layout.contracts'), href: '/erp/contracts', icon: Handshake },
      ],
    },
    {
      type: 'group',
      label: t('layout.purchases'),
      children: [
        {
          type: 'item',
          label: t('layout.purchaseOrders'),
          href: '/erp/purchase-orders',
          icon: ShoppingCart,
        },
        { type: 'item', label: t('layout.suppliers'), href: '/erp/suppliers', icon: Truck },
      ],
    },
    {
      type: 'group',
      label: t('layout.inventory'),
      children: [
        { type: 'item', label: t('layout.stockLevels'), href: '/erp/stock', icon: Boxes },
        { type: 'item', label: t('layout.items'), href: '/erp/items', icon: Package },
        { type: 'item', label: t('layout.warehouses'), href: '/erp/warehouses', icon: Warehouse },
      ],
    },
    {
      type: 'group',
      label: t('layout.analytics'),
      children: [
        { type: 'item', label: t('layout.reports'), href: '/erp/reports', icon: BarChart3 },
        { type: 'item', label: t('layout.itemReport') ?? 'Item Report', href: '/erp/reports/items', icon: Package },
      ],
    },
    {
      type: 'group',
      label: t('layout.notifications'),
      children: [
        { type: 'item', label: t('layout.notifications'), href: '/notifications', icon: Bell },
      ],
    },
  ];
}

function getCrmRoutes(t: (key: string) => string): RouteConfig[] {
  return [
    { type: 'item', label: t('crm.dashboard'), href: '/crm', icon: LayoutDashboard },
    {
      type: 'group',
      label: t('crm.sales'),
      children: [
        { type: 'item', label: t('crm.leads'), href: '/crm/leads', icon: Users },
        {
          type: 'item',
          label: t('crm.opportunities'),
          href: '/crm/opportunities',
          icon: BarChart3,
        },
        { type: 'item', label: t('crm.pipelines'), href: '/crm/pipelines', icon: LayoutDashboard },
      ],
    },
    {
      type: 'group',
      label: t('crm.marketing'),
      children: [
        { type: 'item', label: t('crm.campaigns'), href: '/crm/campaigns', icon: Calendar },
        { type: 'item', label: t('crm.contacts'), href: '/crm/contacts', icon: Users },
      ],
    },
  ];
}

function getHrRoutes(t: (key: string) => string): RouteConfig[] {
  return [
    { type: 'item', label: t('hr.dashboard'), href: '/hrms', icon: LayoutDashboard },
    {
      type: 'group',
      label: t('hr.workforce'),
      children: [
        { type: 'item', label: t('hr.employees'), href: '/hrms/employees', icon: User },
        { type: 'item', label: t('hr.departments'), href: '/hrms/departments', icon: Building2 },
      ],
    },
    {
      type: 'group',
      label: t('hr.timeManagement'),
      children: [
        { type: 'item', label: t('hr.attendance'), href: '/hrms/attendance', icon: Calendar },
        { type: 'item', label: t('hr.leave'), href: '/hrms/leave', icon: Calendar },
      ],
    },
    {
      type: 'group',
      label: t('hr.compensation'),
      children: [{ type: 'item', label: t('hr.payroll'), href: '/hrms/payroll', icon: Wallet }],
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
    slug: 'hrms',
    nameKey: 'apps.hr',
    icon: Users,
    isActive: true,
    getRoutes: getHrRoutes,
  },
  {
    slug: 'crm',
    nameKey: 'apps.crm',
    icon: Handshake,
    isActive: true,
    getRoutes: getCrmRoutes,
  },
];

export function getAppBySlug(slug: string): AppInfo | undefined {
  return apps.find((app) => app.slug === slug);
}

export function getAppFromPath(pathname: string): AppInfo {
  if (pathname.startsWith('/hrms')) return getAppBySlug('hrms') ?? apps[1];
  if (pathname.startsWith('/crm')) return getAppBySlug('crm') ?? apps[2];
  return apps[0];
}
