import { z } from "zod";
import { currencyCodeSchema } from "@/lib/validations";

export const invoiceLineSchema = z.object({
  id: z.string().nullish(),
  itemId: z.string().nullish(),
  // Display-only snapshot of the referenced item, so a line still renders with
  // its real name/sku even when the item is excluded from the catalogue query.
  itemName: z.string().nullish(),
  itemSku: z.string().nullish(),
  itemImage: z.string().nullish(),
  description: z.string().nullish(),
  quantity: z.coerce.number().positive("Qty must be > 0"),
  unitPrice: z.coerce.number().min(0, "Price must be >= 0"),
  discountAmt: z.coerce.number().min(0).default(0),
  purchasePrice: z.coerce.number().min(0).nullish(),
  taxRateId: z.string().nullish(),
  taxRateSnapshot: z.coerce.number().nullish(),
  taxRateName: z.string().nullish(),
  sortOrder: z.number().int().default(0),
  departmentId: z.string().nullish(),
});

export const invoiceFormSchema = z.object({
  type: z
    .enum(["QUOTE", "INVOICE", "CREDIT_NOTE", "PROFORMA", "DELIVERY_NOTE"])
    .default("INVOICE"),
  date: z.string().min(1, "Date is required"),
  dueDate: z.string().optional(),
  customerId: z.string().optional(),
  warehouseId: z.string().optional(),
  departmentId: z.string().optional(),
  currency: currencyCodeSchema.default("BHD"),
  exchangeRate: z.coerce.number().positive().default(1),
  description: z.string().optional(),
  termsText: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  isWalkIn: z.boolean().default(false),
  parentInvoiceId: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1, "At least one line is required"),
});

export type InvoiceLineFormValues = z.infer<typeof invoiceLineSchema>;
export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
