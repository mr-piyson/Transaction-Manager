"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Package, Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { type SubmitHandler, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DateInputField } from "@/components/ui/date-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/hooks/use-currency";
import { toDateInputValue } from "@/lib/date";
import { trpc } from "@/lib/trpc/client";
import { CURRENCIES } from "@/lib/utils";
import { currencyCodeSchema } from "@/lib/validations";
import { POItemSelectDialog } from "./poItemSelectDialog";
import { SupplierSelectDialog } from "./supplierSelectDialog";

const lineSchema = z.object({
	itemId: z.string().min(1, "Item is required"),
	description: z.string().optional(),
	quantity: z.coerce.number().positive("Qty must be > 0"),
	unitCost: z.coerce.number().min(0, "Unit cost must be >= 0"),
});

const schema = z.object({
	supplierId: z.string().min(1, "Supplier is required"),
	warehouseId: z.string().min(1, "Warehouse is required"),
	date: z.string().min(1, "Date is required"),
	currency: currencyCodeSchema.default("BHD"),
	notes: z.string().optional(),
	internalNotes: z.string().optional(),
	lines: z.array(lineSchema).min(1, "At least one line is required"),
});

export type POFormValues = z.infer<typeof schema>;

interface ValidationAlertProps {
	errors: Record<string, { message?: string } | undefined>;
}

function ValidationAlert({ errors }: ValidationAlertProps) {
	const messages = Object.values(errors)
		.filter((e) => e?.message)
		.map((e) => e!.message!);
	if (messages.length === 0) return null;
	return (
		<Alert variant="destructive" className="mb-4">
			<TriangleAlert className="h-4 w-4" />
			<AlertTitle>Please fix the following</AlertTitle>
			<AlertDescription>
				<ul className="mt-1 list-disc pl-4 space-y-0.5 text-sm">
					{messages.map((msg) => (
						<li key={msg}>{msg}</li>
					))}
				</ul>
			</AlertDescription>
		</Alert>
	);
}

export interface POFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	po?: { id: string; version?: number } & Partial<POFormValues>;
	onSuccess?: (poId: string) => void;
}

export function POFormDialog({
	open,
	onOpenChange,
	po,
	onSuccess,
}: POFormDialogProps) {
	const isEdit = Boolean(po?.id);
	const utils = trpc.useUtils();
	const router = useRouter();
	const { currency: orgCurrency } = useCurrency();
	const [itemPickerOpen, setItemPickerOpen] = React.useState(false);
	const [supplierPickerOpen, setSupplierPickerOpen] = React.useState(false);

	const { data: suppliersData } = trpc.suppliers.list.useQuery({ limit: 200 });
	const { data: warehousesData } = trpc.warehouses.list.useQuery({
		limit: 200,
	});

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		watch,
		control,
		formState: { errors, isSubmitting },
	} = useForm<POFormValues>({
		resolver: zodResolver(schema) as any,
		defaultValues: defaults(po, warehousesData, orgCurrency),
	});

	const selectedSupplierId = watch("supplierId");

	const { data: itemsData, isLoading: itemsLoading } = trpc.items.list.useQuery(
		{
			type: "PRODUCT",
			supplierId: selectedSupplierId || undefined,
			withStock: true,
		},
		{ enabled: !!selectedSupplierId },
	);

	const { fields, append, remove } = useFieldArray({ control, name: "lines" });

	const lines = watch("lines");

	const subtotal = React.useMemo(
		() =>
			(lines ?? []).reduce(
				(s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0),
				0,
			),
		[lines],
	);

	// Auto-select default warehouse when data loads
	React.useEffect(() => {
		if (!watch("warehouseId") && warehousesData) {
			const list = Array.isArray(warehousesData)
				? warehousesData
				: (warehousesData?.data ?? []);
			const def = list.find((w: any) => w.isDefault);
			if (def) setValue("warehouseId", def.id);
		}
	}, [warehousesData, watch, setValue]);

	// Clear line items when supplier changes
	const prevSupplierRef = React.useRef(selectedSupplierId);
	React.useEffect(() => {
		if (
			prevSupplierRef.current &&
			selectedSupplierId !== prevSupplierRef.current
		) {
			setValue("lines", []);
		}
		prevSupplierRef.current = selectedSupplierId;
	}, [selectedSupplierId, setValue]);

	React.useEffect(() => {
		if (open) reset(defaults(po, warehousesData, orgCurrency));
	}, [open, po, warehousesData, orgCurrency, reset]);

	const createMutation = trpc.purchaseOrders.create.useMutation({
		onSuccess(data) {
			utils.purchaseOrders.list.invalidate();
			toast.success("Purchase order created", { description: data.serial });
			onSuccess?.(data.id);
			onOpenChange(false);
			router.push(`/erp/purchase-orders/${data.id}`);
		},
		onError(err) {
			toast.error("Failed to create PO", { description: err.message });
		},
	});

	const updateMutation = trpc.purchaseOrders.update.useMutation({
		onSuccess(data) {
			utils.purchaseOrders.list.invalidate();
			toast.success("Purchase order updated", { description: data.serial });
			onSuccess?.(data.id);
			onOpenChange(false);
		},
		onError(err) {
			toast.error("Failed to update PO", { description: err.message });
		},
	});

	const isPending =
		isSubmitting || createMutation.isPending || updateMutation.isPending;

	const onSubmit: SubmitHandler<POFormValues> = (values) => {
		const payload = {
			...values,
			notes: values.notes || undefined,
			internalNotes: values.internalNotes || undefined,
			date: new Date(values.date),
			lines: values.lines
				.filter((l) => l.itemId)
				.map((l) => ({
					itemId: l.itemId,
					description: l.description || undefined,
					quantity: Number(l.quantity),
					unitCost: Number(l.unitCost),
				})),
		};

		if (isEdit && po?.id) {
			updateMutation.mutate({
				id: po.id,
				version: po.version ?? 0,
				...payload,
			});
		} else {
			createMutation.mutate(payload);
		}
	};

	const suppliers = Array.isArray(suppliersData)
		? suppliersData
		: (suppliersData?.data ?? []);
	const warehouses = Array.isArray(warehousesData)
		? warehousesData
		: (warehousesData?.data ?? []);
	const items = Array.isArray(itemsData) ? itemsData : (itemsData?.data ?? []);

	const itemsMap = React.useMemo(
		() => Object.fromEntries(items.map((i: any) => [i.id, i])),
		[items],
	);

	const handleItemsSelected = (selected: any[]) => {
		for (const item of selected) {
			const supplierItem = item.supplierItems?.[0];
			append({
				itemId: item.id,
				quantity: Number(supplierItem?.minOrderQty) || 1,
				unitCost: Number(supplierItem?.basePrice ?? item.purchasePrice) || 0,
			});
		}
		setItemPickerOpen(false);
	};

	return (
		<>
			<Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
				<DialogContent className="sm:max-w-180 gap-0 p-0 h-[100dvh] sm:h-auto sm:max-h-[85vh] max-w-full sm:rounded-lg flex flex-col">
					<DialogHeader className="shrink-0 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
						<DialogTitle>
							{isEdit ? "Edit purchase order" : "New purchase order"}
						</DialogTitle>
						<DialogDescription>
							{isEdit
								? "Update the details below and save."
								: "Fill in the details to create a new purchase order."}
						</DialogDescription>
					</DialogHeader>

					<form
						onSubmit={handleSubmit(onSubmit)}
						noValidate
						className="flex flex-col flex-1 min-h-0"
					>
						<ValidationAlert errors={errors as any} />

						<div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 space-y-4">
							{/* Order details */}
							<div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
								<div className="sm:col-span-4">
									<Field>
										<Label htmlFor="date">Date *</Label>
										<DateInputField
											control={control}
											name="date"
											rules={{ required: "Date is required" }}
											required
											showTodayButton
										/>
									</Field>
								</div>
								<div className="sm:col-span-2">
									<Field>
										<Label htmlFor="currency">Currency</Label>
										<Select
											value={watch("currency")}
											onValueChange={(v) => setValue("currency", v as any)}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{Object.keys(CURRENCIES).map((c) => (
													<SelectItem key={c} value={c}>
														{c}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
								</div>
								<div className="sm:col-span-3">
									<Field>
										<Label htmlFor="supplierId">Supplier *</Label>
										<Button
											type="button"
											variant="outline"
											className="w-full justify-start text-left font-normal h-9"
											onClick={() => setSupplierPickerOpen(true)}
										>
											{watch("supplierId") ? (
												suppliers.find((s: any) => s.id === watch("supplierId"))
													?.name || "Select supplier"
											) : (
												<span className="text-muted-foreground">
													Select supplier
												</span>
											)}
										</Button>
									</Field>
								</div>
								<div className="sm:col-span-3">
									<Field>
										<Label htmlFor="warehouseId">Warehouse *</Label>
										<Select
											value={watch("warehouseId")}
											onValueChange={(v) => setValue("warehouseId", v)}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select warehouse" />
											</SelectTrigger>
											<SelectContent>
												{warehouses.map((w: any) => (
													<SelectItem key={w.id} value={w.id}>
														{w.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
								</div>
							</div>

							{/* Lines */}
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<Label className="text-base font-semibold">
										Line Items *
									</Label>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setItemPickerOpen(true)}
										disabled={!selectedSupplierId}
										title={
											!selectedSupplierId
												? "Select a supplier first"
												: undefined
										}
									>
										<Package className="h-4 w-4 mr-1" /> Select items
									</Button>
								</div>

								{fields.map((field, index) => {
									const item = itemsMap[field.itemId] as any;
									return (
										<div
											key={field.id}
											className="border rounded-lg p-2.5 sm:p-3 bg-muted/20"
										>
											{/* Mobile: stacked layout */}
											<div className="flex flex-col gap-2 sm:hidden">
												<div className="flex items-center justify-between gap-2">
													<div className="size-8 shrink-0 overflow-hidden rounded-md border bg-muted">
														{item?.image ? (
															<img
																src={item.image}
																alt={item.name}
																className="size-full object-cover"
															/>
														) : (
															<div className="flex size-full items-center justify-center">
																<Package className="size-3.5 text-muted-foreground/40" />
															</div>
														)}
													</div>
													<div className="flex-1 min-w-0">
														<Label className="text-xs">Item</Label>
														<div className="text-sm truncate">
															{item ? (
																<span className="font-medium">
																	{item.sku} — {item.name}
																</span>
															) : (
																<span className="text-muted-foreground italic">
																	Select item
																</span>
															)}
														</div>
													</div>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="size-8 shrink-0"
														onClick={() => remove(index)}
													>
														<Trash2 className="h-4 w-4 text-destructive" />
													</Button>
												</div>
												<div className="grid grid-cols-3 gap-2">
													<div>
														<Label className="text-xs">Qty</Label>
														<Input
															type="number"
															min={0.001}
															step="any"
															{...register(`lines.${index}.quantity` as const)}
														/>
													</div>
													<div>
														<Label className="text-xs">Unit cost</Label>
														<Input
															type="number"
															min={0}
															step="0.001"
															{...register(`lines.${index}.unitCost` as const)}
														/>
													</div>
													<div>
														<Label className="text-xs">Total</Label>
														<div className="h-9 flex items-center text-sm font-medium text-muted-foreground">
															{(
																(Number(watch(`lines.${index}.quantity`)) ||
																	0) *
																(Number(watch(`lines.${index}.unitCost`)) || 0)
															).toFixed(3)}
														</div>
													</div>
												</div>
											</div>

											{/* Desktop: inline layout */}
											<div className="hidden sm:flex items-start gap-2">
												<div className="size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
													{item?.image ? (
														<img
															src={item.image}
															alt={item.name}
															className="size-full object-cover"
														/>
													) : (
														<div className="flex size-full items-center justify-center">
															<Package className="size-4 text-muted-foreground/40" />
														</div>
													)}
												</div>
												<div className="flex-1 grid grid-cols-12 gap-2">
													<div className="col-span-5">
														<Label className="text-xs">Item</Label>
														<div className="h-9 flex items-center text-sm truncate">
															{item ? (
																<span className="font-medium">
																	{item.sku} — {item.name}
																</span>
															) : (
																<span className="text-muted-foreground italic">
																	Select item
																</span>
															)}
														</div>
													</div>
													<div className="col-span-2">
														<Label className="text-xs">Qty</Label>
														<Input
															type="number"
															min={0.001}
															step="any"
															{...register(`lines.${index}.quantity` as const)}
														/>
													</div>
													<div className="col-span-2">
														<Label className="text-xs">Unit cost</Label>
														<Input
															type="number"
															min={0}
															step="0.001"
															{...register(`lines.${index}.unitCost` as const)}
														/>
													</div>
													<div className="col-span-2">
														<Label className="text-xs">Total</Label>
														<div className="h-9 flex items-center text-sm font-medium text-muted-foreground">
															{(
																(Number(watch(`lines.${index}.quantity`)) ||
																	0) *
																(Number(watch(`lines.${index}.unitCost`)) || 0)
															).toFixed(3)}
														</div>
													</div>
													<div className="col-span-1 flex items-end pb-1">
														<Button
															type="button"
															variant="ghost"
															size="icon"
															onClick={() => remove(index)}
														>
															<Trash2 className="h-4 w-4 text-destructive" />
														</Button>
													</div>
												</div>
											</div>
										</div>
									);
								})}

								{fields.length === 0 && (
									<div className="text-sm text-muted-foreground text-center py-8 space-y-2">
										<Package className="h-8 w-8 mx-auto opacity-30" />
										<p>No items yet.</p>
										{!selectedSupplierId ? (
											<p className="text-xs text-muted-foreground/60">
												Select a supplier first to browse available items.
											</p>
										) : (
											<Button
												type="button"
												variant="secondary"
												size="sm"
												onClick={() => setItemPickerOpen(true)}
											>
												Browse product catalogue
											</Button>
										)}
									</div>
								)}
							</div>

							{/* Notes */}
							<Field>
								<Label htmlFor="notes">Notes</Label>
								<Textarea
									id="notes"
									className="resize-none"
									rows={2}
									{...register("notes")}
								/>
							</Field>

							{/* Totals */}
							{fields.length > 0 && (
								<div className="border-t pt-3">
									<div className="flex justify-end">
										<div className="w-full sm:w-64 space-y-1">
											<div className="flex justify-between text-sm">
												<span className="text-muted-foreground">Subtotal</span>
												<span className="font-medium tabular-nums">
													{subtotal.toFixed(3)} {watch("currency")}
												</span>
											</div>
											<div className="flex justify-between text-base font-bold border-t pt-1">
												<span>Total</span>
												<span className="tabular-nums">
													{subtotal.toFixed(3)} {watch("currency")}
												</span>
											</div>
										</div>
									</div>
								</div>
							)}
						</div>

						<DialogFooter className="shrink-0 px-4 py-3 border-t sm:px-6 sm:py-4 flex-col sm:flex-row gap-2 sm:gap-0 sm:mt-6">
							<span className="text-sm text-muted-foreground">
								{isPending ? "Saving..." : ""}
							</span>
							<div className="flex gap-2 sm:ml-auto">
								<Button
									type="button"
									variant="outline"
									onClick={() => onOpenChange(false)}
									disabled={isPending}
									size="sm"
									className="flex-1 sm:flex-none"
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={isPending}
									size="sm"
									className="flex-1 sm:flex-none"
								>
									{isPending && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{isEdit ? "Save changes" : "Create PO"}
								</Button>
							</div>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<POItemSelectDialog
				open={itemPickerOpen}
				onOpenChange={setItemPickerOpen}
				items={items}
				isLoading={itemsLoading}
				existingItemIds={fields.map((f) => f.itemId)}
				onSelect={handleItemsSelected}
			/>

			<SupplierSelectDialog
				open={supplierPickerOpen}
				onOpenChange={setSupplierPickerOpen}
				suppliers={suppliers}
				isLoading={false}
				onSelect={(supplier) => {
					setValue("supplierId", supplier.id);
				}}
			/>
		</>
	);
}

// Provider + Hook

interface OpenOptions {
	onSuccess?: (id: string) => void;
}

interface POFormContextValue {
	openCreate: (options?: OpenOptions) => void;
	openEdit: (
		po: { id: string; version?: number } & Partial<POFormValues>,
		options?: OpenOptions,
	) => void;
}

const POFormContext = React.createContext<POFormContextValue | null>(null);

interface DialogState {
	open: boolean;
	po?: { id: string; version?: number } & Partial<POFormValues>;
	onSuccess?: (id: string) => void;
}

export function POFormProvider({ children }: { children?: React.ReactNode }) {
	const [state, setState] = React.useState<DialogState>({ open: false });

	const openCreate = React.useCallback((options?: OpenOptions) => {
		setState({ open: true, po: undefined, onSuccess: options?.onSuccess });
	}, []);

	const openEdit = React.useCallback(
		(
			po: { id: string; version?: number } & Partial<POFormValues>,
			options?: OpenOptions,
		) => {
			setState({ open: true, po, onSuccess: options?.onSuccess });
		},
		[],
	);

	const handleOpenChange = React.useCallback((open: boolean) => {
		setState((prev) => ({ ...prev, open }));
	}, []);

	return (
		<POFormContext.Provider value={{ openCreate, openEdit }}>
			{children}
			<POFormDialog
				open={state.open}
				onOpenChange={handleOpenChange}
				po={state.po}
				onSuccess={state.onSuccess}
			/>
		</POFormContext.Provider>
	);
}

export function usePOForm(): POFormContextValue {
	const ctx = React.useContext(POFormContext);
	if (!ctx) throw new Error("usePOForm must be used inside <POFormProvider>");
	return ctx;
}

function defaults(
	po?: { id: string; version?: number } & Partial<POFormValues>,
	warehousesData?: any,
	orgCurrency?: string,
): POFormValues {
	const today = toDateInputValue(new Date());
	const list = Array.isArray(warehousesData)
		? warehousesData
		: ((warehousesData as any)?.data ?? []);
	const defaultWarehouse = list.find((w: any) => w.isDefault);
	return {
		supplierId: po?.supplierId ?? "",
		warehouseId: po?.warehouseId ?? defaultWarehouse?.id ?? "",
		date: po?.date ?? today,
		currency: (po?.currency ?? orgCurrency ?? "BHD") as any,
		notes: po?.notes ?? undefined,
		internalNotes: po?.internalNotes ?? undefined,
		lines: po?.lines ?? [],
	};
}
