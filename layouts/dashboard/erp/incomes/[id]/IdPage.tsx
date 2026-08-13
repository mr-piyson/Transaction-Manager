"use client";

import {
	ArrowLeft,
	Banknote,
	Calendar,
	CreditCard,
	FileText,
	Landmark,
	MoreHorizontal,
	Pencil,
	ShieldAlert,
	Trash,
	User,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { alert } from "@/components/Alert-dialog";
import { useHardDeleteForm, useIncomeForm } from "@/components/dialogs";
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

export default function IncomeDetailPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const utils = trpc.useUtils();
	const { openEdit } = useIncomeForm();
	const { openDialog: openHardDelete } = useHardDeleteForm();
	const { data: me } = trpc.auth.me.useQuery();
	const isSuperAdmin = me?.platformRole === "SUPER_ADMIN";
	const t = useTranslations();
	const { formatDate, formatDateTime } = useDateFormat();
	const { format } = useCurrency();

	const {
		data: income,
		isLoading,
		isError,
		error,
		refetch,
	} = trpc.incomes.byId.useQuery({ id: params.id }, { enabled: !!params.id });

	const deleteMutation = trpc.incomes.delete.useMutation({
		onSuccess: () => {
			utils.incomes.list.invalidate();
			toast.success(t("incomes.incomeDeleted"));
			router.push("/erp/incomes");
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

	if (isError || !income) {
		return (
			<div className="flex items-center justify-center h-[60vh]">
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Banknote className="size-6" />
						</EmptyMedia>
						<EmptyTitle>
							{isError ? t("common.failedToLoad") : t("common.notFound")}
						</EmptyTitle>
						<EmptyDescription>
							{error?.message ?? t("incomes.doesNotExist")}
						</EmptyDescription>
					</EmptyHeader>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={() => router.push("/erp/incomes")}
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
				id: income.id,
				description: income.description,
				amount: Number(income.amount),
				method: income.method,
				date: income.date,
				reference: income.reference ?? undefined,
				notes: income.notes ?? undefined,
				customerId: income.customerId,
				invoiceId: income.invoiceId,
			},
			{ onSuccess: () => utils.incomes.byId.invalidate({ id: income.id }) },
		);
	};

	const handleDelete = () => {
		alert.delete({
			title: t("common.confirmDelete"),
			description: income.description,
			confirmText: t("common.delete"),
			onConfirm: async () => {
				await deleteMutation.mutateAsync({ id: income.id });
			},
		});
	};

	const handleHardDelete = () => {
		openHardDelete(
			{ kind: "income", id: income.id, title: income.description },
			{ onSuccess: () => router.push("/erp/incomes") },
		);
	};

	const inv = income.invoice;

	return (
		<div className="flex flex-col h-screen">
			<header className="flex h-14 items-center gap-2 px-2 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.push("/erp/incomes")}
				>
					<ArrowLeft className="size-5" />
				</Button>
				<span className="text-muted-foreground">|</span>
				<div className="flex items-center gap-2 flex-1 min-w-0">
					<Banknote className="size-5 text-muted-foreground shrink-0" />
					<h1 className="text-xl font-semibold truncate">
						{income.description}
					</h1>
					{income.customer && (
						<Badge variant="secondary">{income.customer.name}</Badge>
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
								<Banknote className="size-3.5" />
								{t("incomes.amount")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-semibold text-lg">
								{format(Number(income.amount))}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-1.5">
							<CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
								<Calendar className="size-3.5" />
								{t("incomes.date")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-semibold">{formatDate(income.date)}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-1.5">
							<CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
								<CreditCard className="size-3.5" />
								{t("incomes.method")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-semibold">{income.method}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-1.5">
							<CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
								<User className="size-3.5" />
								{t("incomes.customer")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-semibold">{income.customer?.name ?? "—"}</p>
						</CardContent>
					</Card>
				</div>

				{inv && (
					<Card>
						<CardContent className="p-4 flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground">
									{t("incomes.linkedInvoice")}
								</p>
								<p className="font-semibold">{inv.serial}</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => router.push(`/erp/documents/invoices/${inv.id}`)}
							>
								<FileText className="size-4" />
								{t("incomes.viewInvoice")}
							</Button>
						</CardContent>
					</Card>
				)}

				{income.journalEntry && (
					<Card>
						<CardHeader className="pb-1.5">
							<CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-2">
								<Landmark className="size-4" /> {t("incomes.journalEntry")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-2 flex-wrap">
								<Badge
									variant="outline"
									className={JE_STATUS_COLORS[income.journalEntry.status] ?? ""}
								>
									{income.journalEntry.status}
								</Badge>
								<span className="text-sm font-medium">
									{income.journalEntry.entryNumber}
								</span>
								<span className="text-sm text-muted-foreground">
									{t("incomes.postedOn", {
										date: formatDate(income.journalEntry.date),
									})}
								</span>
								{income.journalEntry.postedAt && (
									<span className="text-sm text-muted-foreground">
										{t("incomes.postedAt", {
											date: formatDateTime(income.journalEntry.postedAt),
										})}
									</span>
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{income.notes && (
					<Card>
						<CardHeader className="pb-1.5">
							<CardTitle className="text-xs text-muted-foreground font-medium">
								{t("common.notes")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm whitespace-pre-wrap">{income.notes}</p>
						</CardContent>
					</Card>
				)}

				<Separator />

				<div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pb-2">
					{income.reference && (
						<span>
							{t("incomes.reference")}: {income.reference}
						</span>
					)}
					<span>
						{t("incomes.metaCreated", {
							name: income.createdBy?.name ?? "—",
							date: income.createdAt ? formatDateTime(income.createdAt) : "—",
						})}
					</span>
				</div>
			</div>
		</div>
	);
}
