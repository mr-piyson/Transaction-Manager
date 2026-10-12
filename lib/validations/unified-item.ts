import { z } from "zod";
import { currencyCodeSchema } from "@/lib/validations";

// ---------------------------------------------------------------------------
// Supplier Item Draft — used in the form for each supplier price row
// ---------------------------------------------------------------------------

/** One (unit → price) row a supplier charges for the item. */
export const supplierItemPriceDraftSchema = z.object({
  unitId: z.string(),
  price: z.coerce.number().min(0),
});

export type SupplierItemPriceDraft = z.infer<
  typeof supplierItemPriceDraftSchema
>;

export const supplierItemDraftSchema = z.object({
  tempId: z.string(),
  id: z.string().optional(), // Existing supplierItem ID (for edit mode)
  supplierId: z.string(),
  supplierSku: z.string().max(100).optional(),
  supplierName: z.string().max(255).optional(),
  /** Derived base-unit price sent to the server for legacy consumers. */
  basePrice: z.coerce.number().min(0, "Valid price is required"),
  currency: currencyCodeSchema.default("BHD"),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
  minOrderQty: z.coerce.number().min(1, "MOQ must be at least 1").default(1),
  notes: z.string().max(5000).optional(),
  isActive: z.boolean().default(true),
  /** Per-UOM prices; `basePrice` mirrors the item's base-unit row. */
  prices: z.array(supplierItemPriceDraftSchema).default([]),
});

export type SupplierItemDraft = z.infer<typeof supplierItemDraftSchema>;

// ---------------------------------------------------------------------------
// Item UoM Draft — one row per unit including the Base (stock) unit.
//
// `factor` is always expressed relative to the Base Unit: 1 `<unit>` =
// `factor` Base Units. The Base row therefore always has a factor of 1.
// ---------------------------------------------------------------------------

export const itemUomDraftSchema = z.object({
  tempId: z.string(),
  id: z.string().optional(), // Existing ItemUom ID (for edit mode)
  unitId: z.string(),
  unitCode: z.string(),
  unitName: z.string().optional(),
  factor: z.coerce.number().positive("Factor must be greater than 0"),
  isPurchaseDefault: z.boolean().default(false),
  isSalesDefault: z.boolean().default(false),
  barcode: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
});

export type ItemUomDraft = z.infer<typeof itemUomDraftSchema>;

/** A draft row represents the Base (stock) unit when its id matches the item. */
export function isBaseUomDraft(
  draft: ItemUomDraft,
  baseUnitId: string | null | undefined,
): boolean {
  return !!baseUnitId && draft.unitId === baseUnitId;
}

export function makeUomDraft(input: {
  unitId: string;
  unitCode: string;
  unitName?: string;
  factor?: number;
  id?: string;
  isPurchaseDefault?: boolean;
  isSalesDefault?: boolean;
  barcode?: string;
  isActive?: boolean;
}): ItemUomDraft {
  return {
    tempId: generateId(),
    id: input.id,
    unitId: input.unitId,
    unitCode: input.unitCode,
    unitName: input.unitName,
    factor: input.factor ?? 1,
    isPurchaseDefault: input.isPurchaseDefault ?? false,
    isSalesDefault: input.isSalesDefault ?? false,
    barcode: input.barcode,
    isActive: input.isActive ?? true,
  };
}

// ---------------------------------------------------------------------------
// Item Master fields (subset of the full item schema for the unified dialog)
// ---------------------------------------------------------------------------

export const itemMasterSchema = z.object({
  type: z.enum(["PRODUCT", "SERVICE", "BUNDLE"]).default("PRODUCT"),
  sku: z.string().min(1, "Internal SKU is required").max(100),
  name: z.string().min(1, "Item name is required").max(255),
  barcode: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  image: z.string().max(500).optional(),
  unit: z.string().min(1, "Unit of measure is required").max(50).default("pcs"),
  unitId: z.string().optional(),
  isSaleable: z.boolean().default(true),
  isPurchasable: z.boolean().default(true),
  salesPrice: z.coerce.number().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  reorderPoint: z.coerce.number().int().min(0).default(0),
  reorderQty: z.coerce.number().int().min(0).default(0),
  categoryId: z.string().optional(),
  taxRateId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type ItemMasterValues = z.infer<typeof itemMasterSchema>;

// ---------------------------------------------------------------------------
// Unified form — master + supplier drafts combined
// ---------------------------------------------------------------------------

export const unifiedItemSchema = z.object({
  master: itemMasterSchema,
  supplierDrafts: z.array(supplierItemDraftSchema),
});

export type UnifiedItemFormValues = z.infer<typeof unifiedItemSchema>;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** Prisma Decimal-like value (client-side deserialized). */
export interface DecimalLike {
  toNumber(): number;
}

/** Accepts DB-shaped rows: nullable strings and Decimal numerics. */
export type ItemMasterDefaultsInput = {
  [K in keyof ItemMasterValues]?: ItemMasterValues[K] extends number
    ? number | DecimalLike | null
    : ItemMasterValues[K] | null;
};

function toNum(value: unknown): number {
  if (typeof value === "number") return value;
  if (value != null && typeof (value as DecimalLike).toNumber === "function") {
    return (value as DecimalLike).toNumber();
  }
  return Number(value) || 0;
}

export function getItemMasterDefaults(
  item?: ItemMasterDefaultsInput,
): ItemMasterValues {
  return {
    type: item?.type ?? "PRODUCT",
    sku: item?.sku ?? "",
    name: item?.name ?? "",
    barcode: item?.barcode ?? undefined,
    description: item?.description ?? undefined,
    image: item?.image ?? undefined,
    unit: item?.unit ?? "pcs",
    unitId: item?.unitId ?? undefined,
    isSaleable: item?.isSaleable ?? true,
    isPurchasable: item?.isPurchasable ?? true,
    salesPrice: toNum(item?.salesPrice),
    minStock: Math.trunc(toNum(item?.minStock)),
    reorderPoint: Math.trunc(toNum(item?.reorderPoint)),
    reorderQty: Math.trunc(toNum(item?.reorderQty)),
    categoryId: item?.categoryId ?? undefined,
    taxRateId: item?.taxRateId ?? undefined,
    isActive: item?.isActive ?? true,
  };
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSupplierItemDraftDefaults(): SupplierItemDraft {
  return {
    tempId: generateId(),
    supplierId: "",
    supplierSku: undefined,
    supplierName: undefined,
    basePrice: 0,
    currency: "BHD",
    leadTimeDays: undefined,
    minOrderQty: 1,
    notes: undefined,
    isActive: true,
    prices: [],
  };
}
