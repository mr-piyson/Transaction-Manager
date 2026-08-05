"use client";

import { List, Plus, Search, SlidersHorizontal, Table2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsString, useQueryState } from "nuqs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc/client";

interface MoneyEntryFilterBarProps {
	kind: "expense" | "income";
	onCreate: () => void;
}

export function MoneyEntryFilterBar({
	kind,
	onCreate,
}: MoneyEntryFilterBarProps) {
	const t = useTranslations();
	const isExpense = kind === "expense";

	const [searchQuery, setSearchQuery] = useQueryState(
		"q",
		parseAsString.withDefault(""),
	);
	const [entityFilter, setEntityFilter] = useQueryState(
		isExpense ? "categoryId" : "customerId",
		parseAsString.withDefault(""),
	);
	const [dateFrom, setDateFrom] = useQueryState(
		"from",
		parseAsString.withDefault(""),
	);
	const [dateTo, setDateTo] = useQueryState(
		"to",
		parseAsString.withDefault(""),
	);
	const [viewMode, setViewMode] = useQueryState(
		"view",
		parseAsString.withDefault("table"),
	);

	const { data: categories } = trpc.expenses.categories.list.useQuery(
		undefined,
		{
			enabled: isExpense,
		},
	);
	const { data: customers } = trpc.customers.list.useQuery(
		{ page: 1, limit: 500 },
		{ enabled: !isExpense },
	);

	const entityOptions = isExpense
		? (categories ?? []).map((c) => ({ id: c.id, name: c.name }))
		: (customers?.data ?? []).map((c) => ({ id: c.id, name: c.name }));

	const activeFilterCount =
		(searchQuery ? 1 : 0) +
		(entityFilter ? 1 : 0) +
		(dateFrom ? 1 : 0) +
		(dateTo ? 1 : 0);

	const clearFilters = () => {
		setSearchQuery(null);
		setEntityFilter(null);
		setDateFrom(null);
		setDateTo(null);
	};

	return (
		<div className="w-full flex items-center justify-between gap-2 border-b px-4 py-2 shrink-0">
			{/* Left: Create Button + Filter Drawer */}
			<div className="flex items-center gap-2">
				<Button size="sm" onClick={onCreate}>
					<Plus className="size-3.5" />
					<span className="hidden sm:inline">
						{isExpense ? t("expenses.newExpense") : t("incomes.newIncome")}
					</span>
				</Button>

				<Separator orientation="vertical" className="h-5" />

				<Drawer direction="right">
					<DrawerTrigger asChild>
						<Button variant="outline" size="sm" className="relative gap-1.5">
							<SlidersHorizontal className="size-3.5" />
							<span className="hidden sm:inline">{t("common.filter")}</span>
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
					<DrawerContent className="w-[340px] sm:w-[380px]">
						<DrawerHeader>
							<DrawerTitle className="flex items-center gap-2">
								<SlidersHorizontal className="size-4" />
								{t("common.filter")}
							</DrawerTitle>
							<DrawerDescription>
								{t("common.filterDescription")}
							</DrawerDescription>
						</DrawerHeader>

						<div className="px-4 space-y-5 overflow-y-auto flex-1">
							{/* Search */}
							<div className="space-y-2">
								<label className="text-sm font-medium text-muted-foreground">
									{t("common.search")}
								</label>
								<div className="relative">
									<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
									<Input
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value || null)}
										placeholder={`${t("common.search")}...`}
										className="h-8 pl-8 text-xs"
									/>
								</div>
							</div>

							{/* Entity filter (category for expenses, customer for incomes) */}
							<div className="space-y-2">
								<label className="text-sm font-medium text-muted-foreground">
									{isExpense ? t("expenses.category") : t("incomes.customer")}
								</label>
								<Select
									value={entityFilter || "all"}
									onValueChange={(v) => setEntityFilter(v === "all" ? null : v)}
								>
									<SelectTrigger className="h-8 text-xs w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all" className="text-xs">
											{t("common.all")}
										</SelectItem>
										{entityOptions.map((opt) => (
											<SelectItem
												key={opt.id}
												value={opt.id}
												className="text-xs"
											>
												{opt.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* Date range */}
							<div className="space-y-2">
								<label className="text-sm font-medium text-muted-foreground">
									{t("common.date")}
								</label>
								<div className="grid grid-cols-2 gap-2">
									<div className="space-y-1">
										<label className="text-xs text-muted-foreground">
											{t("common.from")}
										</label>
										<Input
											type="date"
											value={dateFrom}
											onChange={(e) => setDateFrom(e.target.value || null)}
											className="h-8 text-xs"
										/>
									</div>
									<div className="space-y-1">
										<label className="text-xs text-muted-foreground">
											{t("common.to")}
										</label>
										<Input
											type="date"
											value={dateTo}
											onChange={(e) => setDateTo(e.target.value || null)}
											className="h-8 text-xs"
										/>
									</div>
								</div>
							</div>
						</div>

						<DrawerFooter className="flex-row items-center justify-between border-t pt-4">
							{activeFilterCount > 0 && (
								<Button variant="ghost" size="sm" onClick={clearFilters}>
									<X className="size-3.5 mr-1" />
									{t("common.clearFilters")}
								</Button>
							)}
							<DrawerClose asChild>
								<Button variant="outline" size="sm" className="ml-auto">
									{t("common.done")}
								</Button>
							</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			</div>

			{/* Right: View Toggle */}
			<TooltipProvider>
				<div className="flex items-center rounded-lg border p-0.5">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={viewMode === "list" ? "secondary" : "ghost"}
								size="sm"
								className="h-7 px-2"
								onClick={() => setViewMode("list")}
							>
								<List className="size-3.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p>{t("common.listView")}</p>
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={viewMode === "table" ? "secondary" : "ghost"}
								size="sm"
								className="h-7 px-2"
								onClick={() => setViewMode("table")}
							>
								<Table2 className="size-3.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p>{t("common.tableView")}</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</TooltipProvider>
		</div>
	);
}
