import { z } from "zod";

export const itemFormSchema = z.object({
  type: z.enum(["PRODUCT", "SERVICE"]),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  image: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  unitId: z.string().optional(),
  isSaleable: z.boolean(),
  isPurchasable: z.boolean(),
  salesPrice: z.coerce.number().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  reorderPoint: z.coerce.number().int().min(0).default(0),
  reorderQty: z.coerce.number().int().min(0).default(0),
  categoryId: z.string().optional(),
  taxRateId: z.string().optional(),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;

export function getItemFormDefaults(
  item?: Partial<ItemFormValues>,
): ItemFormValues {
  return {
    type: item?.type ?? "PRODUCT",
    sku: item?.sku ?? "",
    barcode: item?.barcode ?? undefined,
    name: item?.name ?? "",
    description: item?.description ?? undefined,
    image: item?.image ?? undefined,
    unit: item?.unit ?? "pcs",
    unitId: item?.unitId ?? undefined,
    isSaleable: item?.isSaleable ?? true,
    isPurchasable: item?.isPurchasable ?? true,
    salesPrice: typeof item?.salesPrice === "number" ? item.salesPrice : 0,
    minStock: typeof item?.minStock === "number" ? item.minStock : 0,
    reorderPoint:
      typeof item?.reorderPoint === "number" ? item.reorderPoint : 0,
    reorderQty: typeof item?.reorderQty === "number" ? item.reorderQty : 0,
    categoryId: item?.categoryId ?? undefined,
    taxRateId: item?.taxRateId ?? undefined,
  };
}
