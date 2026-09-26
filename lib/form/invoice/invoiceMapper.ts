import { formatDateForInput, toDateInputValue } from "@/lib/date";
import type {
  InvoiceFormValues,
  InvoiceLineFormValues,
} from "@/lib/form/invoice/invoiceFormSchema";

export function lineToFormValues(line: any): InvoiceLineFormValues {
  return {
    id: line.id ?? undefined,
    itemId: line.itemId ?? undefined,
    itemName: line.item?.name ?? undefined,
    itemSku: line.item?.sku ?? undefined,
    itemImage: line.item?.image ?? undefined,
    description: line.description ?? undefined,
    quantity: Number(line.quantity) || 0,
    unitPrice: Number(line.unitPrice) || 0,
    discountAmt: Number(line.discountAmt) || 0,
    purchasePrice:
      line.purchasePrice != null ? Number(line.purchasePrice) : undefined,
    taxRateId: line.taxRateId ?? undefined,
    taxRateSnapshot:
      line.taxRateSnapshot != null ? Number(line.taxRateSnapshot) : undefined,
    taxRateName: line.taxRateName ?? undefined,
    sortOrder: line.sortOrder ?? 0,
    departmentId: line.departmentId ?? undefined,
  };
}

export function invoiceToFormValues(
  invoice: any,
  options?: { keepLineIds?: boolean },
): InvoiceFormValues {
  const { keepLineIds = true } = options ?? {};
  const lines: InvoiceLineFormValues[] = (invoice.lines ?? []).map((l: any) => {
    const values = lineToFormValues(l);
    if (!keepLineIds) values.id = undefined;
    return values;
  });

  return {
    type: (invoice.type as InvoiceFormValues["type"]) ?? "INVOICE",
    date: invoice.date
      ? formatDateForInput(invoice.date)
      : toDateInputValue(new Date()),
    dueDate: invoice.dueDate ? formatDateForInput(invoice.dueDate) : undefined,
    customerId: invoice.customerId ?? undefined,
    warehouseId: invoice.warehouseId ?? undefined,
    departmentId: invoice.departmentId ?? undefined,
    currency: (invoice.currency as InvoiceFormValues["currency"]) ?? "BHD",
    exchangeRate: Number(invoice.exchangeRate) || 1,
    description: invoice.description ?? undefined,
    termsText: invoice.termsText ?? undefined,
    notes: invoice.notes ?? undefined,
    internalNotes: invoice.internalNotes ?? undefined,
    isWalkIn: invoice.isWalkIn ?? false,
    parentInvoiceId: invoice.parentInvoiceId ?? undefined,
    lines,
  };
}

export type InvoiceSubmitPayload = {
  type: InvoiceFormValues["type"];
  date: Date;
  dueDate?: Date;
  customerId?: string | null;
  warehouseId?: string;
  departmentId?: string;
  currency: InvoiceFormValues["currency"];
  exchangeRate: number;
  description?: string;
  termsText?: string;
  notes?: string;
  internalNotes?: string;
  isWalkIn: boolean;
  parentInvoiceId?: string;
  lines: {
    id?: string;
    itemId?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discountAmt: number;
    purchasePrice?: number;
    taxRateId?: string;
    taxRateSnapshot?: number;
    taxRateName?: string;
    sortOrder: number;
    departmentId?: string;
  }[];
};

export function buildSubmitPayload(
  values: InvoiceFormValues,
): InvoiceSubmitPayload {
  return {
    type: values.type,
    date: new Date(values.date),
    dueDate: values.dueDate ? new Date(values.dueDate) : undefined,
    customerId: values.isWalkIn ? null : values.customerId || undefined,
    warehouseId: values.warehouseId || undefined,
    departmentId: values.departmentId || undefined,
    currency: values.currency,
    exchangeRate: Number(values.exchangeRate) || 1,
    description: values.description || undefined,
    termsText: values.termsText || undefined,
    notes: values.notes || undefined,
    internalNotes: values.internalNotes || undefined,
    isWalkIn: values.isWalkIn,
    parentInvoiceId: values.parentInvoiceId || undefined,
    lines: values.lines.map((line, idx) => ({
      id: line.id || undefined,
      itemId: line.itemId || undefined,
      description: line.description || undefined,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      discountAmt: Number(line.discountAmt) || 0,
      purchasePrice: Number(line.purchasePrice) || undefined,
      taxRateId: line.taxRateId || undefined,
      taxRateSnapshot: line.taxRateSnapshot
        ? Number(line.taxRateSnapshot)
        : undefined,
      taxRateName: line.taxRateName || undefined,
      sortOrder: idx,
      departmentId: line.departmentId || undefined,
    })),
  };
}

export function buildCreateDefaults(options: {
  documentType: "invoices" | "quotations";
  warehousesData?: any[];
  org?: { defaultTermsText?: string | null; currency?: string } | null;
  source?: { kind: "creditNote" | "duplicate"; invoice: any };
}): InvoiceFormValues {
  const { documentType, warehousesData, org, source } = options;

  if (source?.kind === "duplicate") {
    return invoiceToFormValues(source.invoice, { keepLineIds: false });
  }

  if (source?.kind === "creditNote") {
    return {
      type: "CREDIT_NOTE",
      date: toDateInputValue(new Date()),
      customerId: source.invoice.customerId ?? undefined,
      warehouseId: source.invoice.warehouseId ?? undefined,
      currency:
        (source.invoice.currency as InvoiceFormValues["currency"]) ?? "BHD",
      exchangeRate: Number(source.invoice.exchangeRate) || 1,
      isWalkIn: source.invoice.isWalkIn ?? false,
      parentInvoiceId: source.invoice.id,
      lines: (source.invoice.lines ?? []).map((l: any) =>
        lineToFormValues({ ...l, id: undefined }),
      ),
    };
  }

  const defaultWarehouse = (warehousesData ?? []).find((w: any) => w.isDefault);

  return {
    type: documentType === "quotations" ? "QUOTE" : "INVOICE",
    date: toDateInputValue(new Date()),
    customerId: "",
    warehouseId: defaultWarehouse?.id ?? "",
    departmentId: undefined,
    currency: (org?.currency ?? "BHD") as InvoiceFormValues["currency"],
    exchangeRate: 1,
    termsText: org?.defaultTermsText ?? undefined,
    isWalkIn: false,
    lines: [],
  };
}
