"use client";

import {
	ArrowDownRight,
	ArrowUpRight,
	Banknote,
	Boxes,
	Clock,
	FilePenLine,
	Package,
	Receipt,
	ShoppingCart,
	TriangleAlert,
	Truck,
	UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { type ReactNode, useMemo } from "react";
import {
	Bar,
	BarChart,
	Cell,
	Pie,
	PieChart,
	PolarAngleAxis,
	RadialBar,
	RadialBarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
} from "recharts";
import {
	useCustomerForm,
	useInvoiceForm,
	usePOForm,
} from "@/components/dialogs";
import { Header } from "@/components/layout/App-Header";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

/**
 * ---------------------------------------------------------------------------
 * Counts-only ERP overview — no revenue, balances, or currency figures.
 * Every metric is a COUNT or a PERCENTAGE (documents, statuses, stock health).
 *
 * Symmetric layout rhythm: 4 KPI cards → 3 chart cards → 2 action cards.
 * All colors come from app theme tokens (light/dark aware); charts resolve
 * CSS variables at render time.
 * ---------------------------------------------------------------------------
 */

type Tone = "success" | "warning" | "destructive" | "neutral" | "muted";

type Palette = Record<
	| "success"
	| "warning"
	| "destructive"
	| "foreground"
	| "mutedForeground"
	| "border"
	| "card"
	| "popover"
	| "muted",
	string
>;

const LIGHT_FALLBACK: Palette = {
	success: "#1d8645",
	warning: "#b56927",
	destructive: "#a82b2b",
	foreground: "#17141d",
	mutedForeground: "#606060",
	border: "#cccccc",
	card: "#f5f5f5",
	popover: "#ffffff",
	muted: "#dddddd",
};

function resolveVar(name: string, fallback: string): string {
	if (typeof window === "undefined") return fallback;
	const value = getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
	return value || fallback;
}

function useChartPalette(): Palette {
	const { resolvedTheme } = useTheme();
	return useMemo(
		() => ({
			success: resolveVar("--success", LIGHT_FALLBACK.success),
			warning: resolveVar("--warning", LIGHT_FALLBACK.warning),
			destructive: resolveVar("--destructive", LIGHT_FALLBACK.destructive),
			foreground: resolveVar("--foreground", LIGHT_FALLBACK.foreground),
			mutedForeground: resolveVar(
				"--muted-foreground",
				LIGHT_FALLBACK.mutedForeground,
			),
			border: resolveVar("--border", LIGHT_FALLBACK.border),
			card: resolveVar("--card", LIGHT_FALLBACK.card),
			popover: resolveVar("--popover", LIGHT_FALLBACK.popover),
			muted: resolveVar("--muted", LIGHT_FALLBACK.muted),
		}),
		[resolvedTheme],
	);
}

const STATUS_TONE: Record<string, Tone> = {
	PAID: "success",
	RECEIVED: "success",
	CLOSED: "success",
	SENT: "warning",
	PARTIAL: "warning",
	PENDING_APPROVAL: "warning",
	APPROVED: "warning",
	ORDERED: "neutral",
	OVERDUE: "destructive",
	DISPUTED: "destructive",
	DRAFT: "muted",
	CANCELLED: "muted",
};

const TONE_COLOR: Record<Tone, keyof Palette> = {
	success: "success",
	warning: "warning",
	destructive: "destructive",
	neutral: "foreground",
	muted: "mutedForeground",
};

const tooltipStyle = (p: Palette) =>
	({
		backgroundColor: p.popover,
		border: `1px solid ${p.border}`,
		borderRadius: 8,
		fontSize: 11,
		color: p.foreground,
	}) as const;

type StatusLabelKey =
	| "common.paid"
	| "common.received"
	| "common.sent"
	| "common.partial"
	| "common.overdue"
	| "common.draft"
	| "common.cancelled"
	| "common.approved"
	| "common.ordered"
	| "invoices.pendingApproval"
	| "common.unknown";

function statusLabelKey(status: string): StatusLabelKey {
	switch (status) {
		case "PAID":
			return "common.paid";
		case "RECEIVED":
			return "common.received";
		case "SENT":
			return "common.sent";
		case "PARTIAL":
			return "common.partial";
		case "OVERDUE":
			return "common.overdue";
		case "DRAFT":
			return "common.draft";
		case "CANCELLED":
			return "common.cancelled";
		case "APPROVED":
			return "common.approved";
		case "ORDERED":
			return "common.ordered";
		case "PENDING_APPROVAL":
			return "invoices.pendingApproval";
		default:
			return "common.unknown";
	}
}

// ── Shared bits ─────────────────────────────────────────────────────────────

function IconChip({
	children,
	tone = "primary",
}: {
	children: ReactNode;
	tone?: "primary" | "destructive" | "success" | "warning" | "muted";
}) {
	return (
		<div
			className={cn(
				"flex size-9 shrink-0 items-center justify-center rounded-lg",
				tone === "primary" && "bg-primary/10 text-primary",
				tone === "destructive" && "bg-destructive/10 text-destructive",
				tone === "success" && "bg-success/10 text-success",
				tone === "warning" && "bg-warning/10 text-warning",
				tone === "muted" && "bg-muted text-muted-foreground",
			)}
		>
			{children}
		</div>
	);
}

const tileClass =
	"group flex flex-col items-start gap-2 rounded-lg border border-border/60 bg-background/40 p-3 text-left transition-all hover:border-primary/30 hover:bg-accent hover:shadow-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none";

export default function ErpDashboard() {
	const t = useTranslations();
	const locale = useLocale();
	const p = useChartPalette();

	const { data: sessionData } = trpc.auth.session.useQuery();
	const { data: org } = trpc.organizations.get.useQuery();
	const { data: summary } = trpc.reports.summary.useQuery();
	const { data: statusDist } =
		trpc.reports.invoiceStatusDistribution.useQuery();
	const { data: recentPOs } = trpc.purchaseOrders.list.useQuery({
		sortBy: "date",
		sortOrder: "desc",
	});
	const { data: recentInvoices } = trpc.invoices.list.useQuery({
		type: "INVOICE",
		sortBy: "date",
		sortOrder: "desc",
	});

	const { openCreate: openInvoiceCreate } = useInvoiceForm();
	const { openCreate: openPOCreate } = usePOForm();
	const { openCreate: openCustomerCreate } = useCustomerForm();

	const poList = recentPOs ?? [];
	const invoiceList = recentInvoices ?? [];

	const greeting = useMemo(() => {
		const h = new Date().getHours();
		if (h < 12) return t("dashboard.greetingMorning");
		if (h < 17) return t("dashboard.greetingAfternoon");
		return t("dashboard.greetingEvening");
	}, [t]);

	const todayLabel = useMemo(
		() =>
			new Date().toLocaleDateString(locale === "ar" ? "ar" : "en-GB", {
				weekday: "long",
				day: "numeric",
				month: "long",
			}),
		[locale],
	);

	const seal = useMemo(() => {
		if (!org?.name) return "TM";
		return org.name
			.split(" ")
			.filter(Boolean)
			.slice(0, 3)
			.map((w) => w.charAt(0).toUpperCase())
			.join("");
	}, [org?.name]);

	const firstName = sessionData?.user?.name?.split(" ")[0] ?? "";

	// ── KPI strip (counts only) ────────────────────────────────────────────────

	const kpis = useMemo(() => {
		const now = new Date();
		const monthIndex = now.getFullYear() * 12 + now.getMonth();

		let thisMonth = 0;
		let lastMonth = 0;
		for (const inv of invoiceList) {
			if (!inv.date) continue;
			const d = new Date(inv.date);
			const m = d.getFullYear() * 12 + d.getMonth();
			if (m === monthIndex) thisMonth += 1;
			else if (m === monthIndex - 1) lastMonth += 1;
		}

		const pendingApprovalPOs = poList.filter((po) =>
			["DRAFT", "PENDING_APPROVAL"].includes(po.status),
		).length;
		const openPOs = poList.filter((po) =>
			["APPROVED", "ORDERED", "PARTIAL_RECEIVED"].includes(po.status),
		).length;
		const lowStockCount = summary?.inventory.lowStockCount ?? 0;

		return [
			{
				label: t("dashboard.invoicesThisMonth"),
				value: thisMonth,
				delta: thisMonth - lastMonth,
				icon: FilePenLine,
				warn: false,
			},
			{
				label: t("dashboard.poAwaitingApproval"),
				value: pendingApprovalPOs,
				delta: undefined,
				icon: Clock,
				warn: false,
			},
			{
				label: t("dashboard.openPurchaseOrders"),
				value: openPOs,
				delta: undefined,
				icon: ShoppingCart,
				warn: false,
			},
			{
				label: t("dashboard.belowReorderPoint"),
				value: lowStockCount,
				delta: undefined,
				icon: TriangleAlert,
				warn: true,
			},
		];
	}, [invoiceList, poList, summary, t]);

	// ── Documents this week (Mon–Sun counts) ──────────────────────────────────

	const weeklyDocs = useMemo(() => {
		const now = new Date();
		const mondayOffset = (now.getDay() + 6) % 7;
		const monday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate() - mondayOffset,
		);
		const start = monday.getTime();
		const dayMs = 24 * 60 * 60 * 1000;

		const days = [...Array(7)].map((_, i) => ({
			label: new Date(start + i * dayMs).toLocaleDateString(
				locale === "ar" ? "ar" : "en-GB",
				{ weekday: "short" },
			),
			invoices: 0,
			pos: 0,
		}));

		for (const inv of invoiceList) {
			if (!inv.date) continue;
			const idx = Math.floor(
				(new Date(inv.date).setHours(0, 0, 0, 0) - start) / dayMs,
			);
			if (idx >= 0 && idx < 7) days[idx].invoices += 1;
		}
		for (const po of poList) {
			if (!po.date) continue;
			const idx = Math.floor(
				(new Date(po.date).setHours(0, 0, 0, 0) - start) / dayMs,
			);
			if (idx >= 0 && idx < 7) days[idx].pos += 1;
		}
		return days;
	}, [invoiceList, poList, locale]);

	// ── Invoice status mix ────────────────────────────────────────────────────

	const statusMix = useMemo(
		() =>
			(statusDist ?? []).map((s) => ({
				name: t(statusLabelKey(s.status)),
				value: s.count,
				color:
					p[TONE_COLOR[STATUS_TONE[s.status] ?? "muted"]] ?? p.mutedForeground,
			})),
		[statusDist, t, p],
	);

	// ── Stock health gauge ────────────────────────────────────────────────────

	const itemCount = summary?.inventory.itemCount ?? 0;
	const lowStockCount = summary?.inventory.lowStockCount ?? 0;
	const stockPct =
		itemCount > 0
			? Math.round(((itemCount - lowStockCount) / itemCount) * 100)
			: 0;
	const stockTone: Tone =
		stockPct >= 80 ? "success" : stockPct >= 50 ? "warning" : "destructive";

	// ── Module shelf ──────────────────────────────────────────────────────────

	const modules: {
		labelKey:
			| "layout.invoices"
			| "layout.purchaseOrders"
			| "layout.items"
			| "layout.customers"
			| "layout.suppliers"
			| "layout.stockLevels";
		href: string;
		icon: typeof Package;
		count: number;
		warn: boolean;
	}[] = [
		{
			labelKey: "layout.invoices",
			href: "/erp/documents/invoices",
			icon: FilePenLine,
			count: summary?.revenue.count ?? 0,
			warn: false,
		},
		{
			labelKey: "layout.purchaseOrders",
			href: "/erp/purchase-orders",
			icon: ShoppingCart,
			count: summary?.purchases.count ?? 0,
			warn: false,
		},
		{
			labelKey: "layout.items",
			href: "/erp/items",
			icon: Package,
			count: itemCount,
			warn: false,
		},
		{
			labelKey: "layout.customers",
			href: "/erp/customers",
			icon: UserPlus,
			count: summary?.customers.activeCount ?? 0,
			warn: false,
		},
		{
			labelKey: "layout.suppliers",
			href: "/erp/suppliers",
			icon: Truck,
			count: summary?.suppliers.activeCount ?? 0,
			warn: false,
		},
		{
			labelKey: "layout.stockLevels",
			href: "/erp/stock",
			icon: Boxes,
			count: lowStockCount,
			warn: lowStockCount > 0,
		},
	];

	return (
		<div className="flex min-h-screen flex-col bg-background">
			<style>{`
				.erp-fade-up { opacity: 0; transform: translateY(4px); animation: erpFadeUp .45s ease forwards; }
				@keyframes erpFadeUp { to { opacity: 1; transform: translateY(0); } }
				@media (prefers-reduced-motion: reduce) { .erp-fade-up { animation: none; opacity: 1; transform: none; } }
			`}</style>

			<Header title={t("dashboard.title")} />

			<main className="mx-auto w-full max-w-360 flex-1 space-y-4 p-4 lg:p-6">
				{/* ---------------- header ---------------- */}
				<section className="flex items-center justify-between gap-4">
					<div className="min-w-0">
						<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							{todayLabel}
						</p>
						<h1 className="mt-1 truncate text-2xl leading-tight font-bold tracking-tight lg:text-3xl">
							{greeting}
							{firstName ? `, ${firstName}.` : ""}
						</h1>
						<p className="mt-1 hidden text-sm text-muted-foreground sm:block">
							{t("dashboard.greetingDescription")}
						</p>
					</div>
				</section>

				{/* ---------------- KPI strip ---------------- */}
				<section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
					{kpis.map((k, i) => (
						<Card
							key={k.label}
							className="erp-fade-up gap-0 rounded-xl py-4 shadow-xs transition-shadow hover:shadow-md"
							style={{ animationDelay: `${i * 60}ms` }}
						>
							<CardContent className="flex items-start justify-between gap-3 px-4">
								<div className="min-w-0">
									<p className="truncate text-xs text-muted-foreground">
										{k.label}
									</p>
									<div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
										<span
											className={cn(
												"font-mono text-2xl leading-none font-semibold tabular-nums",
												k.warn ? "text-destructive" : "text-foreground",
											)}
										>
											{k.value}
										</span>
										{k.delta !== undefined && k.delta !== 0 && (
											<span
												className={cn(
													"inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
													k.delta > 0
														? "bg-success/10 text-success"
														: "bg-destructive/10 text-destructive",
												)}
											>
												{k.delta > 0 ? (
													<ArrowUpRight className="size-3" />
												) : (
													<ArrowDownRight className="size-3" />
												)}
												{Math.abs(k.delta)}
											</span>
										)}
									</div>
								</div>
								<IconChip tone={k.warn ? "destructive" : "primary"}>
									<k.icon className="size-4" />
								</IconChip>
							</CardContent>
						</Card>
					))}
				</section>

				{/* ---------------- charts row ---------------- */}
				<section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					{/* weekly document volume */}
					<Card className="h-72 gap-2 rounded-xl py-4">
						<CardHeader className="px-4">
							<CardTitle className="text-sm font-medium">
								{t("dashboard.documentsThisWeek")}
							</CardTitle>
							<CardAction>
								<div className="flex items-center gap-3 text-[10px] text-muted-foreground">
									<span className="flex items-center gap-1">
										<span className="inline-block size-2 rounded-full bg-success" />
										{t("dashboard.legendInvoices")}
									</span>
									<span className="flex items-center gap-1">
										<span className="inline-block size-2 rounded-full bg-warning" />
										{t("dashboard.legendPOs")}
									</span>
								</div>
							</CardAction>
						</CardHeader>
						<CardContent className="min-h-0 flex-1 px-4">
							<ResponsiveContainer height="100%" width="100%">
								<BarChart
									data={weeklyDocs}
									margin={{ top: 8, right: 4, bottom: 0, left: -18 }}
									barGap={2}
								>
									<XAxis
										dataKey="label"
										tick={{ fontSize: 10, fill: p.mutedForeground }}
										axisLine={{ stroke: p.border }}
										tickLine={false}
									/>
									<Tooltip
										cursor={{ fill: p.muted }}
										contentStyle={tooltipStyle(p)}
									/>
									<Bar
										dataKey="invoices"
										fill={p.success}
										radius={[2, 2, 0, 0]}
										maxBarSize={10}
									/>
									<Bar
										dataKey="pos"
										fill={p.warning}
										radius={[2, 2, 0, 0]}
										maxBarSize={10}
									/>
								</BarChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>

					{/* invoice status mix */}
					<Card className="h-72 gap-2 rounded-xl py-4">
						<CardHeader className="px-4">
							<CardTitle className="text-sm font-medium">
								{t("dashboard.statusMix")}
							</CardTitle>
						</CardHeader>
						<CardContent className="flex min-h-0 flex-1 items-center gap-4 px-4">
							<div className="h-full min-h-0 w-1/2">
								<ResponsiveContainer height="100%" width="100%">
									<PieChart>
										<Pie
											data={statusMix}
											dataKey="value"
											nameKey="name"
											innerRadius="62%"
											outerRadius="92%"
											paddingAngle={2}
											stroke="none"
										>
											{statusMix.map((s) => (
												<Cell key={s.name} fill={s.color} />
											))}
										</Pie>
										<Tooltip contentStyle={tooltipStyle(p)} />
									</PieChart>
								</ResponsiveContainer>
							</div>
							<div className="flex min-w-0 flex-1 flex-col gap-2">
								{statusMix.length === 0 && (
									<p className="text-xs text-muted-foreground">—</p>
								)}
								{statusMix.map((s) => (
									<div key={s.name} className="flex items-center gap-2 text-xs">
										<span
											className="inline-block size-2 shrink-0 rounded-full"
											style={{ background: s.color }}
										/>
										<span className="min-w-0 flex-1 truncate text-muted-foreground">
											{s.name}
										</span>
										<span className="font-mono font-medium tabular-nums text-foreground">
											{s.value}
										</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					{/* stock health gauge */}
					<Card className="h-72 gap-2 rounded-xl py-4 md:col-span-2 md:max-xl:h-56 xl:col-span-1 xl:h-72">
						<CardHeader className="px-4">
							<CardTitle className="text-sm font-medium">
								{t("dashboard.stockHealth")}
							</CardTitle>
						</CardHeader>
						<CardContent className="relative min-h-0 flex-1 px-4">
							<ResponsiveContainer height="100%" width="100%">
								<RadialBarChart
									data={[
										{
											name: t("dashboard.stockHealth"),
											value: stockPct,
											fill: p[TONE_COLOR[stockTone]],
										},
									]}
									innerRadius="70%"
									outerRadius="100%"
									startAngle={90}
									endAngle={-270}
								>
									<PolarAngleAxis
										type="number"
										domain={[0, 100]}
										tick={false}
									/>
									<RadialBar
										dataKey="value"
										cornerRadius={6}
										background={{ fill: p.muted }}
									/>
								</RadialBarChart>
							</ResponsiveContainer>
							<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
								<span
									className={cn(
										"font-mono text-2xl font-semibold tabular-nums",
										stockTone === "success" && "text-success",
										stockTone === "warning" && "text-warning",
										stockTone === "destructive" && "text-destructive",
									)}
								>
									{stockPct}%
								</span>
								<span className="text-xs text-muted-foreground">
									{t("dashboard.inStock")}
								</span>
							</div>
						</CardContent>
					</Card>
				</section>

				{/* ---------------- actions + modules ---------------- */}
				<section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
					{/* quick actions */}
					<Card className="gap-3 rounded-xl py-4">
						<CardHeader className="px-4">
							<CardTitle className="text-sm font-medium">
								{t("layout.quickActions")}
							</CardTitle>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-2 px-4">
							<button
								type="button"
								onClick={() =>
									openInvoiceCreate({ defaults: { type: "INVOICE" } })
								}
								className={tileClass}
							>
								<IconChip>
									<Receipt className="size-4" />
								</IconChip>
								<span className="text-xs font-medium text-foreground">
									{t("dashboard.newInvoice")}
								</span>
							</button>
							<button
								type="button"
								onClick={() => openPOCreate()}
								className={tileClass}
							>
								<IconChip>
									<ShoppingCart className="size-4" />
								</IconChip>
								<span className="text-xs font-medium text-foreground">
									{t("dashboard.newPO")}
								</span>
							</button>
							<button
								type="button"
								onClick={() => openCustomerCreate()}
								className={tileClass}
							>
								<IconChip>
									<UserPlus className="size-4" />
								</IconChip>
								<span className="text-xs font-medium text-foreground">
									{t("dashboard.addCustomer")}
								</span>
							</button>
							<Link href="/erp/incomes" className={tileClass}>
								<IconChip tone="success">
									<Banknote className="size-4" />
								</IconChip>
								<span className="text-xs font-medium text-foreground">
									{t("dashboard.recordIncome")}
								</span>
							</Link>
						</CardContent>
					</Card>

					{/* module shelf */}
					<Card className="gap-3 rounded-xl py-4">
						<CardHeader className="px-4">
							<CardTitle className="text-sm font-medium">
								{t("dashboard.modules")}
							</CardTitle>
						</CardHeader>
						<CardContent className="grid grid-cols-1 gap-2 px-4 sm:grid-cols-2">
							{modules.map(({ labelKey, href, icon: Icon, count, warn }) => (
								<Link
									key={labelKey}
									href={href}
									className="group flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 transition-all hover:border-primary/30 hover:bg-accent hover:shadow-sm"
								>
									<span className="flex min-w-0 items-center gap-2">
										<Icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
										<span className="truncate text-xs font-medium text-foreground">
											{t(labelKey)}
										</span>
									</span>
									<Badge
										variant="secondary"
										className={cn(
											"shrink-0 font-mono tabular-nums",
											warn &&
												"border-destructive/20 bg-destructive/10 text-destructive",
										)}
									>
										{count}
									</Badge>
								</Link>
							))}
						</CardContent>
					</Card>
				</section>

				<p className="pt-1 text-center text-[11px] text-muted-foreground">
					{t("dashboard.countsOnlyNote")}
				</p>
			</main>
		</div>
	);
}
