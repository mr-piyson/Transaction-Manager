import { z } from "zod";
import { currencyCodeSchema } from "@/lib/validations";

export const poLineSchema = z.object({
  mode: z.enum(["item", "manual"]).optional(),
  itemId: z.string().nullable().optional(),
  // Display-only snapshot of the referenced item, so a line still renders with
  // its real name/sku even when the item is excluded from the catalogue query.
  itemName: z.string().nullable().optional(),
  itemSku: z.string().nullable().optional(),
  itemImage: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  quantity: z.coerce.number().positive("Qty must be > 0"),
  unitCost: z.coerce.number().min(0, "Unit cost must be >= 0"),
  taxRateId: z.string().nullable().optional(),
  taxRateSnapshot: z.coerce.number().nullable().optional(),
  taxRateName: z.string().nullable().optional(),
});

export const poFormSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  date: z.string().min(1, "Date is required"),
  currency: currencyCodeSchema.default("BHD"),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  lines: z.array(poLineSchema).min(1, "At least one line is required"),
});

export type POFormValues = z.infer<typeof poFormSchema>;
export type POLineFormValue = z.infer<typeof poLineSchema>;
