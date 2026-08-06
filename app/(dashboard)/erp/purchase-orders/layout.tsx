"use client";

import {
	Edit,
	Eye,
	MoreHorizontal,
	Plus,
	ShieldAlert,
	ShoppingCart,
	Trash2,
	User2,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";
import { alert } from "@/components/Alert-dialog";
import type { ContextMenuItemSchema } from "@/components/context-menu";
import { UniversalContextMenu } from "@/components/context-menu";
import { usePOForm } from "@/components/dialogs";
import { useHardDeleteForm } from "@/components/dialogs/hardDeleteForm";
import { Header } from "@/components/layout/App-Header";
import { ListView } from "@/components/list-view";
import { POListItem } from "@/components/purchase-orders/po-list-item";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useAppAbility } from "@/hooks/use-app-ability";
import { useIsMobile } from "@/hooks/use-mobile";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const route = "purchase-orders";

export default function POLayout({ children }: { children?: React.ReactNode }) {
	const t = useTranslations();
	const { openCreate, openEdit } = usePOForm();
	const { openDialog: openHardDelete } = useHardDeleteForm();
	const { data: me } = trpc.auth.me.useQuery();
	const isSuperAdmin = me?.platformRole === "SUPER_ADMIN";
	const utils = trpc.useUtils();
	const router = useRouter();
	const { data, isPending } = trpc.purchaseOrders.list.useQuery({});
	const isMobile = useIsMobile();
	const ability = useAppAbility();
	const pathname = usePathname();
	const activeItem = pathname.split("/")[3];
	const isListView = pathname === `/erp/${route}`;

	const deleteMutation = trpc.purchaseOrders.delete.useMutation({
		onSuccess: () => {
			utils.purchaseOrders.list.invalidate();
			toast.success(t("purchaseOrders.poDeleted"));
			if (activeItem) router.push("/erp/purchase-orders");
		},
		onError: (e) => toast.error(e.message),
	});

	const cancelMutation = trpc.purchaseOrders.cancel.useMutation({
		onSuccess: () => {
			utils.purchaseOrders.list.invalidate();
			toast.success(t("purchaseOrders.poCancelled"));
			if (activeItem) router.push("/erp/purchase-orders");
		},
		onError: (e) => toast.error(e.message),
	});

	const renderCard = useCallback(
		(item: any) => {
			const isEditable = ["DRAFT", "PENDING_APPROVAL"].includes(item.status);
			const isDeletable = item.status === "DRAFT";
			const isCancellable = ![
				"CANCELLED",
				"CLOSED",
				"RECEIVED",
				"INVOICED",
			].includes(item.status);

			const canEdit = ability?.can("po:update", "PurchaseOrder");
			const canDelete = ability?.can("po:delete", "PurchaseOrder");

			const menuItems: ContextMenuItemSchema[] = [
				{
					id: "view",
					label: t("common.viewDetails"),
					icon: Eye,
					onClick: () => router.push(`/erp/${route}/${item.id}`),
				},
				...(canEdit
					? [
							{
								id: "edit",
								label: t("common.edit"),
								icon: Edit,
								onClick: () =>
									openEdit(
										{ id: item.id, version: item.version },
										{
											onSuccess: () =>
												utils.purchaseOrders.byId.invalidate({ id: item.id }),
										},
									),
								disabled: !isEditable,
							},
						]
					: []),
				...(isCancellable && canDelete
					? [
							{
								id: "cancel",
								label: t("common.cancel"),
								icon: XCircle,
								onClick: () =>
									alert.delete({
										title: t("common.cancel"),
										description: t("common.thisActionCannotBeUndone"),
										confirmText: t("common.cancel"),
										onConfirm: async () => {
											await cancelMutation.mutateAsync({
												id: item.id,
												version: item.version,
											});
										},
									}),
							} as ContextMenuItemSchema,
						]
					: []),
				...(canDelete ? [{ id: "sep1", type: "separator" as const }] : []),
				...(canDelete
					? [
							{
								id: "delete",
								label: t("common.delete"),
								icon: Trash2,
								onClick: () =>
									alert.delete({
										title: t("common.delete"),
										description: t("common.thisActionCannotBeUndone"),
										confirmText: t("common.delete"),
										onConfirm: async () => {
											await deleteMutation.mutateAsync({ id: item.id });
										},
									}),
								disabled: !isDeletable,
							},
						]
					: []),
				...(isSuperAdmin
					? [
							{ id: "sep2", type: "separator" as const },
							{
								id: "hardDelete",
								label: t("hardDelete.menu"),
								icon: ShieldAlert,
								destructive: true,
								onClick: () =>
									openHardDelete({
										kind: "po",
										id: item.id,
										title: item.serial,
									}),
							},
						]
					: []),
			];

			return (
				<UniversalContextMenu items={menuItems}>
					<Link
						href={`/erp/${route}/${item.id}`}
						scroll={false}
						draggable={false}
						className="block w-full h-full"
					>
						<POListItem
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
		[
			activeItem,
			ability,
			cancelMutation,
			deleteMutation,
			openEdit,
			router,
			utils,
			isSuperAdmin,
			openHardDelete,
			t,
		],
	);

	const orders = (Array.isArray(data) ? data : (data?.data ?? [])).sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<Header
				title={t("layout.purchaseOrders")}
				icon={<ShoppingCart className="size-5" />}
			/>
			<div className="flex flex-row items-center justify-between border-b px-4 py-2 shrink-0">
				<div className="flex gap-2 items-center">
					<Button size="sm" onClick={() => openCreate()}>
						<Plus className="size-3.5" />
						<span className="hidden md:block">
							{t("purchaseOrders.createPO")}
						</span>
					</Button>
				</div>
				<div className="flex gap-2 items-center md:hidden">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm">
								<MoreHorizontal className="size-3.5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => openCreate()}>
								<Plus className="size-3.5" />
								{t("purchaseOrders.createPO")}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
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
										data={orders}
										isLoading={isPending}
										className="h-full"
										useTheme
										searchFields={["serial", "supplier.name", "status"]}
										searchFieldLabels={{
											serial: t("purchaseOrders.poNumber"),
											"supplier.name": t("purchaseOrders.supplier"),
											status: t("purchaseOrders.status"),
										}}
										rowHeight={73}
										emptyTitle={t("purchaseOrders.noPOs")}
										emptyDescription={t("purchaseOrders.createPO")}
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
