"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import * as React from "react";
import {
  type FieldArrayWithId,
  type SubmitHandler,
  type UseFormReturn,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import type { POLineData } from "@/components/dialogs/poLineDialog";
import { type POFormValues, poFormSchema } from "@/lib/form/po/poFormSchema";
import { buildPOSubmitPayload } from "@/lib/form/po/poMapper";
import { trpc } from "@/lib/trpc/client";

export interface POFormController {
  mode: "create" | "edit";
  isEdit: boolean;
  form: UseFormReturn<POFormValues>;
  fields: FieldArrayWithId<POFormValues, "lines", "id">[];
  remove: (index: number) => void;
  lines: POFormValues["lines"];
  suppliers: any[];
  warehouses: any[];
  items: any[];
  itemsMap: Record<string, any>;
  itemsLoading: boolean;
  subtotal: number;
  vatTotal: number;
  itemPickerOpen: boolean;
  setItemPickerOpen: (open: boolean) => void;
  supplierPickerOpen: boolean;
  setSupplierPickerOpen: (open: boolean) => void;
  editingLine: { index: number; isNew?: boolean; data: POLineData } | null;
  setEditingLine: (
    line: {
      index: number;
      isNew?: boolean;
      data: POLineData;
    } | null,
  ) => void;
  openLineEditor: (index: number) => void;
  handleAddManualLine: () => void;
  handleLineSave: (index: number, data: POLineData) => void;
  handleItemsSelected: (selected: any[]) => void;
  onSupplierSelected: (supplier: any) => void;
  pendingSupplierId: string | null;
  confirmSupplierChange: () => void;
  cancelSupplierChange: () => void;
  isPending: boolean;
  submitError: string | null;
  clearSubmitError: () => void;
  onSubmit: SubmitHandler<POFormValues>;
}

interface UsePOFormControllerOptions {
  mode: "create" | "edit";
  initialValues: POFormValues;
  document?: { id: string; version?: number } | null;
  onSaved?: (id: string) => void;
  suppliersData?: any[];
  warehousesData?: any[];
}

export function usePOFormController({
  mode,
  initialValues,
  document,
  onSaved,
  suppliersData,
  warehousesData,
}: UsePOFormControllerOptions): POFormController {
  const t = useTranslations();
  const utils = trpc.useUtils();
  const isEdit = mode === "edit";

  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [itemPickerOpen, setItemPickerOpen] = React.useState(false);
  const [supplierPickerOpen, setSupplierPickerOpen] = React.useState(false);
  const [editingLine, setEditingLine] = React.useState<{
    index: number;
    isNew?: boolean;
    data: POLineData;
  } | null>(null);
  const [pendingSupplierId, setPendingSupplierId] = React.useState<
    string | null
  >(null);

  const form = useForm<POFormValues>({
    resolver: zodResolver(poFormSchema) as any,
    defaultValues: initialValues,
  });
  const { setValue, watch, control } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const lines = useWatch({ control, name: "lines" }) ?? [];
  const selectedSupplierId = watch("supplierId");

  const { data: itemsData, isLoading: itemsLoading } = trpc.items.list.useQuery(
    {
      type: "PRODUCT",
      supplierId: selectedSupplierId || undefined,
      withStock: true,
    },
    { enabled: !!selectedSupplierId },
  );

  const subtotal = React.useMemo(
    () =>
      (lines ?? []).reduce(
        (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0),
        0,
      ),
    [lines],
  );

  const vatTotal = React.useMemo(
    () =>
      (lines ?? []).reduce((s, l) => {
        const lineSubtotal =
          (Number(l.quantity) || 0) * (Number(l.unitCost) || 0);
        const rate = Number(l.taxRateSnapshot) || 0;
        return s + lineSubtotal * (rate / 100);
      }, 0),
    [lines],
  );

  React.useEffect(() => {
    if (mode !== "create") return;
    if (watch("warehouseId")) return;
    const defaultWarehouse = (warehousesData ?? []).find(
      (w: any) => w.isDefault,
    );
    if (defaultWarehouse)
      setValue("warehouseId", defaultWarehouse.id, { shouldDirty: true });
  }, [mode, warehousesData, watch, setValue]);

  // Changing supplier invalidates supplier-specific pricing, so the lines are
  // cleared — but only after the user confirms, because clearing is destructive
  // and unrecoverable in edit mode. See onSupplierSelected below.

  const createMutation = trpc.purchaseOrders.create.useMutation({
    onSuccess(data) {
      utils.purchaseOrders.list.invalidate();
      utils.purchaseOrders.byId.invalidate({ id: data.id });
      toast.success(t("purchaseOrders.poCreated"), {
        description: data.serial,
      });
      onSaved?.(data.id);
    },
    onError(err) {
      setSubmitError(err.message);
      toast.error(t("purchaseOrders.failedToCreate"), {
        description: err.message,
      });
    },
  });

  const updateMutation = trpc.purchaseOrders.update.useMutation({
    onSuccess(data) {
      utils.purchaseOrders.list.invalidate();
      utils.purchaseOrders.byId.invalidate({ id: data.id });
      toast.success(t("purchaseOrders.poUpdated"), {
        description: data.serial,
      });
      onSaved?.(data.id);
    },
    onError(err) {
      setSubmitError(err.message);
      toast.error(t("purchaseOrders.failedToUpdate"), {
        description: err.message,
      });
    },
  });

  const isPending =
    form.formState.isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending;

  const onSubmit: SubmitHandler<POFormValues> = (values) => {
    setSubmitError(null);
    const payload = buildPOSubmitPayload(values);

    if (isEdit && document?.id) {
      updateMutation.mutate({
        id: document.id,
        version: document.version ?? 0,
        ...payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const suppliers = suppliersData ?? [];
  const warehouses = warehousesData ?? [];
  const items = itemsData ?? [];

  const itemsMap = React.useMemo(
    () => Object.fromEntries(items.map((i: any) => [i.id, i])),
    [items],
  );

  const handleItemsSelected = (selected: any[]) => {
    for (const item of selected) {
      const supplierItem = item.supplierItems?.[0];
      const tr = item.taxRate as any;
      append({
        mode: "item",
        itemId: item.id,
        itemName: item.name ?? null,
        itemSku: item.sku ?? null,
        itemImage: item.image ?? null,
        quantity: Number(supplierItem?.minOrderQty) || 1,
        unitCost: Number(supplierItem?.basePrice ?? 0) || 0,
        taxRateId: item.taxRate?.id,
        taxRateSnapshot: tr ? Number(tr.rate) : undefined,
        taxRateName: tr?.name || undefined,
      });
    }
    setItemPickerOpen(false);
    if (selected.length === 1) {
      const item = selected[0];
      const tr = item.taxRate as any;
      const supplierItem = item.supplierItems?.[0];
      setEditingLine({
        index: fields.length,
        data: {
          mode: "item",
          itemId: item.id,
          itemName: item.name ?? null,
          itemSku: item.sku ?? null,
          itemImage: item.image ?? null,
          description: null,
          quantity: Number(supplierItem?.minOrderQty) || 1,
          unitCost: Number(supplierItem?.basePrice ?? 0) || 0,
          taxRateId: item.taxRate?.id,
          taxRateSnapshot: tr ? Number(tr.rate) : undefined,
          taxRateName: tr?.name || undefined,
        },
      });
    }
  };

  const handleAddManualLine = () => {
    setEditingLine({
      index: fields.length,
      isNew: true,
      data: {
        mode: "manual",
        itemId: null,
        description: "",
        quantity: 1,
        unitCost: 0,
      },
    });
  };

  const openLineEditor = (index: number) => {
    const line = (lines ?? [])[index] as any;
    setEditingLine({
      index,
      data: {
        mode: line?.mode ?? (line?.itemId ? "item" : "manual"),
        itemId: line?.itemId || null,
        itemName: line?.itemName || null,
        itemSku: line?.itemSku || null,
        itemImage: line?.itemImage || null,
        description: line?.description || null,
        quantity: Number(line?.quantity) || 0,
        unitCost: Number(line?.unitCost) || 0,
        taxRateId: line?.taxRateId || null,
        taxRateSnapshot: line?.taxRateSnapshot ?? null,
        taxRateName: line?.taxRateName || null,
      },
    });
  };

  const handleLineSave = (index: number, data: POLineData) => {
    if (editingLine?.isNew) {
      append(data as any);
    } else {
      setValue(`lines.${index}` as const, data as any, { shouldDirty: true });
    }
    setEditingLine(null);
  };

  const onSupplierSelected = (supplier: any) => {
    if (supplier.id === watch("supplierId")) return;
    if ((lines ?? []).length > 0) {
      setPendingSupplierId(supplier.id);
      return;
    }
    setValue("supplierId", supplier.id, { shouldDirty: true });
  };

  const confirmSupplierChange = () => {
    if (pendingSupplierId) {
      setValue("supplierId", pendingSupplierId, { shouldDirty: true });
      setValue("lines", [], { shouldDirty: true });
    }
    setPendingSupplierId(null);
  };

  const cancelSupplierChange = () => setPendingSupplierId(null);

  return {
    mode,
    isEdit,
    form,
    fields,
    remove,
    lines,
    suppliers,
    warehouses,
    items,
    itemsMap,
    itemsLoading,
    subtotal,
    vatTotal,
    itemPickerOpen,
    setItemPickerOpen,
    supplierPickerOpen,
    setSupplierPickerOpen,
    editingLine,
    setEditingLine,
    openLineEditor,
    handleAddManualLine,
    handleLineSave,
    handleItemsSelected,
    onSupplierSelected,
    pendingSupplierId,
    confirmSupplierChange,
    cancelSupplierChange,
    isPending,
    submitError,
    clearSubmitError: () => setSubmitError(null),
    onSubmit,
  };
}
