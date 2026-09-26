"use client";

import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { POItemSelectDialog } from "@/components/dialogs/poItemSelectDialog";
import { POLineDialog } from "@/components/dialogs/poLineDialog";
import { SupplierSelectDialog } from "@/components/dialogs/supplierSelectDialog";
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
import { DateInputField } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { POFormController } from "@/lib/form/po/usePOFormController";
import { CURRENCIES } from "@/lib/utils";

export function POFormBody({ controller }: { controller: POFormController }) {
  const t = useTranslations();
  const { form, fields, lines } = controller;
  const { watch, setValue, register, control } = form;

  const currency = watch("currency");

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
    <>
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
        <div className="sm:col-span-4">
          <Field>
            <Label htmlFor="date">{t("purchaseOrders.orderDate")} *</Label>
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
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field>
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={watch("currency")}
              onValueChange={(v) =>
                setValue("currency", v as any, { shouldDirty: true })
              }
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
        <div className="sm:col-span-3">
          <Field>
            <Label htmlFor="supplierId">{t("purchaseOrders.supplier")} *</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start text-left font-normal h-9"
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
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field>
            <Label htmlFor="warehouseId">
              {t("purchaseOrders.warehouse")} *
            </Label>
            <Select
              value={watch("warehouseId")}
              onValueChange={(v) =>
                setValue("warehouseId", v, { shouldDirty: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {controller.warehouses.map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      {/* Lines */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-base font-semibold">
            {t("purchaseOrders.lineItems")} *
          </Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={controller.handleAddManualLine}
              disabled={!watch("supplierId")}
              title={
                !watch("supplierId")
                  ? t("purchaseOrders.selectSupplierFirst")
                  : undefined
              }
            >
              <Plus className="h-4 w-4 mr-1" /> {t("purchaseOrders.addLine")}
            </Button>
          </div>
        </div>

        {fields.map((field, index) => {
          const line = (lines ?? [])[index] as any;
          const itemId = line?.itemId;
          // Prefer the live catalogue entry; fall back to the name/sku/image
          // snapshot carried on the line, so items excluded from the
          // supplier-filtered query don't render as "Manual entry".
          const item = itemId
            ? ((controller.itemsMap[itemId] as any) ?? {
                id: itemId,
                name: line?.itemName,
                sku: line?.itemSku,
                image: line?.itemImage,
              })
            : undefined;
          const isManual = !itemId;
          const itemLabel = item?.name
            ? item.sku
              ? `${item.sku} — ${item.name}`
              : item.name
            : line?.description || "Manual entry";
          const qty = Number(line?.quantity) || 0;
          const cost = Number(line?.unitCost) || 0;
          const lineSubtotal = qty * cost;
          const lineVat =
            lineSubtotal * ((Number(line?.taxRateSnapshot) || 0) / 100);
          return (
            <div
              key={field.id}
              className="border rounded-lg p-2.5 sm:p-3 bg-muted/20 flex items-center gap-3"
            >
              {item?.image ? (
                <div className="size-9 sm:size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="size-full object-cover"
                  />
                </div>
              ) : (
                <div className="size-9 sm:size-10 shrink-0 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                  <Package className="size-4 text-muted-foreground/40" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">
                    {itemLabel}
                  </span>
                  {isManual && (
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase">
                      Manual
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {qty} × {cost.toFixed(3)}
                  {Number(line?.taxRateSnapshot) > 0 && (
                    <span className="ml-1">
                      · VAT {Number(line?.taxRateSnapshot)}%
                    </span>
                  )}{" "}
                  ={" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {(lineSubtotal + lineVat).toFixed(3)}
                  </span>{" "}
                  {currency}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => controller.openLineEditor(index)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" /> {t("common.edit")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => controller.remove(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        })}

        {fields.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8 space-y-2">
            <Package className="h-8 w-8 mx-auto opacity-30" />
            <p>{t("purchaseOrders.noLineItems")}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={controller.handleAddManualLine}
              disabled={!watch("supplierId")}
              title={
                !watch("supplierId")
                  ? t("purchaseOrders.selectSupplierFirst")
                  : undefined
              }
            >
              {t("purchaseOrders.addLine")}
            </Button>
          </div>
        )}
      </div>

      {/* Totals */}
      {fields.length > 0 && (
        <div className="border-t pt-3">
          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">
                  {controller.subtotal.toFixed(3)} {currency}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT</span>
                <span className="font-medium tabular-nums">
                  {controller.vatTotal.toFixed(3)} {currency}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-1">
                <span>Total</span>
                <span className="tabular-nums">
                  {(controller.subtotal + controller.vatTotal).toFixed(3)}{" "}
                  {currency}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <Field>
        <Label htmlFor="notes">{t("purchaseOrders.notes")}</Label>
        <Textarea
          id="notes"
          className="resize-none"
          rows={2}
          {...register("notes")}
        />
      </Field>

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
    </>
  );
}
