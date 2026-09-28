"use client";

import { Loader2, Lock, Plus, Trash2, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";

interface UomSectionProps {
  /** Form mode — the manager only works once the item exists (edit mode). */
  mode: "create" | "edit" | "existing" | "add-supplier";
  editItemId?: string | null;
  /** Base unit code for previews ("1 BOX = 6 EA"). */
  baseUnitCode?: string | null;
}

interface AddDraft {
  unitId: string;
  factor: string;
  isPurchaseDefault: boolean;
  isSalesDefault: boolean;
  barcode: string;
}

const emptyDraft: AddDraft = {
  unitId: "",
  factor: "1",
  isPurchaseDefault: false,
  isSalesDefault: false,
  barcode: "",
};

/**
 * "Units of measure" section of the item form: the Base Unit plus a table of
 * alternative per-item conversions managed through items.addUom/updateUom/
 * removeUom. Conversion factors lock automatically once the item has stock
 * movements or document lines (enforced server-side).
 */
export function UomSection({
  mode,
  editItemId,
  baseUnitCode,
}: UomSectionProps) {
  const utils = trpc.useUtils();
  const isEnabled = mode === "edit" && !!editItemId;

  const { data: item, isLoading } = trpc.items.byId.useQuery(
    { id: editItemId!, withStock: false },
    { enabled: isEnabled },
  );
  const { data: unitsData } = trpc.units.list.useQuery();

  const [draft, setDraft] = React.useState<AddDraft>(emptyDraft);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editDraft, setEditDraft] = React.useState({
    factor: "",
    isPurchaseDefault: false,
    isSalesDefault: false,
    barcode: "",
  });

  const invalidate = () => {
    if (editItemId) utils.items.byId.invalidate({ id: editItemId });
    utils.items.list.invalidate();
  };

  const addMutation = trpc.items.addUom.useMutation({
    onSuccess() {
      toast.success("Unit added");
      setDraft(emptyDraft);
      invalidate();
    },
    onError(err) {
      toast.error(err.message);
    },
  });
  const updateMutation = trpc.items.updateUom.useMutation({
    onSuccess() {
      toast.success("Unit updated");
      setEditingId(null);
      invalidate();
    },
    onError(err) {
      toast.error(err.message);
    },
  });
  const removeMutation = trpc.items.removeUom.useMutation({
    onSuccess() {
      toast.success("Unit removed");
      invalidate();
    },
    onError(err) {
      toast.error(err.message);
    },
  });

  const baseUnitId = item?.unitId ?? null;
  const baseCode = baseUnitCode ?? item?.unitRef?.code ?? "";
  const usage =
    (item?._count?.invoiceLines ?? 0) +
      (item?._count?.purchaseLines ?? 0) +
      (item?._count?.stockMovements ?? 0) || 0;
  const factorLocked = usage > 0;

  const uoms: any[] = (item?.itemUoms ?? []).filter(
    (u: any) => u.unitId !== baseUnitId,
  );
  const usedUnitIds = new Set(uoms.map((u: any) => u.unitId));
  const units: any[] = (unitsData ?? []).filter(
    (u: any) =>
      u.isActive &&
      !u.deletedAt &&
      u.id !== baseUnitId &&
      !usedUnitIds.has(u.id),
  );

  const startEdit = (uom: any) => {
    setEditingId(uom.id);
    setEditDraft({
      factor: String(uom.factor),
      isPurchaseDefault: !!uom.isPurchaseDefault,
      isSalesDefault: !!uom.isSalesDefault,
      barcode: uom.barcode ?? "",
    });
  };

  const submitAdd = () => {
    if (!editItemId || !draft.unitId) return;
    const factor = Number(draft.factor);
    if (!Number.isFinite(factor) || factor <= 0) {
      toast.error("Factor must be a number greater than 0");
      return;
    }
    addMutation.mutate({
      itemId: editItemId,
      unitId: draft.unitId,
      factor,
      isPurchaseDefault: draft.isPurchaseDefault,
      isSalesDefault: draft.isSalesDefault,
      barcode: draft.barcode || undefined,
    });
  };

  const submitEdit = (uom: any) => {
    const factor = Number(editDraft.factor);
    if (!Number.isFinite(factor) || factor <= 0) {
      toast.error("Factor must be a number greater than 0");
      return;
    }
    updateMutation.mutate({
      id: uom.id,
      factor,
      isPurchaseDefault: editDraft.isPurchaseDefault,
      isSalesDefault: editDraft.isSalesDefault,
      barcode: editDraft.barcode || null,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Units of measure</h3>
          {factorLocked && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Lock className="size-3" /> Factors locked
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {usage > 0
            ? "This item has stock history — factors can no longer change."
            : "1 base unit = 1 × itself"}
        </span>
      </div>

      {/* Base unit row */}
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="text-[10px]">
            BASE
          </Badge>
          <span className="font-medium">{baseCode || "—"}</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">×1</span>
      </div>

      {mode !== "edit" ? (
        <p className="text-xs text-muted-foreground">
          Save the item first, then add alternative units (e.g. Box, Roll) for
          purchasing and sales.
        </p>
      ) : isLoading ? (
        <p className="text-xs text-muted-foreground">Loading units…</p>
      ) : (
        <>
          {/* Alternative unit rows */}
          {uoms.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No alternative units yet.
            </p>
          )}
          <div className="space-y-2">
            {uoms.map((uom: any) => {
              const isEditing = editingId === uom.id;
              const inactive = !uom.isActive;
              return (
                <div
                  key={uom.id}
                  className={`rounded-lg border px-3 py-2 ${inactive ? "opacity-60" : ""}`}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Factor</Label>
                          <Input
                            type="number"
                            min={0.000001}
                            step="any"
                            value={editDraft.factor}
                            disabled={factorLocked}
                            onChange={(e) =>
                              setEditDraft((d) => ({
                                ...d,
                                factor: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Barcode</Label>
                          <Input
                            value={editDraft.barcode}
                            onChange={(e) =>
                              setEditDraft((d) => ({
                                ...d,
                                barcode: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-2 text-xs">
                          <Checkbox
                            aria-label="Purchase default"
                            checked={editDraft.isPurchaseDefault}
                            onCheckedChange={(v) =>
                              setEditDraft((d) => ({
                                ...d,
                                isPurchaseDefault: v === true,
                              }))
                            }
                          />
                          Purchase default
                        </span>
                        <span className="flex items-center gap-2 text-xs">
                          <Checkbox
                            aria-label="Sales default"
                            checked={editDraft.isSalesDefault}
                            onCheckedChange={(v) =>
                              setEditDraft((d) => ({
                                ...d,
                                isSalesDefault: v === true,
                              }))
                            }
                          />
                          Sales default
                        </span>
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="size-3 mr-1" /> Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={updateMutation.isPending}
                          onClick={() => submitEdit(uom)}
                        >
                          {updateMutation.isPending && (
                            <Loader2 className="size-3 mr-1 animate-spin" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">
                          {uom.unit?.code ?? uom.unitId}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          1 {uom.unit?.code ?? ""} = {String(uom.factor)}{" "}
                          {baseCode}
                        </span>
                        {uom.isPurchaseDefault && (
                          <Badge className="text-[10px]">Purchase ★</Badge>
                        )}
                        {uom.isSalesDefault && (
                          <Badge variant="outline" className="text-[10px]">
                            Sales ★
                          </Badge>
                        )}
                        {inactive && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-muted-foreground"
                          >
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => startEdit(uom)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          disabled={removeMutation.isPending}
                          onClick={() => removeMutation.mutate({ id: uom.id })}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add row */}
          <div className="rounded-lg border border-dashed p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Unit</Label>
                <Select
                  value={draft.unitId}
                  onValueChange={(v) => setDraft((d) => ({ ...d, unitId: v }))}
                >
                  <SelectTrigger className="h-8 w-full min-0">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[75vw]">
                    {units.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.code} — {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Factor (base per unit)</Label>
                <Input
                  type="number"
                  min={0.000001}
                  step="any"
                  className="h-8"
                  value={draft.factor}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, factor: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-2 text-xs">
                  <Checkbox
                    aria-label="Purchase default"
                    checked={draft.isPurchaseDefault}
                    onCheckedChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        isPurchaseDefault: v === true,
                      }))
                    }
                  />
                  Purchase default
                </span>
                <span className="flex items-center gap-2 text-xs">
                  <Checkbox
                    aria-label="Sales default"
                    checked={draft.isSalesDefault}
                    onCheckedChange={(v) =>
                      setDraft((d) => ({ ...d, isSalesDefault: v === true }))
                    }
                  />
                  Sales default
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={
                  addMutation.isPending || !draft.unitId || units.length === 0
                }
                onClick={submitAdd}
              >
                {addMutation.isPending ? (
                  <Loader2 className="size-3 mr-1 animate-spin" />
                ) : (
                  <Plus className="size-3 mr-1" />
                )}
                Add unit
              </Button>
            </div>
            {units.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                All available units are already configured for this item.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
