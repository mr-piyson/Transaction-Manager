"use client";

import { Lock, Plus, Trash2 } from "lucide-react";
import * as React from "react";
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

interface UnitsSectionProps {
  form: UseItemFormReturn;
  canManage: boolean;
}

export function UnitsSection({ form, canManage }: UnitsSectionProps) {
  const {
    master,
    units,
    uomDrafts,
    uomFactorLocked,
    setMasterField,
    setBaseUnit,
    addUomDraft,
    removeUomDraft,
    updateUomDraft,
    setDefaultUnit,
  } = form;

  const [addUnitId, setAddUnitId] = React.useState("");
  const [addFactor, setAddFactor] = React.useState("");
  const [pendingBaseId, setPendingBaseId] = React.useState("");
  const [pendingBaseFactor, setPendingBaseFactor] = React.useState("");

  const locked = uomFactorLocked || !canManage;
  const isProduct = master.type === "PRODUCT";

  const activeUnits = React.useMemo(
    () => units.filter((u: any) => u.isActive && !u.deletedAt),
    [units],
  );
  const usedUnitIds = new Set(uomDrafts.map((d) => d.unitId));
  const availableUnits = activeUnits.filter((u: any) => !usedUnitIds.has(u.id));

  const baseUnitId = master.unitId ?? "";
  const unitListForDefaults = uomDrafts.length
    ? uomDrafts
    : baseUnitId
      ? [{ tempId: "base", unitId: baseUnitId, unitCode: master.unit }]
      : [];

  const purchaseUnitId =
    uomDrafts.find((d) => d.isPurchaseDefault)?.unitId ?? baseUnitId;
  const salesUnitId =
    uomDrafts.find((d) => d.isSalesDefault)?.unitId ?? baseUnitId;

  const pendingBaseUnit = activeUnits.find(
    (u: any) => u.id === pendingBaseId,
  ) as { id: string; code: string; name: string } | undefined;

  // Promote a ladder unit directly, or — for a unit that isn't part of the
  // ladder yet — ask how many current base units it holds, then add + promote.
  const handleBaseSelect = (unitId: string) => {
    if (!unitId || unitId === baseUnitId) return;
    if (uomDrafts.some((d) => d.unitId === unitId)) {
      setBaseUnit(unitId);
      setPendingBaseId("");
      return;
    }
    setPendingBaseId(unitId);
    setPendingBaseFactor("");
  };

  const confirmPendingBase = () => {
    const factor = Number(pendingBaseFactor);
    if (!pendingBaseUnit || !(factor > 0)) return;
    setBaseUnit(pendingBaseUnit.id, {
      code: pendingBaseUnit.code,
      factor,
    });
    setPendingBaseId("");
    setPendingBaseFactor("");
  };

  // ── Service: a single invoice unit ──────────────────────────────────────
  if (!isProduct) {
    return (
      <section
        id="sec-units"
        data-section="units"
        className="scroll-mt-4 space-y-5 border-b py-6"
      >
        <div>
          <h3 className="text-lg font-medium">Units and stock</h3>
          <p className="text-sm text-muted-foreground">
            Services are not stocked, so there is nothing to convert or reorder.
          </p>
        </div>
        <Field id={ANCHORS.unit} className="max-w-xs">
          <Label htmlFor={ANCHORS.unit}>Unit on invoices</Label>
          <Select
            items={activeUnits.map((u: any) => ({
              value: u.id,
              label: `${u.code} — ${u.name}`,
            }))}
            value={master.unitId ?? ""}
            disabled={locked}
            onValueChange={(val) => {
              const unit = activeUnits.find((u: any) => u.id === val);
              if (!unit) return;
              setMasterField("unitId", unit.id);
              setMasterField("unit", unit.code);
            }}
          >
            <SelectTrigger id={ANCHORS.unit}>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {activeUnits.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.code} — {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </section>
    );
  }

  return (
    <section
      id="sec-units"
      data-section="units"
      className="scroll-mt-4 space-y-5 border-b py-6"
    >
      <div>
        <h3 className="text-lg font-medium">Units and stock</h3>
        <p className="text-sm text-muted-foreground">
          How you count it, how you buy it, and when to reorder.
        </p>
      </div>

      {uomFactorLocked && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-700 dark:text-amber-400">
          <Lock className="mt-0.5 size-4 shrink-0" />
          <div>
            <b>Base unit and factors are locked.</b> {form.usageCount} stock
            movements and document lines use this setup. To correct a factor,
            remove the unit and add a replacement.
          </div>
        </div>
      )}

      {/* Chip ladder */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border bg-muted/40 px-3.5 py-3">
        {[
          { code: master.unit || "—", factor: 1 },
          ...uomDrafts
            .filter((d) => d.unitId !== baseUnitId)
            .map((d) => ({ code: d.unitCode, factor: d.factor }))
            .sort((a, b) => a.factor - b.factor),
        ].map((chip, index) => (
          <React.Fragment key={`${chip.code}-${index}`}>
            {index > 0 && <span className="text-muted-foreground">→</span>}
            <span
              className={cn(
                "rounded border bg-background px-2.5 py-0.5 font-mono text-xs",
                index === 0 && "border-primary text-primary",
              )}
            >
              {chip.code}
            </span>
          </React.Fragment>
        ))}
        <p className="w-full text-sm text-muted-foreground">
          Stock is counted in{" "}
          <b className="font-semibold text-foreground">{master.unit || "—"}</b>.
        </p>
      </div>

      <div className="space-y-2.5">
        {/* Base row */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-primary/35 bg-primary/5 px-3.5 py-2.5">
            <Field className="min-w-[200px] flex-1">
              <Label htmlFor="item-field-base" className="text-xs">
                Base (stock) unit
              </Label>
              <Select
                items={activeUnits.map((u: any) => ({
                  value: u.id,
                  label: `${u.code} — ${u.name}`,
                }))}
                value={baseUnitId}
                disabled={locked}
                onValueChange={(v) => handleBaseSelect(v ?? "")}
              >
                <SelectTrigger id="item-field-base" className="h-8">
                  <SelectValue placeholder="Select base unit" />
                </SelectTrigger>
                <SelectContent>
                  {activeUnits.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.code} — {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Badge variant="secondary" className="mb-1">
              BASE
            </Badge>
            <span className="mb-1.5 font-mono text-xs text-muted-foreground">
              stock unit, factor 1
            </span>
          </div>

          {pendingBaseUnit && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/35 bg-primary/5 px-3.5 py-2.5 text-sm">
              <span className="font-mono">1 {pendingBaseUnit.code} =</span>
              <Input
                type="number"
                min={0}
                step="any"
                autoFocus
                aria-label={`How many ${master.unit || "base units"} one ${pendingBaseUnit.code} holds`}
                className="h-8 w-24"
                value={pendingBaseFactor}
                onChange={(e) => setPendingBaseFactor(e.target.value)}
              />
              <span className="font-mono">{master.unit || "—"}</span>
              <Button
                type="button"
                size="sm"
                disabled={!(Number(pendingBaseFactor) > 0)}
                onClick={confirmPendingBase}
              >
                Make base
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setPendingBaseId("");
                  setPendingBaseFactor("");
                }}
              >
                Cancel
              </Button>
              <p className="w-full text-xs text-muted-foreground">
                How many {master.unit || "current base units"} one{" "}
                {pendingBaseUnit.code} holds.
              </p>
            </div>
          )}
        </div>

        {/* Alternative rows */}
        {uomDrafts
          .filter((d) => d.unitId !== baseUnitId)
          .map((draft) => {
            const factorError = form.errorFor(ANCHORS.unitRow(draft.tempId));
            return (
              <div
                key={draft.tempId}
                id={ANCHORS.unitRow(draft.tempId)}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3.5 py-2.5 sm:grid-cols-[minmax(110px,1fr)_minmax(200px,1.5fr)_auto]",
                  factorError && "border-destructive",
                )}
              >
                <div className="flex flex-col leading-tight">
                  <b className="font-mono font-medium">{draft.unitCode}</b>
                  <span className="text-xs text-muted-foreground">
                    {activeUnits.find((u: any) => u.id === draft.unitId)
                      ?.name ?? ""}
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-2 text-sm sm:col-span-1">
                  <span className="whitespace-nowrap font-mono">
                    1 {draft.unitCode} =
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    aria-label={`Factor for ${draft.unitCode}`}
                    className="h-8 w-24"
                    value={draft.factor}
                    disabled={locked}
                    onChange={(e) =>
                      updateUomDraft(draft.tempId, {
                        factor: Number(e.target.value) || 0,
                      })
                    }
                  />
                  <span className="font-mono">{master.unit}</span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={locked}
                    onClick={() => setBaseUnit(draft.unitId)}
                  >
                    Make base
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={locked}
                    onClick={() => removeUomDraft(draft.tempId)}
                    aria-label="Remove unit"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                {factorError && (
                  <p className="col-span-full text-sm text-destructive">
                    {factorError}
                  </p>
                )}
              </div>
            );
          })}
      </div>

      {/* Add row */}
      {!locked && (
        <div className="grid items-end gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
          <Field>
            <Label className="text-xs">Unit</Label>
            <Select
              items={availableUnits.map((u: any) => ({
                value: u.id,
                label: `${u.code} — ${u.name}`,
              }))}
              value={addUnitId}
              onValueChange={(v) => setAddUnitId(v ?? "")}
              disabled={availableUnits.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a unit" />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.code} — {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <Label className="text-xs">Factor</Label>
            <Input
              type="number"
              min={0}
              step="any"
              placeholder="1"
              value={addFactor}
              disabled={!addUnitId}
              onChange={(e) => setAddFactor(e.target.value)}
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={!addUnitId || !(Number(addFactor) > 0)}
            onClick={() => {
              addUomDraft({
                id: addUnitId,
                code:
                  availableUnits.find((u: any) => u.id === addUnitId)?.code ??
                  "",
                name: availableUnits.find((u: any) => u.id === addUnitId)?.name,
                factor: Number(addFactor),
              });
              setAddUnitId("");
              setAddFactor("");
            }}
          >
            <Plus className="size-4" />
            Add
          </Button>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            {addUnitId && Number(addFactor) > 0
              ? `1 ${availableUnits.find((u: any) => u.id === addUnitId)?.code} = ${addFactor} ${master.unit}`
              : `Pick a unit and say how many ${master.unit} it holds.`}
          </p>
        </div>
      )}

      <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Defaults
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="item-field-buy">Buy in</Label>
          <Select
            items={unitListForDefaults.map((d: any) => ({
              value: d.unitId,
              label: d.unitCode,
            }))}
            value={purchaseUnitId}
            disabled={locked}
            onValueChange={(v) => setDefaultUnit("purchase", v ?? "")}
          >
            <SelectTrigger id="item-field-buy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unitListForDefaults.map((d: any) => (
                <SelectItem key={d.tempId} value={d.unitId}>
                  {d.unitCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Pre-selected on purchase orders.
          </p>
        </Field>
        <Field>
          <Label htmlFor="item-field-sell">Sell in</Label>
          <Select
            items={unitListForDefaults.map((d: any) => ({
              value: d.unitId,
              label: d.unitCode,
            }))}
            value={salesUnitId}
            disabled={locked}
            onValueChange={(val) => setDefaultUnit("sales", val ?? "")}
          >
            <SelectTrigger id="item-field-sell">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unitListForDefaults.map((d: any) => (
                <SelectItem key={d.tempId} value={d.unitId}>
                  {d.unitCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Pre-selected on invoices.
          </p>
        </Field>
      </div>
    </section>
  );
}
