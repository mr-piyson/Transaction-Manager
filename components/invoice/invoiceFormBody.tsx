"use client";

import { Package, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { InvoiceLineDialog } from "@/components/dialogs/invoiceLineDialog";
import { RichtextEditor } from "@/components/richtext-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInputField } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
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
import { CURRENCIES } from "@/lib/utils";

function Thumb({
  item,
  isManual,
  className,
}: {
  item: any;
  isManual: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${className ?? ""} overflow-hidden rounded-md border bg-muted`}
    >
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

function ProfitRow({
  lineTotal,
  lineCogs,
  grossProfit,
  margin,
}: {
  lineTotal: number;
  lineCogs: number;
  grossProfit: number;
  margin: number;
}) {
  const t = useTranslations();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
      <span className="shrink-0">
        {t("invoices.revenue")}:{" "}
        <span className="font-medium text-foreground">
          {lineTotal.toFixed(3)}
        </span>
      </span>
      <span className="shrink-0">
        {t("invoices.cogs")}:{" "}
        <span className="font-medium text-foreground">
          {lineCogs.toFixed(3)}
        </span>
      </span>
      <span className={grossProfit >= 0 ? "text-green-600" : "text-red-600"}>
        {t("invoices.gp")}: {grossProfit.toFixed(3)} ({margin.toFixed(1)}%)
      </span>
    </div>
  );
}

export function InvoiceFormBody({
  controller,
}: {
  controller: InvoiceFormController;
}) {
  const t = useTranslations();
  const {
    form,
    fields,
    totals,
    editingLineIndex,
    setEditingLineIndex,
    customers,
    warehouses,
    itemsMap,
    onLineSave,
    remove,
  } = controller;
  const { register, setValue, watch, control } = form;

  const invoiceType = watch("type");
  const isWalkIn = watch("isWalkIn");
  const currency = watch("currency");

  const isInvoiceType = invoiceType === "INVOICE";
  const needsCustomer = !["DELIVERY_NOTE"].includes(invoiceType);
  const needsWarehouse = isInvoiceType;

  const invoiceTypeOptions = [
    { value: "INVOICE", label: t("invoices.invoice") },
    { value: "QUOTE", label: t("invoices.quote") },
    { value: "CREDIT_NOTE", label: t("invoices.creditNote") },
    { value: "DELIVERY_NOTE", label: t("invoices.deliveryNote") },
  ];

  return (
    <div className="min-w-0 space-y-4">
      {/* Type + Currency */}
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <Field>
          <Label htmlFor="type">{t("invoices.type")} *</Label>
          <Select
            value={watch("type")}
            onValueChange={(v) => setValue("type", v as any)}
          >
            <SelectTrigger>
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
        </Field>
        <Field>
          <Label htmlFor="currency">{t("invoices.currency")}</Label>
          <Select
            value={watch("currency")}
            onValueChange={(v) => setValue("currency", v as any)}
          >
            <SelectTrigger>
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
        </Field>
      </div>

      {/* Dates */}
      <Field>
        <Label htmlFor="date">{t("invoices.issueDate")} *</Label>
        <DateInputField
          control={control}
          name="date"
          rules={{ required: "Date is required" }}
          required
          showTodayButton
        />
      </Field>

      {/* Customer */}
      {needsCustomer && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Field>
                <Label htmlFor="customerId">
                  {isWalkIn
                    ? t("invoices.walkInCustomerName")
                    : t("invoices.customer")}
                </Label>
                {isWalkIn ? (
                  <Input
                    id="customerId"
                    placeholder={t("invoices.walkInCustomerPlaceholder")}
                    {...register("customerId")}
                  />
                ) : (
                  <Select
                    value={watch("customerId") || ""}
                    onValueChange={(v) => setValue("customerId", v)}
                  >
                    <SelectTrigger className="w-full min-w-0">
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
              </Field>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Checkbox
                id="isWalkIn"
                checked={isWalkIn}
                onCheckedChange={(checked) => {
                  setValue("isWalkIn", checked === true);
                  if (checked) setValue("customerId", "");
                }}
              />
              <Label
                htmlFor="isWalkIn"
                className="cursor-pointer text-sm font-normal"
              >
                {t("invoices.walkInCustomer")}
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse (for INVOICE type) */}
      {needsWarehouse && (
        <Field>
          <Label htmlFor="warehouseId">{t("invoices.warehouse")}</Label>
          <Select
            value={watch("warehouseId") || ""}
            onValueChange={(v) => setValue("warehouseId", v)}
          >
            <SelectTrigger className="w-full min-w-0">
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
        </Field>
      )}

      {/* Line Items */}
      <div className="min-w-0 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">
            {t("invoices.lineItems")} *
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditingLineIndex(fields.length)}
          >
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{t("invoices.addLine")}</span>
          </Button>
        </div>

        {fields.map((field, index) => {
          const isManual = !field.itemId;
          const item = itemsMap[field.itemId || ""] as any;
          const lineWatch = watch(`lines.${index}`);
          const qty = Number(lineWatch?.quantity) || 0;
          const price = Number(lineWatch?.unitPrice) || 0;
          const costBasis = Number(lineWatch?.purchasePrice) || 0;
          const discount = Number(lineWatch?.discountAmt) || 0;
          const lineSubtotal = qty * price;
          const lineTotal = lineSubtotal - discount;
          const lineTax = lineWatch?.taxRateSnapshot
            ? lineTotal * (Number(lineWatch.taxRateSnapshot) / 100)
            : 0;
          const lineCogs = qty * costBasis;
          const grossProfit = lineTotal - lineCogs;
          const margin = lineTotal > 0 ? (grossProfit / lineTotal) * 100 : 0;

          return (
            <div
              key={field.id}
              className="min-w-0 space-y-2 rounded-lg border bg-muted/20 p-3 sm:p-3.5"
            >
              {/* ===== MOBILE (stacked) ===== */}
              <div className="flex flex-col gap-2 sm:hidden">
                <div className="flex items-center gap-2.5">
                  <Thumb
                    item={item}
                    isManual={isManual}
                    className="size-9 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="min-w-0 truncate text-sm font-medium leading-snug"
                      title={
                        isManual
                          ? lineWatch?.description || t("invoices.manualEntry")
                          : item?.name || field.itemId
                      }
                    >
                      {isManual
                        ? lineWatch?.description || t("invoices.manualEntry")
                        : item?.name || field.itemId}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {qty} × {price.toFixed(3)}
                      {discount > 0 && (
                        <span className="ml-1 text-destructive">
                          (-{discount.toFixed(3)})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setEditingLineIndex(index)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">
                    {t("common.total")}
                  </span>
                  <span className="font-semibold">
                    {(lineTotal + lineTax).toFixed(3)}
                  </span>
                </div>

                {lineTotal > 0 && (
                  <ProfitRow
                    lineTotal={lineTotal}
                    lineCogs={lineCogs}
                    grossProfit={grossProfit}
                    margin={margin}
                  />
                )}
              </div>

              {/* ===== DESKTOP (inline) ===== */}
              <div className="hidden sm:flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Thumb
                      item={item}
                      isManual={isManual}
                      className="size-8 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="min-w-0 truncate text-sm font-medium"
                        title={
                          isManual
                            ? lineWatch?.description ||
                              t("invoices.manualEntry")
                            : item?.name || field.itemId
                        }
                      >
                        {isManual
                          ? lineWatch?.description || t("invoices.manualEntry")
                          : item?.name || field.itemId}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {qty} × {price.toFixed(3)}
                        {discount > 0 && (
                          <span className="ml-1 text-destructive">
                            (-{discount.toFixed(3)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <p className="text-right text-sm font-semibold">
                      {(lineTotal + lineTax).toFixed(3)}
                    </p>
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditingLineIndex(index)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>

                {lineTotal > 0 && (
                  <ProfitRow
                    lineTotal={lineTotal}
                    lineCogs={lineCogs}
                    grossProfit={grossProfit}
                    margin={margin}
                  />
                )}
              </div>
            </div>
          );
        })}

        {fields.length === 0 && (
          <div className="space-y-2 border py-8 text-center text-sm text-muted-foreground">
            <Package className="mx-auto h-8 w-8 opacity-30" />
            <p>{t("invoices.noLineItems")}</p>
            <div className="flex justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditingLineIndex(fields.length)}
              >
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">
                  {t("invoices.addLine")}
                </span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Totals */}
      {fields.length > 0 && (
        <div className="flex justify-end border-t pt-3">
          <div className="min-w-60 space-y-1 text-right">
            <div className="flex justify-between gap-8 text-sm">
              <span className="text-muted-foreground">
                {t("invoices.subtotal")}
              </span>
              <span className="font-medium">
                {totals.subtotal.toFixed(3)} {currency}
              </span>
            </div>
            <div className="flex justify-between gap-8 text-sm">
              <span className="text-muted-foreground">
                {t("invoices.discount")}
              </span>
              <span className="font-medium text-destructive">
                -{totals.discountTotal.toFixed(3)} {currency}
              </span>
            </div>
            <div className="flex justify-between gap-8 text-sm">
              <span className="text-muted-foreground">{t("invoices.tax")}</span>
              <span className="font-medium">
                +{totals.taxTotal.toFixed(3)} {currency}
              </span>
            </div>
            <div className="flex justify-between gap-8 text-sm">
              <span className="text-muted-foreground">
                {t("invoices.cogs")}
              </span>
              <span className="font-medium">
                {totals.costTotal.toFixed(3)} {currency}
              </span>
            </div>
            <div className="flex justify-between gap-8 text-sm border-t pt-1">
              <span>{t("invoices.grossProfit")}</span>
              <span
                className={
                  totals.total - totals.costTotal >= 0
                    ? "font-medium text-green-600"
                    : "font-medium text-red-600"
                }
              >
                {(totals.total - totals.costTotal).toFixed(3)} {currency}
                {totals.total > 0 && (
                  <span className="ms-1 text-xs">
                    (
                    {(
                      ((totals.total - totals.costTotal) / totals.total) *
                      100
                    ).toFixed(1)}
                    %)
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between gap-8 border-t pt-1 text-base font-bold">
              <span>{t("invoices.total")}</span>
              <span>
                {totals.total.toFixed(3)} {currency}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Terms */}
      <Field>
        <Label htmlFor="termsText">{t("invoices.termsAndConditions")}</Label>
        <RichtextEditor
          value={watch("termsText")}
          onChange={(html) => setValue("termsText", html)}
          placeholder={t("invoices.termsPlaceholder")}
          minHeight="100px"
        />
      </Field>

      {/* Line edit / create dialog */}
      {editingLineIndex !== null && (
        <InvoiceLineDialog
          open={editingLineIndex !== null}
          onOpenChange={(v) => {
            if (!v) setEditingLineIndex(null);
          }}
          index={editingLineIndex}
          initial={
            editingLineIndex < fields.length
              ? {
                  itemId: fields[editingLineIndex]?.itemId ?? null,
                  description: fields[editingLineIndex]?.description ?? null,
                  quantity: Number(fields[editingLineIndex]?.quantity) || 1,
                  unitPrice: Number(fields[editingLineIndex]?.unitPrice) || 0,
                  discountAmt:
                    Number(fields[editingLineIndex]?.discountAmt) || 0,
                  purchasePrice:
                    Number(fields[editingLineIndex]?.purchasePrice) || null,
                  taxRateId: fields[editingLineIndex]?.taxRateId ?? null,
                  taxRateSnapshot:
                    Number(fields[editingLineIndex]?.taxRateSnapshot) || null,
                  taxRateName: fields[editingLineIndex]?.taxRateName ?? null,
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
      )}
    </div>
  );
}
