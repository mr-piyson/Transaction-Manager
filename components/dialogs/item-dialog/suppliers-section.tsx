"use client";

import { Plus, Trash2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { ANCHORS, type UseItemFormReturn } from "./use-item-form";

interface SuppliersSectionProps {
  form: UseItemFormReturn;
  canManage: boolean;
  onNewSupplier: () => void;
}

export function SuppliersSection({
  form,
  canManage,
  onNewSupplier,
}: SuppliersSectionProps) {
  const {
    mode,
    suppliers,
    supplierDrafts,
    money,
    addSupplierDraft,
    removeSupplierDraft,
    updateSupplierDraft,
    supplierCurrency,
    supplierUnitOptions,
    addSupplierPrice,
    removeSupplierPrice,
    updateSupplierPrice,
  } = form;

  return (
    <section
      id="sec-suppliers"
      data-section="suppliers"
      className="scroll-mt-4 space-y-5 py-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium">Suppliers</h3>
          <p className="text-sm text-muted-foreground">
            {mode === "add-supplier" || mode === "existing"
              ? "Prices already on file are listed. Add a new one below."
              : "Who sells it and at what price. Set a price for each unit you buy in."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!canManage}
            onClick={addSupplierDraft}
          >
            <Plus className="size-4" />
            Add price
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canManage}
            onClick={onNewSupplier}
          >
            <UserPlus className="size-4" />
            New supplier
          </Button>
        </div>
      </div>

      {(mode === "add-supplier" || mode === "existing") &&
        (form.existingMaster ?? form.editingItem) && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3.5 py-3 text-sm">
            <b className="font-semibold">
              {(form.existingMaster ?? form.editingItem).name}
            </b>
            <span className="font-mono text-xs text-muted-foreground">
              {(form.existingMaster ?? form.editingItem).sku}
            </span>
            <span className="text-xs text-muted-foreground">
              Counted in {(form.existingMaster ?? form.editingItem).unit}
            </span>
          </div>
        )}

      {supplierDrafts.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          <b className="block">No supplier prices yet</b>
          <span className="text-muted-foreground">
            Add the first one to see your best cost and margin.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {supplierDrafts.map((draft, index) => {
            const usedElsewhere = new Set(
              supplierDrafts
                .filter((d) => d.tempId !== draft.tempId && d.supplierId)
                .map((d) => d.supplierId),
            );
            const currency = supplierCurrency(draft);
            const isBest =
              money.pricedCount > 1 &&
              !!draft.supplierId &&
              draft.supplierId === money.bestCostSupplierId;
            const rowError = form.errorFor(ANCHORS.supplierRow(draft.tempId));

            return (
              <div
                key={draft.tempId}
                id={ANCHORS.supplierRow(draft.tempId)}
                className={cn(
                  "space-y-3 rounded-lg border p-3.5",
                  rowError && "border-destructive",
                )}
              >
                <div className="flex items-center gap-2">
                  <Select
                    items={suppliers.map((s: any) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    value={draft.supplierId}
                    disabled={!canManage}
                    onValueChange={(v) =>
                      updateSupplierDraft(draft.tempId, {
                        supplierId: v ?? undefined,
                      })
                    }
                  >
                    <SelectTrigger className="flex-1 font-medium">
                      <SelectValue placeholder="Choose supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s: any) => (
                        <SelectItem
                          key={s.id}
                          value={s.id}
                          disabled={usedElsewhere.has(s.id)}
                        >
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isBest && <Badge variant="secondary">Best price</Badge>}
                  {currency !== money.baseCurrency && (
                    <Badge variant="outline">{currency}</Badge>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={!canManage}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeSupplierDraft(draft.tempId)}
                    aria-label={`Remove supplier price ${index + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <Field>
                  <Label className="text-xs">Supplier SKU</Label>
                  <Input
                    className="font-mono"
                    placeholder="Their code"
                    value={draft.supplierSku ?? ""}
                    disabled={!canManage}
                    onChange={(e) =>
                      updateSupplierDraft(draft.tempId, {
                        supplierSku: e.target.value || undefined,
                      })
                    }
                  />
                </Field>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs">Prices per unit</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={
                        !canManage ||
                        draft.prices.length >= supplierUnitOptions.length
                      }
                      onClick={() => addSupplierPrice(draft.tempId)}
                    >
                      <Plus className="size-3.5" />
                      Add unit price
                    </Button>
                  </div>

                  {draft.prices.length === 0 ? (
                    <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                      No prices yet. Add one per unit this supplier sells it in.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {draft.prices.map((row) => {
                        const otherUnits = new Set(
                          draft.prices
                            .filter((p) => p.unitId !== row.unitId)
                            .map((p) => p.unitId),
                        );
                        return (
                          <div
                            key={row.unitId}
                            className="flex items-center gap-2"
                          >
                            <Select
                              items={supplierUnitOptions.map((u) => ({
                                value: u.unitId,
                                label: u.code,
                              }))}
                              value={row.unitId}
                              disabled={!canManage}
                              onValueChange={(v) =>
                                updateSupplierDraft(draft.tempId, {
                                  prices: draft.prices.map((p) =>
                                    p.unitId === row.unitId
                                      ? { ...p, unitId: v ?? "" }
                                      : p,
                                  ),
                                })
                              }
                            >
                              <SelectTrigger className="h-9 flex-1">
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {supplierUnitOptions.map((u) => (
                                  <SelectItem
                                    key={u.unitId}
                                    value={u.unitId}
                                    disabled={otherUnits.has(u.unitId)}
                                  >
                                    {u.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex">
                              <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-2.5 font-mono text-xs text-muted-foreground">
                                {currency}
                              </span>
                              <Input
                                type="number"
                                min={0}
                                step="0.001"
                                placeholder="0.000"
                                className="w-28 rounded-l-none font-mono"
                                value={row.price}
                                disabled={!canManage}
                                onChange={(e) =>
                                  updateSupplierPrice(
                                    draft.tempId,
                                    row.unitId,
                                    Number(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={!canManage}
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                removeSupplierPrice(draft.tempId, row.unitId)
                              }
                              aria-label="Remove unit price"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {rowError && (
                  <p className="text-sm text-destructive">{rowError}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
