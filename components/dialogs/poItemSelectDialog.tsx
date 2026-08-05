"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Package, SearchIcon } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface POItemSelectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: any[];
	isLoading: boolean;
	existingItemIds: string[];
	onSelect: (items: any[]) => void;
}

export function POItemSelectDialog({
	open,
	onOpenChange,
	items,
	isLoading,
	existingItemIds,
	onSelect,
}: POItemSelectDialogProps) {
	const [search, setSearch] = React.useState("");
	const [selected, setSelected] = React.useState<Set<string>>(new Set());
	const [scrollReady, setScrollReady] = React.useState(false);
	const scrollRef = React.useRef<HTMLDivElement>(null);

	const setScrollRef = React.useCallback((node: HTMLDivElement | null) => {
		scrollRef.current = node;
		if (node) {
			setScrollReady(true);
		}
	}, []);

	const existingSet = React.useMemo(
		() => new Set(existingItemIds),
		[existingItemIds],
	);

	const filtered = React.useMemo(() => {
		if (!search) return items;
		const q = search.toLowerCase();
		return items.filter(
			(item: any) =>
				item.name?.toLowerCase().includes(q) ||
				item.sku?.toLowerCase().includes(q) ||
				item.barcode?.toLowerCase().includes(q),
		);
	}, [items, search]);

	const virtualizer = useVirtualizer({
		count: filtered.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => 64,
		overscan: 5,
	});

	React.useEffect(() => {
		if (open) {
			setSelected(new Set());
			setSearch("");
			setScrollReady(false);
		}
	}, [open]);

	React.useEffect(() => {
		if (scrollReady && filtered.length > 0) {
			virtualizer.scrollToIndex(0);
		}
	}, [scrollReady, filtered.length, virtualizer]);

	const toggleItem = (itemId: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(itemId)) {
				next.delete(itemId);
			} else {
				next.add(itemId);
			}
			return next;
		});
	};

	const handleAdd = () => {
		const selectedItems = items.filter(
			(item: any) => selected.has(item.id) && !existingSet.has(item.id),
		);
		onSelect(selectedItems);
	};

	const availableCount = [...selected].filter((id) => !existingSet.has(id)).length;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl gap-0 p-0">
				<DialogHeader className="px-6 pt-6 pb-4">
					<DialogTitle>Select Items</DialogTitle>
					<DialogDescription>
						Search and select products to add to this purchase order.
					</DialogDescription>
				</DialogHeader>

				{/* Search input */}
				<div className="flex items-center gap-2 border-t border-b px-6 py-3">
					<SearchIcon className="size-4 shrink-0 text-muted-foreground" />
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search by name, SKU, or barcode..."
						className="flex-1 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
						autoFocus
					/>
					{search && (
						<button
							type="button"
							onClick={() => setSearch("")}
							className="text-xs text-muted-foreground hover:text-foreground"
						>
							Clear
						</button>
					)}
				</div>

				{/* Virtualized list */}
				<div ref={setScrollRef} className="h-[400px] overflow-y-auto">
					{isLoading ? (
						<div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
							Loading items...
						</div>
					) : filtered.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
							<Package className="size-8 opacity-30" />
							<p>
								{search ? "No items match your search." : "No items available."}
							</p>
						</div>
					) : (
						<div
							style={{
								height: `${virtualizer.getTotalSize()}px`,
								position: "relative",
								width: "100%",
							}}
						>
							{virtualizer.getVirtualItems().map((virtualRow) => {
								const item = filtered[virtualRow.index] as any;
								const isExisting = existingSet.has(item.id);
								const isSelected = selected.has(item.id);
								const supplierItem = item.supplierItems?.[0];
								const price =
									Number(supplierItem?.basePrice ?? item.purchasePrice) || 0;
								const stock = Number(item.totalStock) ?? 0;

								return (
									<div
										key={item.id}
										data-index={virtualRow.index}
										ref={virtualizer.measureElement}
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											transform: `translateY(${virtualRow.start}px)`,
										}}
										onClick={() => {
											if (!isExisting) toggleItem(item.id);
										}}
										className={cn(
											"flex items-center gap-3 px-6 py-3 cursor-pointer border-b border-border/50 transition-colors",
											isExisting
												? "opacity-40 cursor-not-allowed bg-muted/20"
												: isSelected
													? "bg-accent/50"
													: "hover:bg-accent/30",
										)}
									>
										{/* Checkbox */}
										<div
											className={cn(
												"flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
												isExisting
													? "border-muted-foreground/30 bg-muted"
													: isSelected
														? "border-primary bg-primary text-primary-foreground"
														: "border-border",
											)}
										>
											{(isSelected || isExisting) && (
												<Check className="size-3" />
											)}
										</div>

										{/* Image preview */}
										<div className="size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
											{item.image ? (
												<img
													src={item.image}
													alt={item.name}
													className="size-full object-cover"
												/>
											) : (
												<div className="flex size-full items-center justify-center">
													<Package className="size-4 text-muted-foreground/40" />
												</div>
											)}
										</div>

										{/* Item details */}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="font-medium text-sm truncate">
													{item.name}
												</span>
												{isExisting && (
													<Badge
														variant="secondary"
														className="text-[10px] px-1.5 py-0"
													>
														Already added
													</Badge>
												)}
											</div>
											<div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
												<span className="font-mono">{item.sku}</span>
												{item.category && (
													<Badge
														variant="outline"
														className="text-[10px] px-1.5 py-0"
													>
														{item.category.name}
													</Badge>
												)}
											</div>
										</div>

										{/* Price */}
										<div className="text-right shrink-0">
											<div className="text-sm font-medium">
												{price.toFixed(3)}
											</div>
											<div className="text-[10px] text-muted-foreground">
												purchase price
											</div>
										</div>

										{/* Stock */}
										<div className="text-right shrink-0 w-16">
											<div
												className={cn(
													"text-sm font-medium",
													item.isLowStock && "text-destructive",
												)}
											>
												{stock}
											</div>
											<div className="text-[10px] text-muted-foreground">
												in stock
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Footer */}
				<DialogFooter className="px-6 py-4 border-t">
					<div className="flex items-center justify-between w-full">
						<span className="text-sm text-muted-foreground">
							{selected.size > 0 ? (
								<>
									{availableCount} item{availableCount !== 1 ? "s" : ""}{" "}
									selected
								</>
							) : (
								"Click items to select them"
							)}
						</span>
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={handleAdd}
								disabled={availableCount === 0}
							>
								Add{" "}
								{availableCount > 0 ? `${availableCount} ` : ""}item
								{availableCount !== 1 ? "s" : ""}
							</Button>
						</div>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
