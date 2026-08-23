"use client";

import { Edit, Eye, ShieldAlert, Trash2, Truck, User2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";
import { alert } from "@/components/Alert-dialog";
import type { ContextMenuItemSchema } from "@/components/context-menu";
import { UniversalContextMenu } from "@/components/context-menu";
import { useSupplierForm } from "@/components/dialogs";
import { useHardDeleteForm } from "@/components/dialogs/hardDeleteForm";
import { Header } from "@/components/layout/App-Header";
import { ListView } from "@/components/list-view";
import { SupplierListItem } from "@/components/suppliers/supplier-list-item";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const title = "Suppliers";

export default function SuppliersLayout({
	children,
}: {
	children?: React.ReactNode;
}) {
	const t = useTranslations();
	const { openCreate, openEdit } = useSupplierForm();
	const { openDialog: openHardDelete } = useHardDeleteForm();
	const { data: me } = trpc.auth.me.useQuery();
	const isSuperAdmin = me?.platformRole === "SUPER_ADMIN";
	const utils = trpc.useUtils();
	const router = useRouter();
	const { data, isPending } = trpc.suppliers.list.useQuery({});
	const isMobile = useIsMobile();
	const pathname = usePathname();
	const activeItem = pathname.split("/")[3];

	const deleteMutation = trpc.suppliers.delete.useMutation({
		onSuccess: () => {
			utils.suppliers.list.invalidate();
			toast.success(t("suppliers.supplierDeleted"));
			if (activeItem) router.push("/erp/suppliers");
		},
		onError: (e) => toast.error(e.message),
	});
	const isListView = pathname === `/erp/${title.toLowerCase()}`;

	const renderCard = useCallback(
		(item: any) => {
			const handleDelete = () => {
				alert.delete({
					title: t("common.confirmDelete"),
					description: t("common.thisActionCannotBeUndone"),
					confirmText: t("common.delete"),
					onConfirm: async () => {
						await deleteMutation.mutateAsync({ id: item.id });
					},
				});
			};

			const menuItems: ContextMenuItemSchema[] = [
				{
					id: "view",
					label: t("common.viewDetails"),
					icon: Eye,
					onClick: () => router.push(`/erp/suppliers/${item.id}`),
				},
				{
					id: "edit",
					label: t("common.edit"),
					icon: Edit,
					onClick: () =>
						openEdit(
							{
								id: item.id,
								name: item.name,
								code: item.code,
								phone: item.phone,
								email: item.email,
								contactName: item.contactName,
								website: item.website,
								taxId: item.taxId,
								crNumber: item.crNumber,
								notes: item.notes,
								paymentTermsDays: item.paymentTermsDays,
							},
							{
								onSuccess: () =>
									utils.suppliers.byId.invalidate({ id: item.id }),
							},
						),
				},
				{ id: "sep1", type: "separator" as const },
				{
					id: "delete",
					label: t("common.delete"),
					icon: Trash2,
					onClick: handleDelete,
					disabled: deleteMutation.isPending,
				},
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
										kind: "supplier",
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
						href={`/erp/${title.toLowerCase()}/${item.id}`}
						scroll={false}
						draggable={false}
						className="block w-full h-full"
					>
						<SupplierListItem
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
			deleteMutation,
			openEdit,
			router,
			utils,
			isSuperAdmin,
			openHardDelete,
			t,
		],
	);

	const suppliers = data ?? [];

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<Header
				title={t("layout.suppliers")}
				icon={<Truck className="size-5" />}
				onCreate={() => openCreate()}
				createLabel={t("suppliers.createSupplier")}
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
										data={suppliers}
										isLoading={isPending}
										className="h-full"
										search={{ fields: ["name", "email", "phone", "code"] }}
										rowHeight={73}
										emptyTitle={t("suppliers.noSuppliers")}
										emptyDescription={t("suppliers.createSupplier")}
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
