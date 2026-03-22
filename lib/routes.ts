import { TranslationKeys } from '@/i18n/config';
import { FilePenLine, FileText, LucideIcon, Package, User } from 'lucide-react';
import { Route } from 'next';

// 1. Define what a single route looks like
export type RouteConfig = {
  key: TranslationKeys;
  label: string;
  href?: Route;
  Icon?: LucideIcon;
  children?: Record<string, RouteConfig>;
};

// Derive a type from the const
export type Routes = typeof routes;

// 2. Define the container type (a map of RouteConfigs)
export type RouteMap = Record<string, RouteConfig>;

// Define the routes as a const to get literal types
export const routes = {
  appSidebar: [
    {
      label: 'Customers',
      key: 'common.customers',
      href: '/app/customers',
      Icon: User,
    },
    {
      label: 'Inventory Items',
      key: 'common.inventoryItems',
      href: '/app/inventory',
      Icon: Package,
    },
    {
      label: 'Invoices',
      key: 'common.invoices',
      href: '/app/invoices',
      Icon: FileText,
    },

    {
      label: 'Contracts',
      key: 'common.contracts',
      href: '/app/contracts',
      Icon: FilePenLine,
    },
  ],
} as const satisfies Record<string, RouteConfig[]>;
