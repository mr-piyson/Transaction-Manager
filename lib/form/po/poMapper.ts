import { toDateInputValue } from "@/lib/date";
import type { POFormValues } from "@/lib/form/po/poFormSchema";

export interface POPoInput {
  supplierId?: string | null;
  warehouseId?: string | null;
  date?: string | Date | number | null;
  currency?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  lines?: Array<{
    itemId?: string | null;
    item?: {
      id?: string;
      sku?: string | null;
      name?: string | null;
      unit?: string | null;
      image?: string | null;
    } | null;
    description?: string | null;
    quantity?: number | string | null;
    unitCost?: number | string | null;
    taxRateId?: string | null;
    taxRateSnapshot?: number | string | null;
    taxRateName?: string | null;
  }>;
}

export function buildPOCreateDefaults(
  warehousesData?: any[],
  orgCurrency?: string,
): POFormValues {
  const list = warehousesData ?? [];
  const defaultWarehouse = list.find((w: any) => w.isDefault);
  return {
    supplierId: "",
    warehouseId: defaultWarehouse?.id ?? "",
    date: toDateInputValue(new Date()),
    currency: (orgCurrency ?? "BHD") as POFormValues["currency"],
    notes: undefined,
    internalNotes: undefined,
    lines: [],
  };
}

export function poToFormValues(po: POPoInput): POFormValues {
  return {
    supplierId: po.supplierId ?? "",
    warehouseId: po.warehouseId ?? "",
    date: po.date ? toDateInputValue(po.date) : toDateInputValue(new Date()),
    currency: (po.currency ?? "BHD") as POFormValues["currency"],
    notes: po.notes ?? undefined,
    internalNotes: po.internalNotes ?? undefined,
    lines: (po.lines ?? []).map((l) => ({
      mode: l.itemId ? "item" : "manual",
      itemId: l.itemId ?? undefined,
      itemName: (l as any).item?.name ?? undefined,
      itemSku: (l as any).item?.sku ?? undefined,
      itemImage: (l as any).item?.image ?? undefined,
      description: l.description ?? undefined,
      quantity: Number(l.quantity) || 0,
      unitCost: Number(l.unitCost) || 0,
      taxRateId: l.taxRateId ?? undefined,
      taxRateSnapshot:
        l.taxRateSnapshot != null ? Number(l.taxRateSnapshot) : undefined,
      taxRateName: l.taxRateName ?? undefined,
    })),
  };
}

export function buildPOSubmitPayload(values: POFormValues) {
  return {
    supplierId: values.supplierId,
    warehouseId: values.warehouseId,
    date: new Date(values.date),
    currency: values.currency,
    notes: values.notes || undefined,
    internalNotes: values.internalNotes || undefined,
    lines: values.lines.map((l) => ({
      mode: l.mode,
      itemId: l.itemId ?? undefined,
      description: l.description || undefined,
      quantity: Number(l.quantity),
      unitCost: Number(l.unitCost),
      taxRateId: l.taxRateId || undefined,
      taxRateSnapshot: l.taxRateSnapshot ?? undefined,
      taxRateName: l.taxRateName || undefined,
    })),
  };
}
