"use client";

import {
	ArrowDownIcon,
	ArrowUpIcon,
	type LucideIcon,
	Search,
	Undo2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { RouteConfig } from "@/components/layout/App-Sidebar";
import { Button } from "@/components/ui/button";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { usePaletteActions } from "@/lib/actions";
import { apps } from "@/lib/apps";

interface FlatItem {
	id: string;
	label: string;
	href?: string;
	onSelect?: () => void | Promise<void>;
	icon?: LucideIcon;
	category: string;
	keywords: string[];
}

function flattenRoutes(
	routes: RouteConfig[],
	category: string,
	appSlug: string,
): FlatItem[] {
	const items: FlatItem[] = [];
	for (const route of routes) {
		if (route.type === "item" && route.href && !route.search?.hidden) {
			items.push({
				id: `${appSlug}:${route.href}`,
				label: route.label,
				href: route.href,
				icon: route.icon,
				category,
				keywords: route.search?.keywords ?? [],
			});
		}
		if (route.type === "group" && route.children) {
			items.push(...flattenRoutes(route.children, route.label, appSlug));
		}
	}
	return items;
}

export function CommandPaletteTrigger() {
	const t = useTranslations();
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				className="gap-2 text-muted-foreground w-full max-w-56 justify-between hidden lg:flex"
				onClick={() => setOpen(true)}
			>
				<span className="flex items-center gap-2">
					<Search className="size-3.5" />
					<span className="text-xs">{t("common.search") ?? "Search"}</span>
				</span>
				<Kbd className="text-[10px] h-5 px-1">
					<span className="text-xs">⌘</span>K
				</Kbd>
			</Button>
			<button
				className="lg:hidden p-2 text-muted-foreground transition-colors"
				onClick={() => setOpen(true)}
				aria-label="Open command palette"
			>
				<Search className="size-4" />
			</button>
			<CommandPalette open={open} onOpenChange={setOpen} />
		</>
	);
}

function CommandPalette({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const t = useTranslations();
	const router = useRouter();
	const paletteActions = usePaletteActions(t as (key: string) => string);

	const allItems: { label: string; items: FlatItem[] }[] = [];

	const tCast = t as (key: string) => string;

	for (const app of apps.filter((a) => a.isActive)) {
		const routes = app.getRoutes(tCast);
		const appName = tCast(app.nameKey);
		const items = flattenRoutes(routes, appName, app.slug);
		if (items.length > 0) {
			allItems.push({ label: appName, items });
		}
	}

	for (const group of paletteActions) {
		const items: FlatItem[] = group.items.map((action) => ({
			id: action.id,
			label: action.label,
			href: action.href,
			onSelect: action.onSelect,
			icon: action.icon,
			category: group.label,
			keywords: action.keywords ?? [],
		}));
		if (items.length > 0) {
			allItems.push({ label: group.label, items });
		}
	}

	const handleSelect = useCallback(
		(item: FlatItem) => {
			onOpenChange(false);
			if (item.onSelect) {
				item.onSelect();
			} else if (item.href) {
				router.push(item.href);
			}
		},
		[router, onOpenChange],
	);

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandInput
				placeholder={t("common.search") ?? "Type a command or search..."}
			/>
			<CommandList>
				<CommandEmpty>
					{t("common.noResults") ?? "No results found."}
				</CommandEmpty>
				{allItems.map((group, idx) => (
					<span key={group.label}>
						{idx > 0 && <CommandSeparator />}
						<CommandGroup heading={group.label}>
							{group.items.map((item) => {
								const Icon = item.icon;
								return (
									<CommandItem
										key={item.id}
										value={`${item.label} ${item.keywords.join(" ")}`}
										onSelect={() => handleSelect(item)}
									>
										{Icon && <Icon />}
										<span>{item.label}</span>
									</CommandItem>
								);
							})}
						</CommandGroup>
					</span>
				))}
			</CommandList>
			<CommandSeparator />
			<div className="text-muted-foreground flex flex-wrap items-center gap-4 p-4">
				<div className="flex flex-1 items-center gap-2">
					<kbd className="rounded border px-1 text-sm">esc</kbd>
					<span>To close</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex size-5 items-center justify-center rounded border">
						<Undo2Icon className="size-4" />
					</div>
					<span>To Select</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex size-5 items-center justify-center rounded border">
						<ArrowUpIcon className="size-4" />
					</div>
					<div className="flex size-5 items-center justify-center rounded border">
						<ArrowDownIcon className="size-4" />
					</div>
					<span>To Navigate</span>
				</div>
			</div>
		</CommandDialog>
	);
}
