"use client";

import { Briefcase, Edit, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { alert } from "@/components/Alert-dialog";
import { useJobPositionForm } from "@/components/dialogs";
import { Header } from "@/components/layout/App-Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";

export default function JobPositionsPage() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState("");
	const { openCreate, openEdit } = useJobPositionForm();
	const limit = 25;

	const { data, isLoading, refetch } = trpc.hr.jobPositions.list.useQuery({
		page,
		limit,
		search: search || undefined,
	});

	const deleteMutation = trpc.hr.jobPositions.delete.useMutation({
		onSuccess: () => {
			refetch();
			toast.success("Job position deleted");
		},
		onError: (e) => toast.error(e.message),
	});

	const records = data ?? [];
	const total = (data as any)?.total ?? 0;
	const totalPages = Math.ceil(total / limit);

	const handleDelete = (position: any) => {
		alert.delete({
			title: "Delete Job Position",
			description: `Are you sure you want to delete "${position.name}"?`,
			confirmText: "Delete",
			onConfirm: () => {
				deleteMutation.mutate({ id: position.id });
			},
		});
	};

	return (
		<div className="space-y-6">
			<Header
				title="Job Positions"
				description="Manage job positions and hierarchy"
				actions={[
					{
						label: "Add Position",
						onClick: () => openCreate(),
					},
				]}
			/>

			<div className="flex items-center gap-4">
				<div className="relative max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						placeholder="Search by name or code..."
						className="pl-9"
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
					/>
				</div>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-20">
					<Spinner className="size-8" />
				</div>
			) : records.length === 0 ? (
				<div className="flex items-center justify-center py-20">
					<Empty>
						<EmptyHeader>
							<EmptyMedia>
								<Briefcase className="size-16 text-muted-foreground" />
							</EmptyMedia>
							<EmptyTitle>No job positions</EmptyTitle>
							<EmptyDescription>
								No job positions found for the selected filters.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				</div>
			) : (
				<>
					<Card>
						<CardContent className="p-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Code</TableHead>
										<TableHead>Parent Position</TableHead>
										<TableHead>Employees</TableHead>
										<TableHead className="w-[100px]">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{records.map((record: any) => (
										<TableRow key={record.id}>
											<TableCell className="font-medium">
												{record.name}
											</TableCell>
											<TableCell className="text-sm text-muted-foreground font-mono">
												{record.code || "—"}
											</TableCell>
											<TableCell className="text-sm">
												{record.parent?.name || "—"}
											</TableCell>
											<TableCell className="text-sm">
												<Badge variant="secondary">
													{record._count?.employees ?? 0}
												</Badge>
											</TableCell>
											<TableCell>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="sm">
															Actions
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem onClick={() => openEdit(record)}>
															<Edit className="size-4 mr-2" />
															Edit
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => handleDelete(record)}
														>
															<Trash2 className="size-4 mr-2" />
															Delete
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>

					{totalPages > 1 && (
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<PaginationPrevious
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										className={
											page <= 1 ? "pointer-events-none opacity-50" : ""
										}
									/>
								</PaginationItem>
								<PaginationItem className="text-sm text-muted-foreground">
									Page {page} of {totalPages}
								</PaginationItem>
								<PaginationItem>
									<PaginationNext
										onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
										className={
											page >= totalPages ? "pointer-events-none opacity-50" : ""
										}
									/>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					)}
				</>
			)}
		</div>
	);
}
