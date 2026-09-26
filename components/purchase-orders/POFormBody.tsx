"use client";

import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { POItemSelectDialog } from "@/components/dialogs/poItemSelectDialog";
import { POLineDialog } from "@/components/dialogs/poLineDialog";
import { SupplierSelectDialog } from "@/components/dialogs/supplierSelectDialog";
import {
  PAPER_THEME,
  PaperLabel,
  paperSheetClass,
  Thumb,
  TotalsRow,
} from "@/components/form/paper";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInputField } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { POFormController } from "@/lib/form/po/usePOFormController";
import { CURRENCIES, cn } from "@/lib/utils";

export function POFormBody({
  controller,
  serial,
}: {
  controller: POFormController;
  serial?: string | null;
}) {
  const t = useTranslations();
  const { form, fields, lines } = controller;
  const { watch, setValue, register, control } = form;

  const currency = watch("currency");

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
    controller.remove(index);
    setSelectedLineIndex((cur) =>
      cur === null ? null : cur === index ? null : cur > index ? cur - 1 : cur,
    );
  };

  // Derived from the live value, not the `fields` snapshot, so a line swapped
  // to a different item is excluded correctly.
  const existingItemIds = (lines ?? [])
    .map((l: any) => l?.itemId)
    .filter((id: any): id is string => !!id);

  const lineEditorExistingItemIds = (lines ?? [])
    .map((l: any) => l.itemId)
    .filter((id: any, i: number) => {
      if (!id) return false;
      if (!controller.editingLine) return true;
      return i !== controller.editingLine.index;
    });

  return (
    <div className="min-w-0">
      <div className={paperSheetClass} style={PAPER_THEME}>
        {/* ================= Letterhead ================= */}
        <header className="flex justify-end border-b px-6 py-6 sm:px-8">
          <div className="flex min-w-0 flex-col items-end text-right">
            <span className="text-2xl font-bold uppercase tracking-wide sm:text-3xl">
              {t("purchaseOrders.title")}
            </span>
            {serial && (
              <span className="mt-0.5 text-sm font-semibold text-muted-foreground">
                {serial}
              </span>
            )}
            <div className="mt-3 w-40">
              <PaperLabel>{t("purchaseOrders.orderDate")} *</PaperLabel>
              <DateInputField
                control={control}
                name="date"
                rules={{
                  required: t("errors.requiredField", {
                    field: t("purchaseOrders.orderDate"),
                  }),
                }}
                required
                showTodayButton
              />
            </div>
          </div>
        </header>

        {/* ================= Supplier / warehouse ================= */}
        <section className="grid gap-x-10 gap-y-5 border-b px-6 py-5 sm:px-8 md:grid-cols-2">
          <div className="min-w-0">
            <PaperLabel>{t("purchaseOrders.supplier")} *</PaperLabel>
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full justify-start text-left font-normal"
              onClick={() => controller.setSupplierPickerOpen(true)}
            >
              {watch("supplierId") ? (
                controller.suppliers.find(
                  (s: any) => s.id === watch("supplierId"),
                )?.name || t("purchaseOrders.selectSupplier")
              ) : (
                <span className="text-muted-foreground">
                  {t("purchaseOrders.selectSupplier")}
                </span>
              )}
            </Button>
          </div>
          <div className="min-w-0">
            <PaperLabel>{t("purchaseOrders.warehouse")} *</PaperLabel>
            <Select
              value={watch("warehouseId")}
              onValueChange={(v) =>
                setValue("warehouseId", v, { shouldDirty: true })
              }
            >
              <SelectTrigger className="w-full min-w-0">
                <SelectValue
                  placeholder={t("purchaseOrders.selectWarehouse")}
                />
              </SelectTrigger>
              <SelectContent className="max-w-[75vw]">
                {controller.warehouses.map((w: any) => (
                  <SelectItem key={w.id} value={w.id} className="min-w-0">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate">{w.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* ================= Line items ================= */}
        <section className="px-6 py-4 sm:px-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              className="inline-flex items-center justify-center gap-1.5 border-dashed py-2 text-sm font-medium"
              onClick={controller.handleAddManualLine}
              disabled={!watch("supplierId")}
              title={
                !watch("supplierId")
                  ? t("purchaseOrders.selectSupplierFirst")
                  : undefined
              }
            >
              <Plus className="h-4 w-4" />
              {t("purchaseOrders.addLine")}
            </Button>

            {activeSelection !== null && (
              <div className="flex items-center gap-2 animate-in fade-in-0 zoom-in-95 duration-150">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => controller.openLineEditor(activeSelection)}
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="w-10 py-2 pr-2 text-center font-semibold">
                    <span className="sr-only">{t("common.selectRow")}</span>
                  </th>
                  <th className="w-10 py-2 pr-2 text-center font-semibold">
                    #
                  </th>
                  <th className="py-2 pr-2 text-left font-semibold">
                    {t("purchaseOrders.item")}
                  </th>
                  <th className="w-24 px-2 text-center font-semibold">
                    {t("purchaseOrders.qty")}
                  </th>
                  <th className="w-28 px-2 text-center font-semibold">
                    {t("purchaseOrders.unitCost")}
                  </th>
                  <th className="w-28 px-2 text-center font-semibold">
                    {t("purchaseOrders.tax")}
                  </th>
                  <th className="w-32 px-2 text-center font-semibold">
                    {t("common.total")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const line = (lines ?? [])[index] as any;
                  const itemId = line?.itemId;
                  // Prefer the live catalogue entry; fall back to the name/sku/image
                  // snapshot carried on the line, so items excluded from the
                  // supplier-filtered query don't render as a raw id.
                  const item = itemId
                    ? ((controller.itemsMap[itemId] as any) ?? {
                        id: itemId,
                        name: line?.itemName,
                        sku: line?.itemSku,
                        image: line?.itemImage,
                      })
                    : undefined;
                  const isManual = !itemId;
                  const qty = Number(line?.quantity) || 0;
                  const cost = Number(line?.unitCost) || 0;
                  const taxRate = Number(line?.taxRateSnapshot) || 0;
                  const lineSubtotal = qty * cost;
                  const lineTax = lineSubtotal * (taxRate / 100);
                  const primaryLabel = isManual
                    ? line?.description || t("purchaseOrders.manualEntry")
                    : item?.name || "—";
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
                          aria-label={t("purchaseOrders.lineItemTitle", {
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
                            <p className="flex truncate items-center gap-1.5 text-sm font-medium">
                              <span className="truncate">{primaryLabel}</span>
                              {isManual && (
                                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                                  {t("purchaseOrders.manual")}
                                </span>
                              )}
                            </p>
                            {item?.sku && (
                              <p className="text-xs text-muted-foreground">
                                SKU: {item.sku}
                              </p>
                            )}
                            {!isManual && line?.description && (
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
                        {cost.toFixed(3)}
                      </td>
                      <td className="px-2 text-center align-middle tabular-nums">
                        {taxRate > 0 ? (
                          <span>
                            {lineTax.toFixed(3)}
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({taxRate}%)
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 text-center align-middle font-medium tabular-nums">
                        {(lineSubtotal + lineTax).toFixed(3)}
                      </td>
                    </tr>
                  );
                })}

                {fields.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      <Package className="mx-auto mb-2 h-8 w-8 opacity-30" />
                      {t("purchaseOrders.noLineItems")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ================= Totals ================= */}
        {fields.length > 0 && (
          <section className="flex justify-end px-6 pb-6 sm:px-8">
            <div className="w-full max-w-xs space-y-1.5 border-t pt-2 text-sm sm:w-72">
              <TotalsRow label={t("purchaseOrders.subtotal")}>
                {controller.subtotal.toFixed(3)}
              </TotalsRow>
              <TotalsRow label={t("purchaseOrders.vat")}>
                +{controller.vatTotal.toFixed(3)}
              </TotalsRow>
              <div className="flex items-center justify-between gap-4 border-t pt-1.5 text-base font-bold">
                <span>{t("common.total")}</span>
                <div className="flex items-center gap-1.5">
                  <Select
                    value={currency}
                    onValueChange={(v) =>
                      setValue("currency", v as any, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label={t("purchaseOrders.currency")}
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
                  <span className="tabular-nums">
                    {(controller.subtotal + controller.vatTotal).toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= Notes ================= */}
        <section className="border-t px-6 py-5 sm:px-8">
          <PaperLabel>{t("purchaseOrders.notes")}</PaperLabel>
          <Textarea
            id="notes"
            className="resize-none"
            rows={2}
            {...register("notes")}
          />
        </section>
      </div>

      <POItemSelectDialog
        open={controller.itemPickerOpen}
        onOpenChange={controller.setItemPickerOpen}
        items={controller.items}
        isLoading={controller.itemsLoading}
        existingItemIds={existingItemIds}
        onSelect={controller.handleItemsSelected}
      />

      <POLineDialog
        open={!!controller.editingLine}
        onOpenChange={(v) => !v && controller.setEditingLine(null)}
        index={controller.editingLine?.index ?? 0}
        initial={
          controller.editingLine?.data ?? {
            mode: "manual",
            quantity: 1,
            unitCost: 0,
          }
        }
        items={controller.items}
        itemsLoading={controller.itemsLoading}
        existingItemIds={lineEditorExistingItemIds}
        onSave={controller.handleLineSave}
      />

      <SupplierSelectDialog
        open={controller.supplierPickerOpen}
        onOpenChange={controller.setSupplierPickerOpen}
        suppliers={controller.suppliers}
        isLoading={false}
        onSelect={controller.onSupplierSelected}
      />

      <AlertDialog
        open={!!controller.pendingSupplierId}
        onOpenChange={(v) => !v && controller.cancelSupplierChange()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("purchaseOrders.changeSupplier")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("purchaseOrders.changeSupplierDesc", {
                count: fields.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={controller.cancelSupplierChange}>
              {t("purchaseOrders.changeSupplierCancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={controller.confirmSupplierChange}>
              {t("purchaseOrders.changeSupplierConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
