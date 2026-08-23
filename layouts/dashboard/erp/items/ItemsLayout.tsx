"use client";

import {
	AllCommunityModule,
	type ColDef,
	ModuleRegistry,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import {
	BarChart3,
	Download,
	Edit,
	Eye,
	Filter,
	MoreHorizontal,
	Package,
	ShieldAlert,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type * as React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { alert } from "@/components/Alert-dialog";
import { useUnifiedItemForm } from "@/components/dialogs";
import { useHardDeleteForm } from "@/components/dialogs/hardDeleteForm";
import { ItemDetailsSheet } from "@/components/items/item-details-sheet";
import { ItemListItem } from "@/components/items/item-list-item";
import { Header } from "@/components/layout/App-Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTableTheme } from "@/hooks/use-table-theme";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

ModuleRegistry.registerModules([AllCommunityModule]);

const title = "Items";

export default function ItemsLayout({
	children,
}: {
	children?: React.ReactNode;
}) {
	const t = useTranslations();
	const tableTheme = useTableTheme();
	const { openCreate, openEdit } = useUnifiedItemForm();
	const { openDialog: openHardDelete } = useHardDeleteForm();
	const { data: me } = trpc.auth.me.useQuery();
	const isSuperAdmin = me?.platformRole === "SUPER_ADMIN";

	const TYPE_FILTERS = [
		{ value: "", label: t("common.all") },
		{ value: "PRODUCT", label: t("items.types.PRODUCT") },
		{ value: "SERVICE", label: t("items.types.SERVICE") },
	];

	const [typeFilter, setTypeFilter] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
	const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

	const { data: categoryList } = trpc.categories.list.useQuery();
	const { data, isPending } = trpc.items.list.useQuery({
		type: (typeFilter || undefined) as "PRODUCT" | "SERVICE" | undefined,
		categoryId: categoryFilter ?? undefined,
		withStock: true,
	});
	const pathname = usePathname();
	const isListRoute = pathname === `/erp/${title.toLowerCase()}`;

	const utils = trpc.useUtils();
	const deleteMutation = trpc.items.delete.useMutation({
		onSuccess: () => {
			utils.items.list.invalidate();
			toast.success(t("common.itemDeleted"));
			setSelectedItemId(null);
		},
		onError: (e) => toast.error(e.message),
	});

	const items = data ?? [];

	const listColumnDefs = useMemo<ColDef[]>(
		() => [
			{
				field: "item",
				flex: 1,
				sortable: false,
				filter: false,
				suppressMenu: true,
				cellRenderer: (params: { data: any }) => {
					const item = params.data;
					const _isDeletable = ["PRODUCT", "SERVICE"].includes(item.type);
					return (
						<ContextMenu>
							<ContextMenuTrigger asChild>
								<button
									type="button"
									onClick={() => setSelectedItemId(item.id)}
									className="block h-full w-full text-left"
								>
									<ItemListItem
										data={item}
										className={cn(
											"hover:bg-muted/40 border border-transparent rounded-lg",
											selectedItemId === item.id
												? "border-primary bg-primary/10"
												: "",
										)}
									/>
								</button>
							</ContextMenuTrigger>
							<ContextMenuContent>
								<ContextMenuItem onClick={() => setSelectedItemId(item.id)}>
									<Eye className="size-4 mr-2" />
									{t("common.viewDetails")}
								</ContextMenuItem>
								<ContextMenuItem
									onClick={() => {
										openEdit({
											itemId: item.id,
											onSuccess: () => utils.items.list.invalidate(),
										});
									}}
								>
									<Edit className="size-4 mr-2" />
									{t("common.edit")}
								</ContextMenuItem>
								<ContextMenuSeparator />
								<ContextMenuItem
									onClick={() =>
										alert.delete({
											title: t("common.confirmDeleteTitle"),
											description: "This action cannot be undone.",
											confirmText: t("common.delete"),
											onConfirm: async () => {
												await deleteMutation.mutateAsync({ id: item.id });
											},
										})
									}
									variant="destructive"
								>
									<Trash2 className="size-4 mr-2" />
									{t("common.delete")}
								</ContextMenuItem>
								{isSuperAdmin && (
									<>
										<ContextMenuSeparator />
										<ContextMenuItem
											onClick={() =>
												openHardDelete({
													kind: "item",
													id: item.id,
													title: item.sku ?? item.name,
												})
											}
											variant="destructive"
										>
											<ShieldAlert className="size-4 mr-2" />
											{t("hardDelete.menu")}
										</ContextMenuItem>
									</>
								)}
							</ContextMenuContent>
						</ContextMenu>
					);
				},
			},
		],
		[selectedItemId, t, deleteMutation, title, isSuperAdmin, openHardDelete],
	);

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<Header
				title={t("layout.items")}
				icon={<Package className="size-5" />}
				actions={[
					{
						label: t("items.createItem"),
						onClick: () => openCreate(),
					},
				]}
			/>
			<div className="flex-1 min-h-0 w-full">
				{isListRoute ? (
					<div className="h-full w-full flex flex-col">
						<div className="flex w-full min-w-0 flex-row flex-wrap items-center justify-between gap-2 border-b px-4 py-2 shrink-0">
							{/* Start Actions */}
							<div className="flex min-w-0 items-center gap-2 ">
								<Tabs value={typeFilter} onValueChange={setTypeFilter}>
									<TabsList className="h-auto  justify-start">
										{TYPE_FILTERS.map((filter) => (
											<TabsTrigger
												key={filter.value}
												value={filter.value}
												className="text-xs px-3 py-1"
											>
												{filter.label}
											</TabsTrigger>
										))}
									</TabsList>
								</Tabs>
							</div>
							{/* End Actions */}
							<div className="ml-auto flex shrink-0 items-center gap-2">
								<Link href="/erp/reports/items">
									<Button variant="outline" size="sm">
										<BarChart3 className="size-3.5" />
										<span className="hidden md:block">
											{t("layout.reports")}
										</span>
									</Button>
								</Link>
								<Link href="/erp/items/import">
									<Button variant="outline" size="sm">
										<Download className="size-3.5" />
										<span className="hidden md:block">Import</span>
									</Button>
								</Link>
							</div>
						</div>
						{/* Category filter bar */}
						<div className="w-full min-w-0 border-b px-4 py-1.5 shrink-0 overflow-hidden">
							<div className="flex items-center gap-2 overflow-x-auto w-full pb-1">
								<Filter className="size-3.5 text-muted-foreground shrink-0" />
								<button
									className={cn(
										"shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
										categoryFilter === null
											? "bg-primary text-primary-foreground"
											: "bg-muted text-muted-foreground hover:bg-muted/80",
									)}
									onClick={() => setCategoryFilter(null)}
								>
									{t("common.all")}
								</button>
								{categoryList?.map((cat) => (
									<button
										key={cat.id}
										className={cn(
											"shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
											categoryFilter === cat.id
												? "bg-primary text-primary-foreground"
												: "bg-muted text-muted-foreground hover:bg-muted/80",
										)}
										onClick={() =>
											setCategoryFilter(
												categoryFilter === cat.id ? null : cat.id,
											)
										}
									>
										{cat.color && (
											<span
												className="size-2 rounded-full shrink-0"
												style={{ backgroundColor: cat.color }}
											/>
										)}
										{cat.name}
									</button>
								))}
							</div>
						</div>
						<AgGridReact
							rowData={items}
							columnDefs={listColumnDefs}
							animateRows
							domLayout="normal"
							getRowId={(params) => params.data.id}
							suppressScrollOnNewData
							enableCellTextSelection
							ensureDomOrder
							loading={isPending}
							headerHeight={0}
							rowHeight={72}
						/>
					</div>
				) : (
					<div className="h-full w-full overflow-y-auto">{children}</div>
				)}
			</div>
			<ItemDetailsSheet
				itemId={selectedItemId}
				onOpenChange={(open) => {
					if (!open) setSelectedItemId(null);
				}}
			/>
		</div>
	);
}
