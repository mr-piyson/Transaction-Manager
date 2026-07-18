import { z } from 'zod';
import { currencyCodeSchema } from '@/lib/validations';

// ---------------------------------------------------------------------------
// Supplier Item Draft — used in the form for each supplier price row
// ---------------------------------------------------------------------------

export const supplierItemDraftSchema = z.object({
  tempId: z.string(),
  id: z.string().optional(), // Existing supplierItem ID (for edit mode)
  supplierId: z.string().min(1, 'Select a supplier'),
  supplierSku: z.string().max(100).optional(),
  supplierName: z.string().max(255).optional(),
  basePrice: z.coerce.number().min(0, 'Valid price is required'),
  currency: currencyCodeSchema.default('BHD'),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
  minOrderQty: z.coerce.number().min(1, 'MOQ must be at least 1').default(1),
  notes: z.string().max(5000).optional(),
  isActive: z.boolean().default(true),
});

export type SupplierItemDraft = z.infer<typeof supplierItemDraftSchema>;

// ---------------------------------------------------------------------------
// Item Master fields (subset of the full item schema for the unified dialog)
// ---------------------------------------------------------------------------

export const itemMasterSchema = z.object({
  type: z.enum(['PRODUCT', 'SERVICE']).default('PRODUCT'),
  sku: z.string().min(1, 'Internal SKU is required').max(100),
  name: z.string().min(1, 'Item name is required').max(255),
  barcode: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  image: z.string().max(500).optional(),
  unit: z.string().min(1, 'Unit of measure is required').max(50).default('pcs'),
  unitId: z.string().optional(),
  isSaleable: z.boolean().default(true),
  isPurchasable: z.boolean().default(true),
  purchasePrice: z.coerce.number().min(0).default(0),
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
  supplierDrafts: z.array(supplierItemDraftSchema).min(1, 'Add at least one supplier'),
});

export type UnifiedItemFormValues = z.infer<typeof unifiedItemSchema>;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export function getItemMasterDefaults(
  item?: Partial<ItemMasterValues>,
): ItemMasterValues {
  return {
    type: item?.type ?? 'PRODUCT',
    sku: item?.sku ?? '',
    name: item?.name ?? '',
    barcode: item?.barcode ?? undefined,
    description: item?.description ?? undefined,
    image: item?.image ?? undefined,
    unit: item?.unit ?? 'pcs',
    unitId: item?.unitId ?? undefined,
    isSaleable: item?.isSaleable ?? true,
    isPurchasable: item?.isPurchasable ?? true,
    purchasePrice: typeof item?.purchasePrice === 'number' ? item.purchasePrice : 0,
    salesPrice: typeof item?.salesPrice === 'number' ? item.salesPrice : 0,
    minStock: typeof item?.minStock === 'number' ? item.minStock : 0,
    reorderPoint: typeof item?.reorderPoint === 'number' ? item.reorderPoint : 0,
    reorderQty: typeof item?.reorderQty === 'number' ? item.reorderQty : 0,
    categoryId: item?.categoryId ?? undefined,
    taxRateId: item?.taxRateId ?? undefined,
    isActive: item?.isActive ?? true,
  };
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSupplierItemDraftDefaults(): SupplierItemDraft {
  return {
    tempId: generateId(),
    supplierId: '',
    supplierSku: undefined,
    supplierName: undefined,
    basePrice: 0,
    currency: 'BHD',
    leadTimeDays: undefined,
    minOrderQty: 1,
    notes: undefined,
    isActive: true,
  };
}
