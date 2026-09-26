"use client";

import { Package, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import type * as React from "react";
import { useState } from "react";
import { InvoiceLineDialog } from "@/components/dialogs/invoiceLineDialog";
import { RichtextEditor } from "@/components/richtext-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInputField } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvoiceFormController } from "@/lib/form/invoice/useInvoiceFormController";
import { CURRENCIES, cn } from "@/lib/utils";

export interface PaperOrgMeta {
  name?: string | null;
  logo?: string | null;
  crNumber?: string | null;
  taxId?: string | null;
  vatRegistered?: boolean;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  defaultTermsText?: string | null;
}

/** Readonly invoice data for preview mode */
export interface InvoiceReadonlyData {
  type?: string;
  serial?: string;
  date?: string | Date | null;
  dueDate?: string | Date | null;
  currency?: string;
  customer?: {
    name?: string | null;
    vatNumber?: string | null;
    taxId?: string | null;
  } | null;
  warehouse?: { name?: string | null } | null;
  isWalkIn?: boolean;
  subtotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  total?: number;
  costTotal?: number;
  termsText?: string | null;
  lines?: Array<{
    id?: string;
    itemId?: string | null;
    description?: string | null;
    quantity?: number;
    unitPrice?: number;
    discountAmt?: number;
    taxAmt?: number;
    taxRateName?: string | null;
    taxRateSnapshot?: number | null;
    total?: number;
    item?: {
      name?: string | null;
      sku?: string | null;
      image?: string | null;
    } | null;
  }>;
}

interface InvoiceFormBodyProps {
  /** Required in edit mode, optional in readonly mode */
  controller?: InvoiceFormController;
  serial?: string | null;
  org?: PaperOrgMeta | null;
  /** When true, renders all fields as readonly text */
  readonly?: boolean;
  /** Readonly invoice data (required when readonly=true) */
  invoice?: InvoiceReadonlyData;
  /** Status badges rendered in the letterhead */
  badges?: React.ReactNode;
  /** Action buttons (dropdown menu) rendered in the letterhead */
  actions?: React.ReactNode;
  /** Back navigation handler (used in readonly mode) */
  onBack?: () => void;
  /** Back href for readonly mode link */
  backHref?: string;
}

// Keeps the "paper" light across light AND dark app themes (same trick as the
// print page): the sheet redefines the surface tokens locally so inputs on it
// stay crisp instead of picking up the app's dark backgrounds.
const PAPER_THEME = {
  colorScheme: "light",
  color: "#17141d",
  "--background": "#ffffff",
  "--foreground": "#17141d",
  "--muted": "#f3f3f5",
  "--muted-foreground": "#606067",
  "--border": "#e2e2e7",
  "--input": "#d9d9de",
  "--ring": "#2c2742",
  "--accent": "#e9e9ee",
  "--accent-foreground": "#17141d",
  "--popover": "#ffffff",
  "--popover-foreground": "#17141d",
  "--primary": "#2c2742",
  "--primary-foreground": "#fbfbfb",
  "--destructive": "#a82b2b",
} as React.CSSProperties;

function Thumb({
  item,
  isManual,
}: {
  item: any;
  isManual: boolean;
  className?: string;
}) {
  return (
    <div className="size-9 shrink-0 overflow-hidden rounded-md border bg-muted">
      {!isManual && item?.image ? (
        <img
          src={item.image}
          alt={item.name}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          {isManual ? (
            <Wrench className="size-4 text-muted-foreground/60" />
          ) : (
            <Package className="size-4 text-muted-foreground/60" />
          )}
        </div>
      )}
    </div>
  );
}

function PaperLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

function TotalsRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-8">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums font-medium", className)}>
        {children}
      </span>
    </div>
  );
}

function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function InvoiceFormBody({
  controller,
  serial,
  org,
  readonly = false,
  invoice,
  badges,
  actions,
  onBack,
  backHref,
}: InvoiceFormBodyProps) {
  const t = useTranslations();

  // ── Edit mode state ──────────────────────────────────────────────────────
  const formCtrl = controller;
  const form = formCtrl?.form;
  const fields = formCtrl?.fields ?? [];
  const totals = formCtrl?.totals;
  const editingLineIndex = formCtrl?.editingLineIndex ?? null;
  const setEditingLineIndex = formCtrl?.setEditingLineIndex ?? (() => {});
  const customers = formCtrl?.customers ?? [];
  const warehouses = formCtrl?.warehouses ?? [];
  const itemsMap = formCtrl?.itemsMap ?? {};
  const onLineSave = formCtrl?.onLineSave ?? (() => {});
  const remove = formCtrl?.remove ?? (() => {});

  // Row selection drives the action bar above the table. Single-select.
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(
    null,
  );

  // Clamped against the live field list: removing a row shifts every index
  // after it, so a raw index could otherwise point at the wrong line.
  const activeSelection =
    selectedLineIndex !== null && selectedLineIndex < fields.length
      ? selectedLineIndex
      : null;

  const removeLine = (index: number) => {
    remove(index);
    setSelectedLineIndex((cur) =>
      cur === null ? null : cur === index ? null : cur > index ? cur - 1 : cur,
    );
  };

  const watch = form?.watch;
  const setValue = form?.setValue;
  const control = form?.control;
  const register = form?.register;

  const invoiceType = watch?.("type") ?? invoice?.type ?? "INVOICE";
  const isWalkIn = watch?.("isWalkIn") ?? invoice?.isWalkIn ?? false;

  const isInvoiceType = invoiceType === "INVOICE";
  const needsCustomer = !["DELIVERY_NOTE"].includes(invoiceType);
  const needsWarehouse = isInvoiceType;

  const linesWatch = watch?.("lines");
  const hasAnyDiscount = readonly
    ? invoice?.lines?.some((l) => Number(l.discountAmt) > 0)
    : linesWatch?.some((l) => Number(l?.discountAmt) > 0);

  // Item ids used by every line except the one being edited, so the picker can
  // exclude duplicates. Derived from the live value, not the `fields` snapshot.
  const otherLineItemIds = (linesWatch ?? [])
    .map((l) => l?.itemId)
    .filter((id, i): id is string => !!id && i !== editingLineIndex);

  const invoiceTypeOptions = [
    { value: "INVOICE", label: t("invoices.invoice") },
    { value: "QUOTE", label: t("invoices.quote") },
    { value: "CREDIT_NOTE", label: t("invoices.creditNote") },
    { value: "DELIVERY_NOTE", label: t("invoices.deliveryNote") },
  ];

  const typeLabel =
    invoiceTypeOptions.find((o) => o.value === invoiceType)?.label ??
    invoiceType;

  // ── Readonly line items ──────────────────────────────────────────────────
  const readonlyLines = invoice?.lines ?? [];

  // ── Readonly totals ──────────────────────────────────────────────────────
  const readonlyTotals = readonly
    ? {
        subtotal: invoice?.subtotal ?? 0,
        discountTotal: invoice?.discountTotal ?? 0,
        taxTotal: invoice?.taxTotal ?? 0,
        total: invoice?.total ?? 0,
        costTotal: invoice?.costTotal ?? 0,
      }
    : null;

  const displayTotals = readonly ? readonlyTotals : totals;

  return (
    <div className="min-w-0">
      <div
        className="w-full min-w-0 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-border"
        style={PAPER_THEME}
      >
        {/* ================= Letterhead ================= */}
        <header className="flex flex-col gap-2 items-start border-b px-6 py-6 sm:px-8">
          <div>
            {org?.logo && (
              <img
                src={org.logo}
                alt={org.name ?? ""}
                className="h-12 w-auto shrink-0 rounded-md border object-contain"
              />
            )}
          </div>
          <div className="flex w-full items-center justify-between gap-4">
            {/* Company block */}
            <div className="space-y-0.5">
              <h1 className="text-xl font-bold leading-tight">
                {org?.name ?? ""}
              </h1>
              <div className="space-y-0.5 text-xs text-muted-foreground">
                {org?.crNumber && (
                  <p>
                    {t("customers.crNumber")}: {org.crNumber}
                  </p>
                )}
                {org?.taxId && (
                  <p>
                    {t("customers.taxId")}: {org.taxId}
                  </p>
                )}
                {org?.vatRegistered && <p>{t("common.vatRegistered")}</p>}
                {org?.phone && <p>{org.phone}</p>}
                {org?.email && <p>{org.email}</p>}
                {org?.website && <p>{org.website}</p>}
              </div>
            </div>

            {/* Document block */}
            <div className="ml-auto flex min-w-0 flex-col items-end text-right sm:items-end">
              {readonly ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold uppercase tracking-wide sm:text-3xl">
                    {typeLabel}
                  </span>
                  {badges}
                  {actions}
                </div>
              ) : (
                <Select
                  value={watch?.("type")}
                  onValueChange={(v) =>
                    setValue?.("type", v as any, { shouldDirty: true })
                  }
                >
                  <SelectTrigger
                    aria-label={t("invoices.type")}
                    className="h-auto w-fit border-0 bg-transparent px-1 py-0 text-2xl font-bold uppercase tracking-wide shadow-none hover:bg-muted/40 focus-visible:ring-0 sm:text-3xl [&_svg:not([class*='text-'])]:text-muted-foreground"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {invoiceTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {serial && (
                <span className="mt-0.5 text-sm font-semibold text-muted-foreground">
                  {serial}
                </span>
              )}

              <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
                <div className="w-40">
                  <PaperLabel>{t("invoices.issueDate")} *</PaperLabel>
                  {readonly ? (
                    <p className="text-sm font-medium">
                      {formatDateShort(invoice?.date)}
                    </p>
                  ) : (
                    <DateInputField
                      control={control!}
                      name="date"
                      rules={{ required: "Date is required" }}
                      required
                      showTodayButton
                    />
                  )}
                </div>
                {!isInvoiceType && (
                  <div className="w-40">
                    <PaperLabel>{t("invoices.dueDate")}</PaperLabel>
                    {readonly ? (
                      <p className="text-sm font-medium">
                        {formatDateShort(invoice?.dueDate)}
                      </p>
                    ) : (
                      <DateInputField
                        control={control!}
                        name="dueDate"
                        showTodayButton
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ================= Bill to / meta ================= */}
        <section className="grid gap-x-10 gap-y-5 border-b px-6 py-5 sm:px-8 md:grid-cols-2">
          {needsCustomer && (
            <div className="min-w-0">
              <PaperLabel>
                {isWalkIn
                  ? t("invoices.walkInCustomerName")
                  : t("invoices.billTo")}
              </PaperLabel>
              {readonly ? (
                <p className="text-sm font-medium">
                  {invoice?.customer?.name ?? "—"}
                  {invoice?.customer?.vatNumber && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (VAT: {invoice.customer.vatNumber})
                    </span>
                  )}
                  {invoice?.customer?.taxId &&
                    !invoice?.customer?.vatNumber && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Tax: {invoice.customer.taxId})
                      </span>
                    )}
                </p>
              ) : isWalkIn ? (
                <Input
                  placeholder={t("invoices.walkInCustomerPlaceholder")}
                  {...register?.("customerId")}
                />
              ) : (
                <Select
                  value={watch?.("customerId") || ""}
                  onValueChange={(v) =>
                    setValue?.("customerId", v, { shouldDirty: true })
                  }
                >
                  <SelectTrigger
                    className="w-full min-w-0"
                    aria-label={t("invoices.customer")}
                  >
                    <SelectValue placeholder={t("invoices.selectCustomer")} />
                  </SelectTrigger>
                  <SelectContent className="max-w-[75vw]">
                    {customers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id} className="min-w-0">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate">{c.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!readonly && (
                <div className="mt-2 flex items-center gap-2">
                  <Checkbox
                    id="isWalkIn"
                    checked={isWalkIn}
                    onCheckedChange={(checked) => {
                      setValue?.("isWalkIn", checked === true, {
                        shouldDirty: true,
                      });
                      if (checked)
                        setValue?.("customerId", "", { shouldDirty: true });
                    }}
                  />
                  <Label
                    htmlFor="isWalkIn"
                    className="cursor-pointer font-normal text-muted-foreground"
                  >
                    {t("invoices.walkInCustomer")}
                  </Label>
                </div>
              )}
            </div>
          )}

          {needsWarehouse && (
            <div className="min-w-0">
              <PaperLabel>{t("invoices.warehouse")}</PaperLabel>
              {readonly ? (
                <p className="text-sm font-medium">
                  {invoice?.warehouse?.name ?? "—"}
                </p>
              ) : (
                <Select
                  value={watch?.("warehouseId") || ""}
                  onValueChange={(v) =>
                    setValue?.("warehouseId", v, { shouldDirty: true })
                  }
                >
                  <SelectTrigger
                    className="w-full min-w-0"
                    aria-label={t("invoices.warehouse")}
                  >
                    <SelectValue placeholder={t("invoices.selectWarehouse")} />
                  </SelectTrigger>
                  <SelectContent className="max-w-[75vw]">
                    {warehouses.map((w: any) => (
                      <SelectItem key={w.id} value={w.id} className="min-w-0">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate">{w.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </section>

        {/* ================= Line items ================= */}
        <section className="px-6 py-4 sm:px-8">
          {!readonly && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                className="inline-flex items-center justify-center gap-1.5 border-dashed py-2 text-sm font-medium"
                onClick={() => setEditingLineIndex(fields.length)}
              >
                <Plus className="h-4 w-4" />
                {t("invoices.addLine")}
              </Button>

              {activeSelection !== null && (
                <div className="flex items-center gap-2 animate-in fade-in-0 zoom-in-95 duration-150">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setEditingLineIndex(activeSelection)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("common.edit")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:border-destructive/40 hover:text-destructive"
                    onClick={() => removeLine(activeSelection)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("common.delete")}
                  </Button>
                </div>
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  {!readonly && (
                    <th className="w-10 py-2 pr-2 text-center font-semibold">
                      <span className="sr-only">{t("common.selectRow")}</span>
                    </th>
                  )}
                  <th className="w-10 py-2 pr-2 text-center font-semibold">
                    #
                  </th>
                  <th className="py-2 pr-2 text-left font-semibold">
                    {t("invoices.item")}
                  </th>
                  <th className="w-24 px-2 text-center font-semibold">
                    {t("invoices.qty")}
                  </th>
                  <th className="w-28 px-2 text-center font-semibold">
                    {t("invoices.unitPrice")}
                  </th>
                  {hasAnyDiscount && (
                    <th className="w-24 px-2 text-center font-semibold">
                      {t("invoices.discount")}
                    </th>
                  )}
                  <th className="w-28 px-2 text-center font-semibold">
                    {t("invoices.tax")}
                  </th>
                  <th className="w-32 px-2 text-center font-semibold">
                    {t("common.total")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {readonly
                  ? readonlyLines.map((line, index) => {
                      const isManual = !line.itemId;
                      const item = line.item;
                      const qty = Number(line.quantity) || 0;
                      const price = Number(line.unitPrice) || 0;
                      const discount = Number(line.discountAmt) || 0;
                      const lineSubtotal = qty * price;
                      const lineTax = Number(line.taxAmt) || 0;
                      const hasDiscount = discount > 0;

                      return (
                        <tr
                          key={line.id ?? index}
                          className="border-b last:border-0"
                        >
                          <td className="py-2.5 pr-2 align-middle text-center text-xs text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="py-2.5 pr-2 align-middle text-left">
                            <div className="flex items-center gap-2.5">
                              <Thumb item={item} isManual={isManual} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {isManual
                                    ? line.description ||
                                      t("invoices.manualEntry")
                                    : item?.name || "—"}
                                </p>
                                {item?.sku && (
                                  <p className="text-xs text-muted-foreground">
                                    SKU: {item.sku}
                                  </p>
                                )}
                                {!isManual && line.description && (
                                  <p className="truncate text-xs text-muted-foreground italic">
                                    {line.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 text-center align-middle tabular-nums">
                            {qty.toFixed(3)}
                          </td>
                          <td className="px-2 text-center align-middle tabular-nums">
                            {price.toFixed(3)}
                          </td>
                          {hasAnyDiscount && (
                            <td className="px-2 text-center align-middle tabular-nums">
                              {hasDiscount ? `-${discount.toFixed(3)}` : "—"}
                            </td>
                          )}
                          <td className="px-2 text-center align-middle tabular-nums">
                            {line.taxRateName ? (
                              <span>
                                {lineTax.toFixed(3)}
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({line.taxRateName})
                                </span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-2 text-center align-middle tabular-nums font-medium">
                            {Number(line.total).toFixed(3)}
                          </td>
                        </tr>
                      );
                    })
                  : fields.map((field, index) => {
                      const lineWatch = watch?.(`lines.${index}`);
                      const itemId = lineWatch?.itemId ?? field.itemId;
                      const isManual = !itemId;
                      // Prefer the live catalogue entry; fall back to the
                      // name/sku snapshot carried on the line so items missing
                      // from the catalogue query don't render as a raw id.
                      const item = itemId
                        ? ((itemsMap[itemId] as any) ?? {
                            id: itemId,
                            name: lineWatch?.itemName ?? field.itemName,
                            sku: lineWatch?.itemSku ?? field.itemSku,
                            image: lineWatch?.itemImage ?? field.itemImage,
                          })
                        : undefined;
                      const qty = Number(lineWatch?.quantity) || 0;
                      const price = Number(lineWatch?.unitPrice) || 0;
                      const discount = Number(lineWatch?.discountAmt) || 0;
                      const lineSubtotal = qty * price;
                      const taxRate = Number(lineWatch?.taxRateSnapshot) || 0;
                      const lineTax =
                        lineSubtotal - discount > 0
                          ? (lineSubtotal - discount) * (taxRate / 100)
                          : 0;
                      const isManualLabel =
                        lineWatch?.description || t("invoices.manualEntry");

                      const isSelected = activeSelection === index;

                      return (
                        <tr
                          key={field.id}
                          className={cn(
                            "cursor-pointer border-b transition-colors last:border-0",
                            isSelected ? "bg-zinc-100/70" : "hover:bg-zinc-50",
                          )}
                          onClick={() => setSelectedLineIndex(index)}
                        >
                          <td
                            className="py-2.5 pr-2 align-middle text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                setSelectedLineIndex(
                                  checked === true ? index : null,
                                )
                              }
                              aria-label={t("invoices.lineItemTitle", {
                                number: index + 1,
                              })}
                            />
                          </td>
                          <td className="py-2.5 pr-2 align-middle text-center text-xs text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="py-2.5 pr-2 align-middle text-left">
                            <div className="flex items-center gap-2.5">
                              <Thumb item={item} isManual={isManual} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {isManual ? isManualLabel : item?.name || "—"}
                                </p>
                                {item?.sku && (
                                  <p className="text-xs text-muted-foreground">
                                    SKU: {item.sku}
                                  </p>
                                )}
                                {!isManual && lineWatch?.description && (
                                  <p className="truncate text-xs text-muted-foreground italic">
                                    {lineWatch.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 text-center align-middle tabular-nums">
                            {qty.toFixed(3)}
                          </td>
                          <td className="px-2 text-center align-middle tabular-nums">
                            {price.toFixed(3)}
                          </td>
                          {hasAnyDiscount && (
                            <td className="px-2 text-center align-middle tabular-nums">
                              {discount > 0 ? `-${discount.toFixed(3)}` : "—"}
                            </td>
                          )}
                          <td className="px-2 text-center align-middle tabular-nums">
                            {lineWatch?.taxRateSnapshot ? (
                              <span>
                                {lineTax.toFixed(3)}
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({Number(lineWatch.taxRateSnapshot)}%)
                                </span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-2 text-center align-middle tabular-nums font-medium">
                            {(lineSubtotal - discount + lineTax).toFixed(3)}
                          </td>
                        </tr>
                      );
                    })}

                {((readonly && readonlyLines.length === 0) ||
                  (!readonly && fields.length === 0)) && (
                  <tr>
                    <td
                      colSpan={
                        hasAnyDiscount ? (readonly ? 7 : 8) : readonly ? 6 : 7
                      }
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      <Package className="mx-auto mb-2 h-8 w-8 opacity-30" />
                      {t("invoices.noLineItems")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ================= Totals ================= */}
        {((readonly && readonlyLines.length > 0) ||
          (!readonly && fields.length > 0)) && (
          <section className="flex justify-end px-6 pb-6 sm:px-8">
            <div className="w-full max-w-xs space-y-1.5 border-t pt-2 text-sm sm:w-72">
              <TotalsRow label={t("invoices.subtotal")}>
                {displayTotals?.subtotal.toFixed(3)}
              </TotalsRow>
              {(displayTotals?.discountTotal ?? 0) > 0 && (
                <TotalsRow
                  label={t("invoices.discount")}
                  className="text-destructive"
                >
                  -{displayTotals?.discountTotal.toFixed(3)}
                </TotalsRow>
              )}
              <TotalsRow label={t("invoices.tax")}>
                +{displayTotals?.taxTotal.toFixed(3)}
              </TotalsRow>
              {!readonly && (
                <TotalsRow label={t("invoices.cogs")}>
                  {totals?.costTotal.toFixed(3)}
                </TotalsRow>
              )}
              <div className="flex items-center justify-between gap-4 border-t pt-1.5 text-base font-bold">
                <span>{t("invoices.total")}</span>
                <div className="flex items-center gap-1.5">
                  {readonly ? (
                    <span className="text-xs font-semibold">
                      {invoice?.currency ?? "BHD"}
                    </span>
                  ) : (
                    <Select
                      value={watch?.("currency")}
                      onValueChange={(v) =>
                        setValue?.("currency", v as any, { shouldDirty: true })
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        aria-label={t("invoices.currency")}
                        className="h-6 gap-1 border-0 bg-transparent px-1 text-xs font-semibold shadow-none hover:bg-muted/40 focus-visible:ring-0"
                      >
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
                  )}
                  <span className="tabular-nums">
                    {displayTotals?.total.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= Terms ================= */}
        <section className="border-t px-6 py-5 sm:px-8">
          <PaperLabel>{t("invoices.termsAndConditions")}</PaperLabel>
          <div className="mt-2">
            {readonly ? (
              invoice?.termsText ? (
                <div
                  className="prose prose-sm max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: invoice.termsText }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )
            ) : (
              <RichtextEditor
                value={watch?.("termsText")}
                onChange={(html) =>
                  setValue?.("termsText", html, { shouldDirty: true })
                }
                placeholder={t("invoices.termsPlaceholder")}
                minHeight="90px"
              />
            )}
          </div>
        </section>
      </div>

      {/* Line edit / create dialog (edit mode only) */}
      {!readonly &&
        editingLineIndex !== null &&
        (() => {
          // Seed the dialog from the live watched line, not from `fields`.
          // `fields` is a mount-time snapshot that path-based `setValue` never
          // refreshes, so reusing it would reopen the dialog with pre-edit values.
          const existing = watch?.(`lines.${editingLineIndex}`) as
            | InvoiceFormController["lines"][number]
            | undefined;
          return (
            <InvoiceLineDialog
              open
              onOpenChange={(v) => {
                if (!v) setEditingLineIndex(null);
              }}
              index={editingLineIndex}
              otherExistingItemIds={otherLineItemIds}
              initial={
                existing
                  ? {
                      itemId: existing.itemId ?? null,
                      itemName: existing.itemName ?? null,
                      itemSku: existing.itemSku ?? null,
                      itemImage: existing.itemImage ?? null,
                      description: existing.description ?? null,
                      quantity: Number(existing.quantity) || 1,
                      unitPrice: Number(existing.unitPrice) || 0,
                      discountAmt: Number(existing.discountAmt) || 0,
                      purchasePrice: Number(existing.purchasePrice) || null,
                      taxRateId: existing.taxRateId ?? null,
                      taxRateSnapshot: Number(existing.taxRateSnapshot) || null,
                      taxRateName: existing.taxRateName ?? null,
                    }
                  : {
                      quantity: 1,
                      unitPrice: 0,
                      discountAmt: 0,
                      purchasePrice: 0,
                    }
              }
              onSave={onLineSave}
            />
          );
        })()}
    </div>
  );
}
