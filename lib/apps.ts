import {
	Banknote,
	BarChart3,
	Bell,
	BookOpen,
	Boxes,
	Building2,
	Clock,
	FilePenLine,
	FileText,
	Handshake,
	Landmark,
	LayoutDashboard,
	type LucideIcon,
	Package,
	Scale,
	ShoppingCart,
	TrendingUp,
	Truck,
	Users,
	Wallet,
	Warehouse,
} from "lucide-react";
import type { RouteConfig } from "@/components/layout/App-Sidebar";

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
			type: "item",
			label: t("layout.dashboard"),
			href: "/erp",
			icon: LayoutDashboard,
		},
		{
			type: "group",
			label: t("layout.sales"),
			children: [
				{
					type: "item",
					label: t("layout.invoices"),
					href: "/erp/documents/invoices",
					icon: FilePenLine,
				},
				{
					type: "item",
					label: t("layout.quotations"),
					href: "/erp/documents/quotations",
					icon: FileText,
				},
				{
					type: "item",
					label: t("layout.customers"),
					href: "/erp/customers",
					icon: Users,
				},
				{
					type: "item",
					label: t("layout.contracts"),
					href: "/erp/contracts",
					icon: Handshake,
				},
				{
					type: "item",
					label: t("layout.incomes"),
					href: "/erp/incomes",
					icon: Banknote,
				},
			],
		},
		{
			type: "group",
			label: t("layout.purchases"),
			children: [
				{
					type: "item",
					label: t("layout.purchaseOrders"),
					href: "/erp/purchase-orders",
					icon: ShoppingCart,
				},
				{
					type: "item",
					label: t("layout.suppliers"),
					href: "/erp/suppliers",
					icon: Truck,
				},
				{
					type: "item",
					label: t("layout.expenses"),
					href: "/erp/expenses",
					icon: Wallet,
				},
			],
		},
		{
			type: "group",
			label: t("layout.inventory"),
			children: [
				{
					type: "item",
					label: t("layout.stockLevels"),
					href: "/erp/stock",
					icon: Boxes,
				},
				{
					type: "item",
					label: t("layout.items"),
					href: "/erp/items",
					icon: Package,
				},
				{
					type: "item",
					label: t("layout.warehouses"),
					href: "/erp/warehouses",
					icon: Warehouse,
				},
			],
		},
		{
			type: "group",
			label: t("layout.analytics"),
			children: [
				{
					type: "item",
					label: t("layout.reports"),
					href: "/erp/reports",
					icon: BarChart3,
				},
				{
					type: "item",
					label: t("layout.itemReport") ?? "Item Report",
					href: "/erp/reports/items",
					icon: Package,
				},
				{
					type: "item",
					label: t("reports.profitAndLoss") ?? "P&L Statement",
					href: "/erp/reports/profit-and-loss",
					icon: TrendingUp,
				},
				{
					type: "item",
					label: t("reports.balanceSheet") ?? "Balance Sheet",
					href: "/erp/reports/balance-sheet",
					icon: Landmark,
				},
				{
					type: "item",
					label: t("reports.trialBalance") ?? "Trial Balance",
					href: "/erp/reports/trial-balance",
					icon: Scale,
				},
				{
					type: "item",
					label: t("reports.apAging") ?? "AP Aging",
					href: "/erp/reports/ap-aging",
					icon: Clock,
				},
				{
					type: "item",
					label: t("reports.arAging") ?? "AR Aging",
					href: "/erp/reports/ar-aging",
					icon: Clock,
				},
				{
					type: "item",
					label: t("reports.generalLedger") ?? "General Ledger",
					href: "/erp/reports/general-ledger",
					icon: BookOpen,
				},
			],
		},
		{
			type: "group",
			label: t("layout.notifications"),
			children: [
				{
					type: "item",
					label: t("layout.notifications"),
					href: "/notifications",
					icon: Bell,
				},
			],
		},
	];
}

export const apps: AppInfo[] = [
	{
		slug: "erp",
		nameKey: "apps.erp",
		icon: Building2,
		isActive: true,
		getRoutes: getErpRoutes,
	},
];

export function getAppBySlug(slug: string): AppInfo | undefined {
	return apps.find((app) => app.slug === slug);
}

export function getAppFromPath(pathname: string): AppInfo {
	if (pathname.startsWith("/hrms")) return getAppBySlug("hrms") ?? apps[1];
	if (pathname.startsWith("/crm")) return getAppBySlug("crm") ?? apps[2];
	return apps[0];
}
