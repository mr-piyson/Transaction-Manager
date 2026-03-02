import { TranslationKeys } from "@/i18n/config";
import { FileText, LucideIcon, Package, User } from "lucide-react";
import { Route } from "next";

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
      label: "Customers",
      key: "common.customers",
      href: "/app/customers",
      Icon: User,
    },
    {
      key: "common.inventory",
      href: "/app/inventory",
      label: "Inventory",
      Icon: Package,
    },
    {
      key: "common.invoices",
      href: "/app/invoices",
      label: "Invoices",
      Icon: FileText,
    },
  ],
} as const satisfies Record<string, RouteConfig[]>;
