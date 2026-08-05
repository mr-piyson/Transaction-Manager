"use client";

import { useTranslations } from "next-intl";
import { useDateFormat } from "@/hooks/use-date-format";
import {
	Banknote,
	Edit,
	Eye,
	MoreHorizontal,
	ShieldAlert,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useMemo, useRef } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { toast } from "sonner";
import {
	AllCommunityModule,
	ModuleRegistry,
	type ColDef,
	type GridApi,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
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
import { alert } from "@/components/Alert-dialog";
import { useTableTheme } from "@/hooks/use-table-theme";
import { useCurrency } from "@/hooks/use-currency";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/App-Header";
import { IncomeListItem } from "@/components/incomes/income-list-item";
import { useIncomeForm } from "@/components/dialogs";
import { useHardDeleteForm } from "@/components/dialogs/hardDeleteForm";
import { MoneyEntryFilterBar } from "@/components/erp/money-entry-filter-bar";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function IncomesLayout({
	children,
}: {
	children?: React.ReactNode;
}) {
	const t = useTranslations();
	const { formatDate } = useDateFormat();
	const { format } = useCurrency();
	const tableTheme = useTableTheme();
	const { openCreate, openEdit } = useIncomeForm();
	const { openDialog: openHardDelete } = useHardDeleteForm();
	const { data: me } = trpc.auth.me.useQuery();
	const isSuperAdmin = me?.platformRole === "SUPER_ADMIN";

	const router = useRouter();
	const pathname = usePathname();
	const activeItem = pathname.split("/")[3];
	const isListRoute = pathname === "/erp/incomes";

	const [searchQuery] = useQueryState("q", parseAsString.withDefault(""));
	const [customerFilter] = useQueryState(
		"customerId",
		parseAsString.withDefault(""),
	);
	const [dateFrom] = useQueryState("from", parseAsString.withDefault(""));
	const [dateTo] = useQueryState("to", parseAsString.withDefault(""));
	const [viewMode] = useQueryState("view", parseAsString.withDefault("table"));

	const { data, isPending } = trpc.incomes.list.useQuery({
		limit: 500,
		search: searchQuery || undefined,
		customerId: customerFilter || undefined,
		dateFrom: dateFrom ? new Date(dateFrom) : undefined,
		dateTo: dateTo ? new Date(dateTo) : undefined,
	});

	const utils = trpc.useUtils();
	const deleteMutation = trpc.incomes.delete.useMutation({
		onSuccess: () => {
			utils.incomes.list.invalidate();
			toast.success(t("incomes.incomeDeleted"));
			if (activeItem) router.push("/erp/incomes");
		},
		onError: (e) => toast.error(e.message),
	});

	const incomes = data?.items ?? [];

	const handleEdit = (item: any) => {
		openEdit(
			{
				id: item.id,
				description: item.description,
				amount: Number(item.amount),
				method: item.method,
				date: item.date,
				reference: item.reference ?? undefined,
				notes: item.notes ?? undefined,
				customerId: item.customerId,
				invoiceId: item.invoiceId,
			},
			{ onSuccess: () => utils.incomes.byId.invalidate({ id: item.id }) },
		);
	};

	const handleDelete = (item: any) => {
		alert.delete({
			title: t("common.confirmDeleteTitle"),
			description: "This action cannot be undone.",
			confirmText: t("common.delete"),
			onConfirm: async () => {
				await deleteMutation.mutateAsync({ id: item.id });
			},
		});
	};

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
					return (
						<ContextMenu>
							<ContextMenuTrigger asChild>
								<Link
									href={`/erp/incomes/${item.id}`}
									scroll={false}
									draggable={false}
									className="block w-full h-full"
								>
									<IncomeListItem
										data={item}
										className={cn(
											"hover:bg-muted/40 border border-transparent rounded-lg",
											activeItem === item.id
												? "border-primary bg-primary/10"
												: "",
										)}
									/>
								</Link>
							</ContextMenuTrigger>
							<ContextMenuContent>
								<ContextMenuItem
									onClick={() => router.push(`/erp/incomes/${item.id}`)}
								>
									<Eye className="size-4 mr-2" />
									{t("common.viewDetails")}
								</ContextMenuItem>
								<ContextMenuItem onClick={() => handleEdit(item)}>
									<Edit className="size-4 mr-2" />
									{t("common.edit")}
								</ContextMenuItem>
								<ContextMenuSeparator />
								<ContextMenuItem
									onClick={() => handleDelete(item)}
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
													kind: "income",
													id: item.id,
													title: item.description,
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
		[
			activeItem,
			router,
			t,
			handleEdit,
			handleDelete,
			isSuperAdmin,
			openHardDelete,
		],
	);

	const tableColumnDefs = useMemo<ColDef[]>(
		() => [
			{
				headerName: t("incomes.date"),
				field: "date",
				width: 110,
				filter: "agDateColumnFilter",
				cellClass: "text-[12px]",
				valueFormatter: (params) =>
					params.value ? formatDate(params.value) : "—",
			},
			{
				headerName: t("incomes.description"),
				field: "description",
				flex: 1,
				filter: "agTextColumnFilter",
				cellClass: "font-medium text-[12px]",
				cellRenderer: (params: { data: any }) => {
					const item = params.data;
					return (
						<div className="flex flex-col justify-center overflow-hidden">
							<span className="truncate">{item.description}</span>
							{item.reference && (
								<span className="truncate text-[11px] text-muted-foreground">
									{item.reference}
								</span>
							)}
						</div>
					);
				},
			},
			{
				headerName: t("incomes.customer"),
				field: "customer.name",
				width: 150,
				filter: "agTextColumnFilter",
				cellClass: "text-[12px]",
				cellRenderer: (params: { data: any }) =>
					params.data?.customer ? (
						<Badge variant="secondary" className="font-medium">
							{params.data.customer.name}
						</Badge>
					) : (
						<span className="text-muted-foreground">
							{t("incomes.noCustomer")}
						</span>
					),
			},
			{
				headerName: t("incomes.method"),
				field: "method",
				width: 110,
				filter: "agTextColumnFilter",
				cellClass: "text-[12px] text-muted-foreground",
			},
			{
				headerName: t("incomes.invoice"),
				field: "invoice.serial",
				width: 130,
				filter: "agTextColumnFilter",
				cellClass: "text-[12px]",
				cellRenderer: (params: { data: any }) =>
					params.data?.invoice ? (
						<Badge variant="outline" className="font-mono text-[11px]">
							{params.data.invoice.serial}
						</Badge>
					) : (
						<span className="text-muted-foreground">—</span>
					),
			},
			{
				headerName: t("incomes.amount"),
				field: "amount",
				width: 120,
				type: "numericColumn",
				filter: "agNumberColumnFilter",
				cellClass: "tabular-nums text-[12px] font-semibold",
				valueFormatter: (params) => format(params.value),
			},
			{
				headerName: "",
				field: "id",
				width: 50,
				sortable: false,
				filter: false,
				suppressMenu: true,
				cellRenderer: (params: { data: any }) => {
					const item = params.data;
					return (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
									<MoreHorizontal className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onClick={() => router.push(`/erp/incomes/${item.id}`)}
								>
									<Eye className="size-4 mr-2" />
									{t("common.viewDetails")}
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => handleEdit(item)}>
									<Edit className="size-4 mr-2" />
									{t("common.edit")}
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={() => handleDelete(item)}>
									<Trash2 className="size-4 mr-2 text-destructive" />
									<span className="text-destructive">{t("common.delete")}</span>
								</DropdownMenuItem>
								{isSuperAdmin && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onClick={() =>
												openHardDelete({
													kind: "income",
													id: item.id,
													title: item.description,
												})
											}
										>
											<ShieldAlert className="size-4 mr-2 text-destructive" />
											<span className="text-destructive">
												{t("hardDelete.menu")}
											</span>
										</DropdownMenuItem>
									</>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					);
				},
			},
		],
		[
			t,
			formatDate,
			format,
			handleEdit,
			handleDelete,
			isSuperAdmin,
			openHardDelete,
			router,
		],
	);

	const defaultColDef = useMemo(
		() => ({
			sortable: true,
			filter: true,
			resizable: true,
			minWidth: 60,
		}),
		[],
	);

	const gridApiRef = useRef<GridApi | null>(null);
	const gridRef = useRef<any>(null);

	const columnDefs = viewMode === "list" ? listColumnDefs : tableColumnDefs;

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<Header
				title={t("layout.incomes")}
				icon={<Banknote className="size-5" />}
			/>
			<div className="flex-1 min-h-0 w-full">
				{isListRoute ? (
					<div className="h-full w-full flex flex-col">
						<MoneyEntryFilterBar kind="income" onCreate={() => openCreate()} />
						<AgGridReact
							ref={gridRef}
							rowData={incomes}
							columnDefs={columnDefs}
							defaultColDef={viewMode === "list" ? undefined : defaultColDef}
							theme={tableTheme}
							animateRows
							onGridReady={(params) => {
								gridApiRef.current = params.api;
							}}
							domLayout="normal"
							getRowId={(params) => params.data.id}
							suppressScrollOnNewData
							enableCellTextSelection
							ensureDomOrder
							loading={isPending}
							headerHeight={viewMode === "list" ? 0 : undefined}
							rowHeight={viewMode === "list" ? 72 : undefined}
						/>
					</div>
				) : (
					<div className="h-full w-full overflow-y-auto">{children}</div>
				)}
			</div>
		</div>
	);
}
