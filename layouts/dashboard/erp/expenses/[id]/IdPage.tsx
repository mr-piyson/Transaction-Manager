"use client";

import {
	ArrowLeft,
	Calendar,
	CreditCard,
	FileText,
	Landmark,
	MoreHorizontal,
	Pencil,
	ShieldAlert,
	Tag,
	Trash,
	Wallet,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { alert } from "@/components/Alert-dialog";
import { useExpenseForm, useHardDeleteForm } from "@/components/dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useCurrency } from "@/hooks/use-currency";
import { useDateFormat } from "@/hooks/use-date-format";
import { trpc } from "@/lib/trpc/client";

const JE_STATUS_COLORS: Record<string, string> = {
	DRAFT: "bg-muted text-muted-foreground",
	POSTED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
	VOID: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function ExpenseDetailPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const utils = trpc.useUtils();
	const { openEdit } = useExpenseForm();
	const { openDialog: openHardDelete } = useHardDeleteForm();
	const { data: me } = trpc.auth.me.useQuery();
	const isSuperAdmin = me?.platformRole === "SUPER_ADMIN";
	const t = useTranslations();
	const { formatDate, formatDateTime } = useDateFormat();
	const { format } = useCurrency();

	const {
		data: expense,
		isLoading,
		isError,
		error,
		refetch,
	} = trpc.expenses.byId.useQuery({ id: params.id }, { enabled: !!params.id });

	const deleteMutation = trpc.expenses.delete.useMutation({
		onSuccess: () => {
			utils.expenses.list.invalidate();
			toast.success(t("expenses.expenseDeleted"));
			router.push("/erp/expenses");
		},
		onError: (e) => toast.error(e.message),
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-[60vh]">
				<Spinner className="size-8 text-primary" />
			</div>
		);
	}

	if (isError || !expense) {
		return (
			<div className="flex items-center justify-center h-[60vh]">
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Wallet className="size-6" />
						</EmptyMedia>
						<EmptyTitle>
							{isError ? t("common.failedToLoad") : t("common.notFound")}
						</EmptyTitle>
						<EmptyDescription>
							{error?.message ?? t("expenses.doesNotExist")}
						</EmptyDescription>
					</EmptyHeader>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => router.push("/erp/expenses")}
						>
							<ArrowLeft className="size-4 mr-1" /> {t("common.back")}
						</Button>
						{isError && (
							<Button onClick={() => refetch()}>{t("common.retry")}</Button>
						)}
					</div>
				</Empty>
			</div>
		);
	}

	const handleEdit = () => {
		openEdit(
			{
				id: expense.id,
				description: expense.description,
				amount: Number(expense.amount),
				method: expense.method,
				date: expense.date,
				reference: expense.reference ?? undefined,
				notes: expense.notes ?? undefined,
				categoryId: expense.categoryId,
				purchaseOrderId: expense.purchaseOrderId,
			},
			{ onSuccess: () => utils.expenses.byId.invalidate({ id: expense.id }) },
		);
	};

	const po = expense.purchaseOrder;

	const handleDelete = () => {
		alert.delete({
			title: t("common.confirmDelete"),
			description: expense.description,
			confirmText: t("common.delete"),
			onConfirm: async () => {
				await deleteMutation.mutateAsync({ id: expense.id });
			},
		});
	};

	const handleHardDelete = () => {
		openHardDelete(
			{ kind: "expense", id: expense.id, title: expense.description },
			{ onSuccess: () => router.push("/erp/expenses") },
		);
	};

	return (
		<div className="flex flex-col h-screen">
			<header className="flex h-14 items-center gap-2 px-2 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.push("/erp/expenses")}
				>
					<ArrowLeft className="size-5" />
				</Button>
				<span className="text-muted-foreground">|</span>
				<div className="flex items-center gap-2 flex-1 min-w-0">
					<Wallet className="size-5 text-muted-foreground shrink-0" />
					<h1 className="text-xl font-semibold truncate">
						{expense.description}
					</h1>
					{expense.category && (
						<Badge variant="secondary">{expense.category.name}</Badge>
					)}
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={handleEdit}>
						<Pencil className="size-4" />
						{t("common.edit")}
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<MoreHorizontal className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem variant="destructive" onClick={handleDelete}>
								<Trash className="size-4" />
								{t("common.delete")}
							</DropdownMenuItem>
							{isSuperAdmin && (
								<DropdownMenuItem
									variant="destructive"
									onClick={handleHardDelete}
								>
									<ShieldAlert className="size-4" />
									{t("hardDelete.menu")}
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>

			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
					<Card>
						<CardHeader className="pb-1.5">
							<CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
								<Wallet className="size-3.5" />
								{t("expenses.amount")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-semibold text-lg">
								{format(Number(expense.amount))}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-1.5">
							<CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
								<Calendar className="size-3.5" />
								{t("expenses.date")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-semibold">{formatDate(expense.date)}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-1.5">
							<CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
								<CreditCard className="size-3.5" />
								{t("expenses.method")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-semibold">{expense.method}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-1.5">
							<CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
								<Tag className="size-3.5" />
								{t("expenses.category")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-semibold">{expense.category?.name ?? "—"}</p>
						</CardContent>
					</Card>
				</div>

				{po && (
					<Card>
						<CardContent className="p-4 flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground">
									{t("expenses.linkedPurchaseOrder")}
								</p>
								<p className="font-semibold">{po.serial}</p>
								{po.supplier && (
									<p className="text-xs text-muted-foreground">
										{t("expenses.supplier")}: {po.supplier.name}
									</p>
								)}
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => router.push(`/erp/purchase-orders/${po.id}`)}
							>
								<FileText className="size-4" />
								{t("expenses.viewPurchaseOrder")}
							</Button>
						</CardContent>
					</Card>
				)}

				{expense.journalEntry && (
					<Card>
						<CardHeader className="pb-1.5">
							<CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-2">
								<Landmark className="size-4" /> {t("expenses.journalEntry")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-2 flex-wrap">
								<Badge
									variant="outline"
									className={
										JE_STATUS_COLORS[expense.journalEntry.status] ?? ""
									}
								>
									{expense.journalEntry.status}
								</Badge>
								<span className="text-sm font-medium">
									{expense.journalEntry.entryNumber}
								</span>
								<span className="text-sm text-muted-foreground">
									{t("expenses.postedOn", {
										date: formatDate(expense.journalEntry.date),
									})}
								</span>
								{expense.journalEntry.postedAt && (
									<span className="text-sm text-muted-foreground">
										{t("expenses.postedAt", {
											date: formatDateTime(expense.journalEntry.postedAt),
										})}
									</span>
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{expense.notes && (
					<Card>
						<CardHeader className="pb-1.5">
							<CardTitle className="text-xs text-muted-foreground font-medium">
								{t("common.notes")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm whitespace-pre-wrap">{expense.notes}</p>
						</CardContent>
					</Card>
				)}

				<Separator />

				<div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pb-2">
					{expense.reference && (
						<span>
							{t("expenses.reference")}: {expense.reference}
						</span>
					)}
					{expense.department && (
						<span>
							{t("expenses.department")}: {expense.department.name}
						</span>
					)}
					{expense.item && (
						<span>
							{t("expenses.item")}: {expense.item.name}
						</span>
					)}
					<span>
						{t("expenses.metaCreated", {
							name: expense.createdBy?.name ?? "—",
							date: expense.createdAt ? formatDateTime(expense.createdAt) : "—",
						})}
					</span>
				</div>
			</div>
		</div>
	);
}
