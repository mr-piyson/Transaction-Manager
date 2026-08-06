"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface ListViewProps<T> {
	data: T[];
	isLoading?: boolean;
	className?: string;
	useTheme?: boolean;
	searchFields?: (keyof T | string)[];
	rowHeight?: number;
	emptyTitle?: string;
	emptyDescription?: string;
	emptyIcon?: React.ReactNode;
	cardRenderer: (item: T) => React.ReactNode;
	searchPlaceholder?: string;
}

function getNestedValue(obj: any, path: string): any {
	return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

export function ListView<T extends Record<string, any>>({
	data,
	isLoading = false,
	className,
	searchFields = [],
	rowHeight = 72,
	emptyTitle = "No items found",
	emptyDescription,
	emptyIcon,
	cardRenderer,
	searchPlaceholder = "Search...",
}: ListViewProps<T>) {
	const [search, setSearch] = useState("");
	const [scrollReady, setScrollReady] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	const setScrollRef = useCallback((node: HTMLDivElement | null) => {
		scrollRef.current = node;
		if (node) {
			setScrollReady(true);
		}
	}, []);

	const filteredData = useMemo(() => {
		if (!search.trim()) return data;

		const query = search.toLowerCase();
		return data.filter((item) =>
			searchFields.some((field) => {
				const value = getNestedValue(item, field as string);
				return value != null && String(value).toLowerCase().includes(query);
			}),
		);
	}, [data, search, searchFields]);

	const virtualizer = useVirtualizer({
		count: filteredData.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => rowHeight,
		overscan: 5,
	});

	useEffect(() => {
		if (scrollReady && filteredData.length > 0) {
			virtualizer.scrollToIndex(0);
		}
	}, [scrollReady, filteredData.length, virtualizer]);

	return (
		<div className={cn("flex flex-col", className)}>
			<div className="p-2">
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={searchPlaceholder}
						className="h-8 pl-8 text-sm"
					/>
				</div>
			</div>
			<div ref={setScrollRef} className="flex-1 overflow-y-auto">
				{isLoading ? (
					<div className="flex items-center justify-center p-6">
						<Spinner className="size-6 text-muted-foreground" />
					</div>
				) : filteredData.length === 0 ? (
					<Empty className="p-6">
						{emptyIcon && <>{emptyIcon}</>}
						<EmptyContent>
							<EmptyTitle>{emptyTitle}</EmptyTitle>
							{emptyDescription && (
								<EmptyDescription>{emptyDescription}</EmptyDescription>
							)}
						</EmptyContent>
					</Empty>
				) : (
					<div
						style={{
							height: `${virtualizer.getTotalSize()}px`,
							position: "relative",
							width: "100%",
						}}
					>
						{virtualizer.getVirtualItems().map((virtualRow) => {
							const item = filteredData[virtualRow.index];
							return (
								<div
									key={item.id ?? virtualRow.index}
									data-index={virtualRow.index}
									ref={virtualizer.measureElement}
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										width: "100%",
										transform: `translateY(${virtualRow.start}px)`,
									}}
								>
									{cardRenderer(item)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
