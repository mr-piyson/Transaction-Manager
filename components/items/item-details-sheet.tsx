"use client";

import {
	Box,
	Check,
	CircleAlert,
	Edit,
	Hash,
	Package,
	ShoppingCart,
	Tag,
	Warehouse,
	Wrench,
	XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useUnifiedItemForm } from "@/components/dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface ItemDetailsSheetProps {
	itemId: string | null;
	onOpenChange: (open: boolean) => void;
}

const TYPE_STYLES = {
	PRODUCT: {
		icon: Box,
		className: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
	},
	SERVICE: {
		icon: Wrench,
		className:
			"bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
	},
} as const;

function getStockStatus(stock: number, minStock: number, reorderPoint: number) {
	if (stock <= 0) {
		return {
			label: "Out of stock",
			icon: XCircle,
			className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
		};
	}
	if (stock <= minStock) {
		return {
			label: "Below minimum",
			icon: CircleAlert,
			className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
		};
	}
	if (stock <= reorderPoint) {
		return {
			label: "Reorder soon",
			icon: CircleAlert,
			className:
				"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
		};
	}
	return {
		label: "In stock",
		icon: Check,
		className:
			"bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
	};
}

function DetailRow({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Tag;
	label: string;
	value: ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-4 py-2.5">
			<div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
				<Icon className="size-4 shrink-0" />
				<span>{label}</span>
			</div>
			<span className="max-w-[60%] truncate text-right text-sm font-medium">
				{value}
			</span>
		</div>
	);
}

export function ItemDetailsSheet({
	itemId,
	onOpenChange,
}: ItemDetailsSheetProps) {
	const t = useTranslations();
	const { openEdit } = useUnifiedItemForm();
	const utils = trpc.useUtils();
	const {
		data: item,
		isLoading,
		isError,
	} = trpc.items.byId.useQuery({ id: itemId ?? "" }, { enabled: !!itemId });

	const close = () => onOpenChange(false);
	const isService = item?.type === "SERVICE";
	const totalStock =
		item?.stock?.reduce(
			(sum: number, row: any) => sum + Number(row.quantity),
			0,
		) ?? 0;
	const typeStyle =
		TYPE_STYLES[item?.type as keyof typeof TYPE_STYLES] ?? TYPE_STYLES.PRODUCT;
	const TypeIcon = typeStyle.icon;
	const stockStatus = getStockStatus(
		totalStock,
		Number(item?.minStock ?? 0),
		Number(item?.reorderPoint ?? 0),
	);
	const StockIcon = stockStatus.icon;

	return (
		<Sheet modal={false} open={!!itemId} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				showOverlay={false}
				className="w-full gap-0 overflow-hidden border-l bg-background p-0 shadow-2xl sm:max-w-md"
			>
				<SheetHeader className="sr-only">
					<SheetTitle>{item?.name ?? t("items.title")}</SheetTitle>
					<SheetDescription>{t("items.selectDescription")}</SheetDescription>
				</SheetHeader>
				{isLoading ? (
					<div className="flex flex-1 items-center justify-center">
						<Spinner className="size-8 text-primary" />
					</div>
				) : isError || !item ? (
					<div className="flex flex-1 items-center justify-center p-6">
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Package className="size-6" />
								</EmptyMedia>
								<EmptyTitle>{t("common.failedToLoad")}</EmptyTitle>
								<EmptyDescription>{t("items.doesNotExist")}</EmptyDescription>
							</EmptyHeader>
						</Empty>
					</div>
				) : (
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
						<div className="border-b bg-muted/20 px-5 pb-5 pt-6 sm:px-6">
							<div className="min-w-0">
								<div className="mb-1 flex flex-wrap items-center gap-2">
									<Badge className={cn("gap-1", typeStyle.className)}>
										<TypeIcon className="size-3" />
										{item.type}
									</Badge>
									{!item.isActive && (
										<Badge variant="secondary">Inactive</Badge>
									)}
								</div>
								<h2 className="truncate text-lg font-semibold tracking-tight">
									{item.name}
								</h2>
								<p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
									<Hash className="size-3" /> {item.sku ?? "—"}
								</p>
							</div>
							<div className="mt-4 flex items-center gap-2">
								<Button
									size="sm"
									className="flex-1"
									onClick={() =>
										openEdit({
											itemId: item.id,
											onSuccess: () => {
												utils.items.list.invalidate();
												utils.items.byId.invalidate({ id: item.id });
											},
										})
									}
								>
									<Edit className="size-4" />
									Edit item
								</Button>
								<Button size="sm" variant="outline" onClick={close}>
									Close
								</Button>
							</div>
						</div>

						<div className="space-y-4 p-5 sm:p-6">
							<Card className="overflow-hidden">
								<CardContent className="p-0">
									<div className="flex aspect-[4/3] max-h-80 items-center justify-center bg-muted/20 p-4 sm:aspect-[16/10]">
										{item.image ? (
											<img
												src={item.image}
												alt={item.name}
												className="size-full object-contain object-center"
											/>
										) : (
											<TypeIcon className="size-16 text-muted-foreground/40" />
										)}
									</div>
								</CardContent>
							</Card>

							{!isService && (
								<Card className="overflow-hidden border-0 bg-muted/35 shadow-none">
									<CardContent className="p-4">
										<div className="flex items-center justify-between gap-3">
											<div>
												<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
													Stock status
												</p>
												<p className="mt-1 text-2xl font-semibold tabular-nums">
													{totalStock}{" "}
													<span className="text-sm font-normal text-muted-foreground">
														{item.unit}
													</span>
												</p>
											</div>
											<Badge className={cn("gap-1", stockStatus.className)}>
												<StockIcon className="size-3" /> {stockStatus.label}
											</Badge>
										</div>
										<div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
											<div>
												<p className="text-muted-foreground">Minimum</p>
												<p className="mt-1 font-semibold tabular-nums">
													{item.minStock}
												</p>
											</div>
											<div>
												<p className="text-muted-foreground">Reorder at</p>
												<p className="mt-1 font-semibold tabular-nums">
													{item.reorderPoint}
												</p>
											</div>
										</div>
									</CardContent>
								</Card>
							)}

							<Card>
								<CardContent className="divide-y p-3">
									<DetailRow
										icon={Tag}
										label={t("items.category")}
										value={item.category?.name ?? "—"}
									/>
									<DetailRow
										icon={Package}
										label={t("items.unit")}
										value={item.unit ?? "—"}
									/>
									<DetailRow
										icon={ShoppingCart}
										label={t("items.salesPrice")}
										value={Number(item.salesPrice).toFixed(3)}
									/>
									{!isService && (
										<DetailRow
											icon={ShoppingCart}
											label={t("items.purchasePrice")}
											value={Number(item.purchasePrice).toFixed(3)}
										/>
									)}
									<DetailRow
										icon={Warehouse}
										label={t("common.tax")}
										value={
											item.taxRate
												? `${item.taxRate.name} (${Number(item.taxRate.rate)}%)`
												: "—"
										}
									/>
									<DetailRow
										icon={Hash}
										label={t("items.barcode")}
										value={item.barcode ?? "—"}
									/>
								</CardContent>
							</Card>

							<Card>
								<CardContent className="divide-y p-3">
									<DetailRow
										icon={Check}
										label={t("items.saleable")}
										value={
											<Badge
												variant={item.isSaleable ? "default" : "secondary"}
												className="text-xs"
											>
												{item.isSaleable ? "Yes" : "No"}
											</Badge>
										}
									/>
									<DetailRow
										icon={ShoppingCart}
										label={t("items.purchasable")}
										value={
											<Badge
												variant={item.isPurchasable ? "default" : "secondary"}
												className="text-xs"
											>
												{item.isPurchasable ? "Yes" : "No"}
											</Badge>
										}
									/>
									<DetailRow
										icon={Box}
										label={t("items.reorderQty")}
										value={`${item.reorderQty ?? 0} ${item.unit ?? ""}`}
									/>
									<DetailRow
										icon={ShoppingCart}
										label={t("items.avgCost")}
										value={Number(item.averageCost).toFixed(3)}
									/>
								</CardContent>
							</Card>

							{!isService && item.stock?.length > 0 && (
								<div>
									<div className="mb-2 flex items-center gap-2 text-sm font-semibold">
										<Warehouse className="size-4 text-muted-foreground" />
										Per warehouse
									</div>
									<div className="space-y-2">
										{item.stock.map((row: any) => (
											<div
												key={row.warehouse.id}
												className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5"
											>
												<span className="flex min-w-0 items-center gap-2 text-sm">
													<Warehouse className="size-3.5 text-muted-foreground" />
													<span className="truncate">{row.warehouse.name}</span>
												</span>
												<span
													className={cn(
														"shrink-0 text-sm font-semibold tabular-nums",
														Number(row.quantity) <= 0 && "text-destructive",
													)}
												>
													{Number(row.quantity)} {item.unit}
												</span>
											</div>
										))}
									</div>
								</div>
							)}

							{item.description && (
								<div className="rounded-lg border bg-muted/20 p-4">
									<p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
										Description
									</p>
									<p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
										{item.description}
									</p>
								</div>
							)}

							{item.supplierItems?.length > 0 && (
								<div>
									<div className="mb-2 flex items-center gap-2 text-sm font-semibold">
										<ShoppingCart className="size-4 text-muted-foreground" />
										{t("suppliers.itemsSupplied")}
									</div>
									<div className="space-y-2">
										{item.supplierItems.map((supplierItem: any) => (
											<div
												key={supplierItem.id}
												className="rounded-lg border bg-card px-3 py-2.5"
											>
												<div className="flex items-center justify-between gap-3">
													<span className="truncate text-sm font-medium">
														{supplierItem.supplier?.name ?? "—"}
													</span>
													<span className="shrink-0 text-sm font-semibold tabular-nums">
														{Number(supplierItem.basePrice).toFixed(3)}{" "}
														{supplierItem.currency}
													</span>
												</div>
												<p className="mt-1 text-xs text-muted-foreground">
													{supplierItem.supplierSku ?? "—"} ·{" "}
													{supplierItem.leadTimeDays ?? 0} days · min{" "}
													{supplierItem.minOrderQty ?? 1}
												</p>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
