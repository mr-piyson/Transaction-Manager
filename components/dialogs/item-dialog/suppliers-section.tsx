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
    master,
    suppliers,
    supplierDrafts,
    money,
    addSupplierDraft,
    removeSupplierDraft,
    updateSupplierDraft,
    supplierCurrency,
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
              : "Who sells it and at what price. Prices are per base unit."}
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
                    value={draft.supplierId}
                    disabled={!canManage}
                    onValueChange={(v) =>
                      updateSupplierDraft(draft.tempId, { supplierId: v })
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

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

                  <Field>
                    <Label className="text-xs">Price per {master.unit}</Label>
                    <div className="flex">
                      <span className="flex items-center rounded-l-md border border-r-0 bg-muted px-2.5 font-mono text-xs text-muted-foreground">
                        {currency}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step="0.001"
                        placeholder="0.000"
                        className="rounded-l-none font-mono"
                        value={draft.basePrice}
                        disabled={!canManage}
                        onChange={(e) =>
                          updateSupplierDraft(draft.tempId, {
                            basePrice: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </Field>

                  <Field>
                    <Label className="text-xs">Lead time</Label>
                    <div className="flex">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        className="rounded-r-none"
                        value={draft.leadTimeDays ?? ""}
                        disabled={!canManage}
                        onChange={(e) =>
                          updateSupplierDraft(draft.tempId, {
                            leadTimeDays: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                      />
                      <span className="flex items-center rounded-r-md border border-l-0 bg-muted px-2.5 text-xs text-muted-foreground">
                        days
                      </span>
                    </div>
                  </Field>

                  <Field>
                    <Label className="text-xs">Min order qty</Label>
                    <Input
                      type="number"
                      min={1}
                      step="any"
                      value={draft.minOrderQty}
                      disabled={!canManage}
                      onChange={(e) =>
                        updateSupplierDraft(draft.tempId, {
                          minOrderQty: Number(e.target.value) || 1,
                        })
                      }
                    />
                  </Field>
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
