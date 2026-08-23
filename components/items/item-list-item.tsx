import { Box, type Package, Wrench } from "lucide-react";
import { type HTMLAttributes, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ItemListItemProps extends HTMLAttributes<HTMLDivElement> {
	data?: any;
}

const TYPE_STYLES: Record<
	string,
	{ icon: typeof Package; bg: string; fg: string }
> = {
	PRODUCT: {
		icon: Box,
		bg: "bg-sky-100 dark:bg-sky-900/40",
		fg: "text-sky-700 dark:text-sky-300",
	},
	SERVICE: {
		icon: Wrench,
		bg: "bg-orange-100 dark:bg-orange-900/40",
		fg: "text-orange-700 dark:text-orange-300",
	},
};

const STOCK_STYLES = {
	OUT_OF_STOCK: {
		label: "Out of stock",
		className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
	},
	BELOW_MINIMUM: {
		label: "Below minimum",
		className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
	},
	REORDER_SOON: {
		label: "Reorder soon",
		className:
			"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
	},
	IN_STOCK: {
		label: "In stock",
		className:
			"bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
	},
} as const;

export function ItemListItem({ data, className, ...props }: ItemListItemProps) {
	const { name, sku, type, image, totalStock, minStock, reorderPoint, unit } =
		data || {};
	const [imgError, setImgError] = useState(false);
	const style = TYPE_STYLES[type as string] ?? TYPE_STYLES.PRODUCT;
	const Icon = style.icon;
	const stock = Number(totalStock ?? 0);
	const stockStatus =
		stock <= 0
			? STOCK_STYLES.OUT_OF_STOCK
			: stock <= Number(minStock ?? 0)
				? STOCK_STYLES.BELOW_MINIMUM
				: stock <= Number(reorderPoint ?? 0)
					? STOCK_STYLES.REORDER_SOON
					: STOCK_STYLES.IN_STOCK;

	return (
		<div
			className={cn(
				"grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-3",
				className,
			)}
			{...props}
		>
			<div
				className={cn(
					"size-11 rounded-lg flex items-center justify-center shrink-0 overflow-hidden",
					style.bg,
				)}
			>
				{image && !imgError ? (
					<img
						src={image}
						alt={name}
						className="size-full object-cover"
						onError={() => setImgError(true)}
					/>
				) : (
					<Icon className={cn("size-5", style.fg)} />
				)}
			</div>
			<div className="min-w-0">
				<div className="flex min-w-0 items-center gap-2">
					<p className="min-w-0 flex-1 truncate font-semibold">{name}</p>
					<Badge variant="outline" className={cn("text-xs", style.fg)}>
						<Icon className={cn("size-5", style.fg)} />
						{type}
					</Badge>
				</div>
				<div className="flex min-w-0 items-center gap-2">
					<p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
						{sku ?? "—"}
					</p>
					<Badge
						variant="outline"
						className={cn("text-xs", stockStatus.className)}
					>
						{stockStatus.label}: {stock} {unit ?? ""}
					</Badge>
				</div>
			</div>
		</div>
	);
}
