"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
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

	if (isLoading) {
		return (
			<div
				className={cn(
					"flex flex-col items-center justify-center p-6",
					className,
				)}
			>
				<Spinner className="size-6 text-muted-foreground" />
			</div>
		);
	}

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
			<div className="flex-1 overflow-y-auto">
				{filteredData.length === 0 ? (
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
					<div className="flex flex-col">
						{filteredData.map((item, index) => (
							<div key={item.id ?? index} style={{ minHeight: rowHeight }}>
								{cardRenderer(item)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
