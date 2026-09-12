"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import * as React from "react";
import {
  type SubmitHandler,
  type UseFormReturn,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import type { InvoiceLineData } from "@/components/dialogs/invoiceLineDialog";
import { calculateInvoiceTotals } from "@/lib/calculator";
import {
  type InvoiceFormValues,
  invoiceFormSchema,
} from "@/lib/form/invoice/invoiceFormSchema";
import { buildSubmitPayload } from "@/lib/form/invoice/invoiceMapper";
import { trpc } from "@/lib/trpc/client";

export interface InvoiceFormController {
  mode: "create" | "edit";
  isEdit: boolean;
  form: UseFormReturn<InvoiceFormValues>;
  fields: import("react-hook-form").FieldArrayWithId<
    InvoiceFormValues,
    "lines",
    "id"
  >[];
  append: (values: InvoiceFormValues["lines"][number]) => void;
  remove: (index: number) => void;
  lines: InvoiceFormValues["lines"];
  totals: ReturnType<typeof calculateInvoiceTotals>;
  editingLineIndex: number | null;
  setEditingLineIndex: (index: number | null) => void;
  customers: any[];
  warehouses: any[];
  items: any[];
  itemsMap: Record<string, any>;
  isPending: boolean;
  submitError: string | null;
  clearSubmitError: () => void;
  onLineSave: (index: number, data: InvoiceLineData) => void;
  onSubmit: SubmitHandler<InvoiceFormValues>;
}

interface UseInvoiceFormControllerOptions {
  mode: "create" | "edit";
  initialValues: InvoiceFormValues;
  document?: { id: string; version?: number } | null;
  onSaved?: (id: string) => void;
  customersData?: any[];
  warehousesData?: any[];
  itemsData?: any[];
  orgData?: { defaultTermsText?: string | null; currency?: string } | null;
}

export function useInvoiceFormController({
  mode,
  initialValues,
  document,
  onSaved,
  customersData,
  warehousesData,
  itemsData,
  orgData,
}: UseInvoiceFormControllerOptions): InvoiceFormController {
  const t = useTranslations();
  const utils = trpc.useUtils();
  const isEdit = mode === "edit";

  const [editingLineIndex, setEditingLineIndex] = React.useState<number | null>(
    null,
  );
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues: initialValues,
  });
  const { setValue, watch, control } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const lines = useWatch({ control, name: "lines" }) ?? [];
  const currency = watch("currency");

  const { data: exchangeRateData } = trpc.exchangeRates.getRate.useQuery(
    { fromCurrency: currency, toCurrency: orgData?.currency ?? "BHD" },
    {
      enabled:
        !!currency && !!orgData?.currency && currency !== orgData?.currency,
    },
  );

  const totals = React.useMemo(() => {
    if (!lines || lines.length === 0) {
      return {
        lines: [],
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        total: 0,
        costTotal: 0,
      };
    }
    return calculateInvoiceTotals(
      lines.map((l) => ({
        quantity: Number(l.quantity) || 0,
        unitPrice: Number(l.unitPrice) || 0,
        discountAmt: Number(l.discountAmt) || 0,
        taxRateSnapshot: Number(l.taxRateSnapshot) || 0,
        purchasePrice: Number(l.purchasePrice) || 0,
      })),
    );
  }, [lines]);

  React.useEffect(() => {
    if (mode !== "create") return;
    if (watch("warehouseId")) return;
    const defaultWarehouse = (warehousesData ?? []).find(
      (w: any) => w.isDefault,
    );
    if (defaultWarehouse) setValue("warehouseId", defaultWarehouse.id);
  }, [mode, warehousesData, watch, setValue]);

  React.useEffect(() => {
    if (exchangeRateData) {
      setValue("exchangeRate", exchangeRateData.rate);
    }
  }, [exchangeRateData, setValue]);

  const createMutation = trpc.invoices.create.useMutation({
    onSuccess(data) {
      utils.invoices.list.invalidate();
      utils.invoices.byId.invalidate({ id: data.id });
      toast.success(t("invoices.invoiceCreated"), { description: data.serial });
      onSaved?.(data.id);
    },
    onError(err) {
      setSubmitError(err.message);
      toast.error(t("invoices.failedToCreate"), { description: err.message });
    },
  });

  const updateMutation = trpc.invoices.update.useMutation({
    onSuccess(data) {
      utils.invoices.list.invalidate();
      utils.invoices.byId.invalidate({ id: data.id });
      toast.success(t("invoices.invoiceUpdated"), { description: data.serial });
      onSaved?.(data.id);
    },
    onError(err) {
      setSubmitError(err.message);
      toast.error(t("invoices.failedToUpdate"), { description: err.message });
    },
  });

  const isPending =
    form.formState.isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending;

  const onSubmit: SubmitHandler<InvoiceFormValues> = (values) => {
    setSubmitError(null);
    const payload = buildSubmitPayload(values);

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

  const customers = customersData ?? [];
  const warehouses = warehousesData ?? [];
  const items = itemsData ?? [];

  const itemsMap = React.useMemo(
    () => Object.fromEntries(items.map((i: any) => [i.id, i])),
    [items],
  );

  const onLineSave = (index: number, data: InvoiceLineData) => {
    if (index >= fields.length) {
      append({
        itemId: data.itemId || "",
        description: data.description || "",
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discountAmt: data.discountAmt,
        purchasePrice: data.purchasePrice ?? 0,
        taxRateId: data.taxRateId || "",
        taxRateSnapshot: data.taxRateSnapshot ?? undefined,
        taxRateName: data.taxRateName || "",
        sortOrder: 0,
      });
    } else {
      setValue(`lines.${index}.itemId`, data.itemId || undefined);
      setValue(`lines.${index}.description`, data.description || undefined);
      setValue(`lines.${index}.quantity`, data.quantity);
      setValue(`lines.${index}.unitPrice`, data.unitPrice);
      setValue(`lines.${index}.discountAmt`, data.discountAmt);
      setValue(`lines.${index}.purchasePrice`, data.purchasePrice ?? undefined);
      setValue(`lines.${index}.taxRateId`, data.taxRateId || undefined);
      setValue(
        `lines.${index}.taxRateSnapshot`,
        data.taxRateSnapshot ?? undefined,
      );
      setValue(`lines.${index}.taxRateName`, data.taxRateName || undefined);
    }
  };

  return {
    mode,
    isEdit,
    form,
    fields,
    append,
    remove,
    lines,
    totals,
    editingLineIndex,
    setEditingLineIndex,
    customers,
    warehouses,
    items,
    itemsMap,
    isPending,
    submitError,
    clearSubmitError: () => setSubmitError(null),
    onLineSave,
    onSubmit,
  };
}
