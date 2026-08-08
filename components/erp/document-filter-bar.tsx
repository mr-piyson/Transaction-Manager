"use client";

import {
	Check,
	CircleDollarSign,
	DollarSign,
	ListFilter,
	Plus,
	SlidersHorizontal,
	X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";

const STATUS_FILTERS = [
	{ value: "", labelKey: "common.all" as const },
	{ value: "DRAFT", labelKey: "invoices.draft" as const },
	{ value: "SENT", labelKey: "invoices.sent" as const },
	{ value: "APPROVED", labelKey: "invoices.approved" as const },
	{ value: "CANCELLED", labelKey: "invoices.cancelled" as const },
];

const PAYMENT_STATUS_FILTERS = [
	{ value: "all", labelKey: "common.all" as const },
	{ value: "PENDING", labelKey: "common.pending" as const },
	{ value: "PARTIAL", labelKey: "common.partial" as const },
	{ value: "PAID", labelKey: "common.paid" as const },
	{ value: "OVERDUE", labelKey: "common.overdue" as const },
];

function useDocumentFilters(type: "invoices" | "quotations") {
	const showPaymentFilter = type === "invoices";

	const [statusFilter, setStatusFilter] = useQueryState(
		"status",
		parseAsString.withDefault(""),
	);
	const [paymentStatusFilter, setPaymentStatusFilter] = useQueryState(
		"paymentStatus",
		parseAsString.withDefault("all"),
	);

	const activeFilterCount =
		(statusFilter ? 1 : 0) +
		(showPaymentFilter && paymentStatusFilter !== "all" ? 1 : 0);

	const clearFilters = () => {
		setStatusFilter(null);
		setPaymentStatusFilter(null);
	};

	return {
		statusFilter,
		setStatusFilter,
		paymentStatusFilter,
		setPaymentStatusFilter,
		showPaymentFilter,
		activeFilterCount,
		clearFilters,
	};
}

interface DocumentFilterBarProps {
	type: "invoices" | "quotations";
	onCreate: () => void;
}

export function DocumentFilterBar({ type, onCreate }: DocumentFilterBarProps) {
	const t = useTranslations();
	const {
		statusFilter,
		setStatusFilter,
		paymentStatusFilter,
		setPaymentStatusFilter,
		showPaymentFilter,
	} = useDocumentFilters(type);

	return (
		<div className="flex flex-row items-center justify-between border-b px-4 h-14 shrink-0">
			<div className="flex items-center gap-2">
				<Button size="sm" onClick={onCreate}>
					<Plus className="size-3.5" />
					<span className="hidden md:block">{t("invoices.newInvoice")}</span>
				</Button>

				<div className="hidden md:flex items-center gap-1">
					<Separator orientation="vertical" className="h-5" />
					{STATUS_FILTERS.map((f) => (
						<Button
							key={f.value}
							variant={statusFilter === f.value ? "default" : "outline"}
							size="sm"
							className="h-8 text-xs"
							onClick={() => setStatusFilter(f.value || null)}
						>
							{t(f.labelKey)}
						</Button>
					))}
					{showPaymentFilter && (
						<>
							<Separator orientation="vertical" className="h-5" />
							{PAYMENT_STATUS_FILTERS.map((f) => (
								<Button
									key={f.value}
									variant={
										paymentStatusFilter === f.value ? "default" : "outline"
									}
									size="sm"
									className="h-8 text-xs"
									onClick={() =>
										setPaymentStatusFilter(f.value === "all" ? null : f.value)
									}
								>
									{t(f.labelKey)}
								</Button>
							))}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

export function DocumentFilterTrigger({
	type,
}: {
	type: "invoices" | "quotations";
}) {
	const t = useTranslations();
	const { activeFilterCount } = useDocumentFilters(type);

	return (
		<Drawer direction="right">
			<DrawerTrigger asChild>
				<Button variant="ghost" size="sm" className="relative h-8 shrink-0">
					<SlidersHorizontal className="size-3.5" />
					{activeFilterCount > 0 && (
						<Badge
							variant="destructive"
							className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] rounded-full"
						>
							{activeFilterCount}
						</Badge>
					)}
				</Button>
			</DrawerTrigger>
			<DrawerContent className="w-[300px] sm:w-[340px]">
				<DrawerHeader>
					<DrawerTitle className="flex items-center gap-2">
						<SlidersHorizontal className="size-4" />
						{t("common.filter")}
					</DrawerTitle>
					<DrawerDescription>{t("common.filterDescription")}</DrawerDescription>
				</DrawerHeader>

				<DrawerBody type={type} />

				<DrawerFooter className="flex-row items-center justify-between border-t pt-4">
					<ClearButton type={type} />
					<DrawerClose asChild>
						<Button variant="outline" size="sm" className="ml-auto">
							{t("common.done")}
						</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

function ActiveFiltersSummary({ type }: { type: "invoices" | "quotations" }) {
	const t = useTranslations();
	const {
		statusFilter,
		setStatusFilter,
		paymentStatusFilter,
		setPaymentStatusFilter,
		showPaymentFilter,
		activeFilterCount,
	} = useDocumentFilters(type);

	if (activeFilterCount === 0) return null;

	const statusLabel = STATUS_FILTERS.find((f) => f.value === statusFilter);
	const paymentLabel = PAYMENT_STATUS_FILTERS.find(
		(f) => f.value === paymentStatusFilter,
	);

	return (
		<div className="flex flex-wrap gap-1">
			{statusFilter && statusLabel && (
				<Badge variant="secondary" className="gap-1 pr-1 text-xs h-5">
					{t(statusLabel.labelKey)}
					<button
						type="button"
						onClick={() => setStatusFilter(null)}
						className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
					>
						<X className="size-2.5" />
					</button>
				</Badge>
			)}
			{showPaymentFilter && paymentStatusFilter !== "all" && paymentLabel && (
				<Badge variant="secondary" className="gap-1 pr-1 text-xs h-5">
					{t(paymentLabel.labelKey)}
					<button
						type="button"
						onClick={() => setPaymentStatusFilter(null)}
						className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
					>
						<X className="size-2.5" />
					</button>
				</Badge>
			)}
		</div>
	);
}

function FilterOption({
	label,
	active,
	onClick,
}: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex items-center justify-between w-full rounded-md px-2.5 py-2 text-xs transition-colors ${
				active
					? "bg-primary text-primary-foreground"
					: "hover:bg-muted text-foreground"
			}`}
		>
			<span>{label}</span>
			{active && <Check className="size-3.5 shrink-0" />}
		</button>
	);
}

function DrawerBody({ type }: { type: "invoices" | "quotations" }) {
	const t = useTranslations();
	const {
		statusFilter,
		setStatusFilter,
		paymentStatusFilter,
		setPaymentStatusFilter,
		showPaymentFilter,
	} = useDocumentFilters(type);

	return (
		<div className="flex-1 overflow-y-auto px-4 space-y-3">
			<ActiveFiltersSummary type={type} />

			<Card className="gap-0 py-2">
				<CardHeader className="py-0 px-2.5">
					<CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
						<ListFilter size={14} />
						{t("common.status")}
					</CardTitle>
				</CardHeader>
				<Separator orientation="horizontal" className="mb-2" />
				<CardContent className="my-0 p-1 pt-0 space-y-px">
					{STATUS_FILTERS.map((f) => (
						<FilterOption
							key={f.value}
							label={t(f.labelKey)}
							active={statusFilter === f.value}
							onClick={() => setStatusFilter(f.value || null)}
						/>
					))}
				</CardContent>
			</Card>

			{showPaymentFilter && (
				<Card className="gap-0 py-2">
					<CardHeader className="py-0 px-2.5">
						<CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
							<DollarSign size={14} />
							{t("invoices.paymentStatus")}
						</CardTitle>
					</CardHeader>
					<Separator orientation="horizontal" className="mb-2" />
					<CardContent className="my-0 p-1 pt-0 space-y-px">
						{PAYMENT_STATUS_FILTERS.map((f) => (
							<FilterOption
								key={f.value}
								label={t(f.labelKey)}
								active={
									f.value === "all"
										? paymentStatusFilter === "all"
										: paymentStatusFilter === f.value
								}
								onClick={() =>
									setPaymentStatusFilter(f.value === "all" ? null : f.value)
								}
							/>
						))}
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function ClearButton({ type }: { type: "invoices" | "quotations" }) {
	const t = useTranslations();
	const { activeFilterCount, clearFilters } = useDocumentFilters(type);

	if (activeFilterCount === 0) return null;

	return (
		<Button variant="ghost" size="sm" onClick={clearFilters}>
			<X className="size-3.5 mr-1" />
			{t("common.clearFilters")}
		</Button>
	);
}
