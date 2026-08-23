"use client";

import { Eye, ShieldAlert, User2, Warehouse } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { ContextMenuItemSchema } from "@/components/context-menu";
import { UniversalContextMenu } from "@/components/context-menu";
import { useWarehouseForm } from "@/components/dialogs";
import { useHardDeleteForm } from "@/components/dialogs/hardDeleteForm";
import { Header } from "@/components/layout/App-Header";
import { ListView } from "@/components/list-view";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { WarehouseListItem } from "@/components/warehouses/warehouse-list-item";
import { useIsMobile } from "@/hooks/use-mobile";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const warehousesSegment = "warehouses";

export default function WarehousesLayout({
	children,
}: {
	children?: React.ReactNode;
}) {
	const t = useTranslations();
	const { openCreate } = useWarehouseForm();
	const { openDialog: openHardDelete } = useHardDeleteForm();
	const { data: me } = trpc.auth.me.useQuery();
	const isSuperAdmin = me?.platformRole === "SUPER_ADMIN";
	const router = useRouter();
	const { data, isPending } = trpc.warehouses.list.useQuery({});
	const isMobile = useIsMobile();
	const pathname = usePathname();
	const activeItem = pathname.split("/")[3];
	const isListView = pathname === `/erp/${warehousesSegment}`;

	const renderCard = useCallback(
		(item: any) => {
			const menuItems: ContextMenuItemSchema[] = [
				{
					id: "view",
					label: t("common.viewDetails"),
					icon: Eye,
					onClick: () => router.push(`/erp/${warehousesSegment}/${item.id}`),
				},
				...(isSuperAdmin
					? [
							{ id: "sep1", type: "separator" as const },
							{
								id: "hardDelete",
								label: t("hardDelete.menu"),
								icon: ShieldAlert,
								destructive: true,
								onClick: () =>
									openHardDelete({
										kind: "warehouse",
										id: item.id,
										title: item.name,
									}),
							},
						]
					: []),
			];

			return (
				<UniversalContextMenu items={menuItems}>
					<Link
						href={`/erp/${warehousesSegment}/${item.id}`}
						scroll={false}
						draggable={false}
						className="block w-full h-full"
					>
						<WarehouseListItem
							data={item}
							className={cn(
								"hover:bg-muted/40 border border-transparent",
								activeItem === item.id
									? "border-primary border bg-primary/10"
									: "",
							)}
						/>
					</Link>
				</UniversalContextMenu>
			);
		},
		[activeItem, router, t, isSuperAdmin, openHardDelete],
	);

	const warehouses = data ?? [];

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<Header
				title={t("warehouses.title")}
				icon={<Warehouse className="size-5" />}
				onCreate={() => openCreate()}
				createLabel={t("warehouses.createWarehouse")}
			/>
			<div className="flex-1 min-h-0 w-full">
				<ResizablePanelGroup className="h-full">
					{(isListView || !isMobile) && (
						<ResizablePanel
							minSize={20}
							defaultSize={30}
							className={cn(
								"h-full",
								!isListView ? "hidden md:block" : "block",
							)}
						>
							<aside className="flex h-full flex-col overflow-hidden border-r">
								<div className="flex-1 overflow-y-auto">
									<ListView
										data={warehouses}
										isLoading={isPending}
										className="h-full"
										search={{ fields: ["name", "code"] }}
										rowHeight={73}
										emptyTitle={t("warehouses.noWarehouses")}
										emptyDescription={t("warehouses.createWarehouse")}
										emptyIcon={
											<User2 className="size-20 text-muted-foreground" />
										}
										cardRenderer={renderCard}
									/>
								</div>
							</aside>
						</ResizablePanel>
					)}

					<ResizableHandle
						className={cn("hidden md:flex", !isListView && "hidden md:flex")}
					/>

					{(!isListView || !isMobile) && (
						<ResizablePanel
							defaultSize={70}
							className={cn(
								"h-full w-full",
								isListView ? "hidden md:block" : "flex flex-col",
							)}
						>
							{children}
						</ResizablePanel>
					)}
				</ResizablePanelGroup>
			</div>
		</div>
	);
}
