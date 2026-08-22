"use client";

import {
	ArrowDownRight,
	ArrowUpRight,
	Banknote,
	Boxes,
	FilePenLine,
	Package,
	Receipt,
	ShoppingCart,
	Truck,
	UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { useDateFormat } from "@/hooks/use-date-format";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

/**
 * ---------------------------------------------------------------------------
 * Counts-only ERP overview — no revenue, balances, or currency figures.
 * Every metric is a COUNT or a PERCENTAGE (documents, statuses, stock health).
 *
 * Layout targets a single viewport at typical desktop heights; on shorter
 * viewports it reflows and scrolls naturally. All colors come from the app
 * theme tokens (light/dark aware); charts resolve CSS variables at render.
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

const TONE_CLASS: Record<Tone, string> = {
	success: "text-success bg-success/10",
	warning: "text-warning bg-warning/10",
	destructive: "text-destructive bg-destructive/10",
	neutral: "text-foreground/70 bg-muted",
	muted: "text-muted-foreground bg-muted",
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

export default function ErpDashboard() {
	const t = useTranslations();
	const locale = useLocale();
	const p = useChartPalette();
	const { formatShortDate } = useDateFormat();

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
				warn: false,
			},
			{
				label: t("dashboard.poAwaitingApproval"),
				value: pendingApprovalPOs,
				delta: undefined,
				warn: false,
			},
			{
				label: t("dashboard.openPurchaseOrders"),
				value: openPOs,
				delta: undefined,
				warn: false,
			},
			{
				label: t("dashboard.belowReorderPoint"),
				value: lowStockCount,
				delta: undefined,
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

	// ── Recent activity (merged invoices + POs) ───────────────────────────────

	const activity = useMemo(() => {
		const rows = [
			...invoiceList.slice(0, 4).map((inv) => ({
				key: `inv-${inv.id}`,
				href: `/erp/documents/invoices/${inv.id}`,
				title: inv.serial,
				desc: inv.customer?.name ?? "—",
				status: inv.status,
				date: inv.date,
			})),
			...poList.slice(0, 4).map((po) => ({
				key: `po-${po.id}`,
				href: `/erp/purchase-orders/${po.id}`,
				title: po.serial,
				desc: po.supplier?.name ?? "—",
				status: po.status,
				date: po.date,
			})),
		];
		return rows
			.sort(
				(a, b) =>
					new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
			)
			.slice(0, 5);
	}, [invoiceList, poList]);

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

			<main className="mx-auto w-full max-w-360 flex-1 space-y-3 p-4 lg:p-6">
				{/* ---------------- header ---------------- */}
				<div className="flex items-center justify-between border-b border-border pb-3">
					<div>
						<p className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
							{todayLabel}
						</p>
						<h1 className="mt-0.5 text-2xl leading-tight font-semibold tracking-tight lg:text-3xl">
							{greeting}
							{firstName ? `, ${firstName}.` : ""}
						</h1>
					</div>
				</div>

				{/* ---------------- KPI strip ---------------- */}
				<div className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
					{kpis.map((k, i) => (
						<div
							key={k.label}
							className="erp-fade-up flex flex-col justify-center gap-1 bg-card px-4 py-3"
							style={{ animationDelay: `${i * 50}ms` }}
						>
							<p className="text-[10px] leading-tight text-muted-foreground">
								{k.label}
							</p>
							<div className="flex items-center gap-2">
								<span
									className={cn(
										"font-mono text-xl font-medium tabular-nums",
										k.warn ? "text-destructive" : "text-foreground",
									)}
								>
									{k.value}
								</span>
								{k.delta !== undefined && k.delta !== 0 && (
									<span
										className={cn(
											"flex items-center gap-0.5 font-mono text-[10px]",
											k.warn
												? k.delta > 0
													? "text-destructive"
													: "text-success"
												: k.delta > 0
													? "text-success"
													: "text-destructive",
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
					))}
				</div>

				{/* ---------------- charts row ---------------- */}
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
					{/* weekly document volume */}
					<div className="flex h-64 flex-col rounded-lg border border-border bg-card p-3">
						<div className="flex items-center justify-between">
							<h2 className="text-xs font-medium text-foreground">
								{t("dashboard.documentsThisWeek")}
							</h2>
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
						</div>
						<div className="mt-1 min-h-0 flex-1">
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
						</div>
					</div>

					{/* invoice status mix */}
					<div className="flex h-64 flex-col rounded-lg border border-border bg-card p-3">
						<h2 className="text-xs font-medium text-foreground">
							{t("dashboard.statusMix")}
						</h2>
						<div className="flex min-h-0 flex-1 items-center gap-3">
							<div className="h-full min-h-0 w-1/2">
								<ResponsiveContainer height="100%" width="100%">
									<PieChart>
										<Pie
											data={statusMix}
											dataKey="value"
											nameKey="name"
											innerRadius="60%"
											outerRadius="90%"
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
							<div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
								{statusMix.length === 0 && (
									<p className="text-[11px] text-muted-foreground">—</p>
								)}
								{statusMix.map((s) => (
									<div
										key={s.name}
										className="flex items-center justify-between gap-2 text-[11px]"
									>
										<span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
											<span
												className="inline-block size-2 shrink-0 rounded-full"
												style={{ background: s.color }}
											/>
											<span className="truncate">{s.name}</span>
										</span>
										<span className="font-mono tabular-nums text-foreground">
											{s.value}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>

					{/* stock health gauge */}
					<div className="flex h-64 flex-col rounded-lg border border-border bg-card p-3 md:col-span-2 xl:col-span-1">
						<h2 className="text-xs font-medium text-foreground">
							{t("dashboard.stockHealth")}
						</h2>
						<div className="relative min-h-0 flex-1">
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
										"font-mono text-lg font-medium tabular-nums",
										stockTone === "success" && "text-success",
										stockTone === "warning" && "text-warning",
										stockTone === "destructive" && "text-destructive",
									)}
								>
									{stockPct}%
								</span>
								<span className="text-[9px] text-muted-foreground">
									{t("dashboard.inStock")}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* ---------------- actions + activity + modules ---------------- */}
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
					{/* quick actions */}
					<div className="grid grid-cols-2 content-start gap-1.5">
						<button
							type="button"
							onClick={() =>
								openInvoiceCreate({ defaults: { type: "INVOICE" } })
							}
							className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2 transition-colors hover:bg-accent"
						>
							<Receipt className="size-4 text-primary" />
							<span className="text-left text-[10px] leading-none text-foreground">
								{t("dashboard.newInvoice")}
							</span>
						</button>
						<button
							type="button"
							onClick={() => openPOCreate()}
							className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2 transition-colors hover:bg-accent"
						>
							<ShoppingCart className="size-4 text-primary" />
							<span className="text-left text-[10px] leading-none text-foreground">
								{t("dashboard.newPO")}
							</span>
						</button>
						<button
							type="button"
							onClick={() => openCustomerCreate()}
							className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2 transition-colors hover:bg-accent"
						>
							<UserPlus className="size-4 text-primary" />
							<span className="text-left text-[10px] leading-none text-foreground">
								{t("dashboard.addCustomer")}
							</span>
						</button>
						<Button
							asChild
							variant="outline"
							className="h-auto flex-col items-start gap-2 rounded-lg border-border bg-card px-2.5 py-2 hover:bg-accent"
						>
							<Link href="/erp/incomes">
								<Banknote className="size-4 text-primary" />
								<span className="text-[10px] leading-none text-foreground">
									{t("dashboard.recordIncome")}
								</span>
							</Link>
						</Button>
					</div>

					{/* recent activity */}
					<div className="overflow-hidden rounded-lg border border-border bg-card xl:col-span-2">
						<p className="border-b border-border px-3 py-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
							{t("dashboard.recentActivity")}
						</p>
						{activity.length === 0 ? (
							<p className="px-3 py-6 text-center text-xs text-muted-foreground">
								{t("dashboard.noActivity")}
							</p>
						) : (
							activity.map((row) => {
								const tone = STATUS_TONE[row.status] ?? "muted";
								return (
									<Link
										key={row.key}
										href={row.href}
										className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-[11px] transition-colors last:border-b-0 hover:bg-accent/50"
									>
										<span className="w-16 shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
											{formatShortDate(row.date)}
										</span>
										<span className="shrink-0 max-w-36 truncate font-medium text-foreground">
											{row.title}
										</span>
										<span className="min-w-0 flex-1 truncate text-muted-foreground">
											{row.desc}
										</span>
										<span
											className={cn(
												"shrink-0 rounded-full px-1.5 py-0.5 text-[9px] whitespace-nowrap",
												TONE_CLASS[tone],
											)}
										>
											{t(statusLabelKey(row.status))}
										</span>
									</Link>
								);
							})
						)}
					</div>

					{/* module shelf */}
					<div className="grid grid-cols-3 content-start gap-1.5">
						{modules.map(({ labelKey, href, icon: Icon, count, warn }) => (
							<Link
								key={labelKey}
								href={href}
								className="flex flex-col items-start gap-1 rounded-lg border border-border bg-card px-2 py-1.5 transition-colors hover:bg-accent"
							>
								<div className="flex w-full items-center justify-between">
									<Icon className="size-3 text-foreground" />
									<span
										className={cn(
											"rounded-full px-1 font-mono text-[8px] tabular-nums",
											warn
												? "bg-destructive/10 text-destructive"
												: "bg-primary/10 text-primary",
										)}
									>
										{count}
									</span>
								</div>
								<p className="truncate text-[10px] leading-none text-foreground">
									{t(labelKey)}
								</p>
							</Link>
						))}
					</div>
				</div>

				<p className="pt-1 text-center text-[9px] text-muted-foreground">
					{t("dashboard.countsOnlyNote")}
				</p>
			</main>
		</div>
	);
}
