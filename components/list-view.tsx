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
import { useDirection } from "@/components/ui/direction";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface ListViewProps<T> {
	data: T[];
	isLoading?: boolean;
	className?: string;
	useTheme?: boolean;
	searchFields?: (keyof T | string)[];
	searchFieldLabels?: Record<string, string>;
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
	searchFieldLabels = {},
	rowHeight = 72,
	emptyTitle = "No items found",
	emptyDescription,
	emptyIcon,
	cardRenderer,
	searchPlaceholder = "Search...",
}: ListViewProps<T>) {
	const [search, setSearch] = useState("");
	const [searchField, setSearchField] = useState("__all__");
	const [scrollReady, setScrollReady] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const dir = useDirection();
	const isRtl = dir === "rtl";

	const setScrollRef = useCallback((node: HTMLDivElement | null) => {
		scrollRef.current = node;
		if (node) {
			setScrollReady(true);
		}
	}, []);

	const filteredData = useMemo(() => {
		if (!search.trim()) return data;

		const query = search.toLowerCase();
		const fieldsToSearch =
			searchField === "__all__"
				? searchFields
				: [searchField as keyof T | string];

		return data.filter((item) =>
			fieldsToSearch.some((field) => {
				const value = getNestedValue(item, field as string);
				return value != null && String(value).toLowerCase().includes(query);
			}),
		);
	}, [data, search, searchFields, searchField]);

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
			<div className="flex items-center gap-2 p-2">
				{searchFields.length > 1 && (
					<Select value={searchField} onValueChange={setSearchField}>
						<SelectTrigger size="sm" className="h-8 w-auto shrink-0">
							<SelectValue placeholder={isRtl ? "جميع الحقول" : "All fields"} />
						</SelectTrigger>
						<SelectContent align={isRtl ? "end" : "start"}>
							<SelectItem value="__all__">
								{isRtl ? "جميع الحقول" : "All fields"}
							</SelectItem>
							{searchFields.map((field) => (
								<SelectItem key={field as string} value={field as string}>
									{searchFieldLabels[field as string] ?? (field as string)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
				<div className="relative flex-1">
					<Search className={cn(
						"absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
						isRtl ? "right-2.5" : "left-2.5",
					)} />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={searchPlaceholder}
						className={cn("h-8 text-sm", isRtl ? "pr-8" : "pl-8")}
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
