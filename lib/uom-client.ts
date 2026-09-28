/**
 * Client-side UoM helpers for line-entry forms.
 *
 * Deliberately does NOT import `lib/uom-converter` — that module pulls in
 * `lib/error` → `@trpc/server`, which must not enter the browser bundle.
 * Client math stays plain floats (docs/UOM-plan.md D5); the server recomputes
 * all snapshots and roundings on submit.
 */

export interface ItemUomOption {
  unitId: string;
  /** Unit code, e.g. "BOX". */
  code: string;
  /** Unit display name. */
  name: string;
  /** Base units per this unit. Base unit itself is always 1. */
  factor: number;
  isPurchaseDefault: boolean;
  isSalesDefault: boolean;
  /** True for the item's Base Unit (implicit factor of 1). */
  isBase?: boolean;
}

interface ItemLike {
  unitId?: string | null;
  /** Legacy base-unit code string on the item. */
  unit?: string | null;
  itemUoms?: Array<{
    unitId: string;
    factor: number | string;
    isPurchaseDefault?: boolean;
    isSalesDefault?: boolean;
    isActive?: boolean;
    deletedAt?: Date | null;
    unit?: { id: string; code: string; name: string } | null;
  }> | null;
}

/** Unit options for an item: base unit (factor 1) + active alternative units. */
export function itemUnitOptions(
  item: ItemLike | null | undefined,
): ItemUomOption[] {
  if (!item) return [];
  const options: ItemUomOption[] = [];
  if (item.unitId) {
    options.push({
      unitId: item.unitId,
      code: item.unit ?? "",
      name: item.unit ?? "",
      factor: 1,
      isPurchaseDefault: false,
      isSalesDefault: false,
      isBase: true,
    });
  }
  for (const u of item.itemUoms ?? []) {
    if (!u.unit || u.deletedAt || u.isActive === false) continue;
    if (u.unitId === item.unitId) continue;
    options.push({
      unitId: u.unitId,
      code: u.unit.code,
      name: u.unit.name,
      factor: Number(u.factor) || 1,
      isPurchaseDefault: !!u.isPurchaseDefault,
      isSalesDefault: !!u.isSalesDefault,
    });
  }
  return options;
}

/** The unit a new line should default to (purchase/sales default, else base). */
export function defaultUnitIdFor(
  item: ItemLike | null | undefined,
  kind: "purchase" | "sale",
): string | undefined {
  if (!item) return undefined;
  const hit = (item.itemUoms ?? []).find((u) =>
    kind === "purchase" ? u.isPurchaseDefault : u.isSalesDefault,
  );
  if (hit && !hit.deletedAt && hit.isActive !== false) return hit.unitId;
  return item.unitId ?? undefined;
}

/** Base units per `unitId` for this item (1 for base/unknown). */
export function factorForUnit(
  item: ItemLike | null | undefined,
  unitId: string | null | undefined,
): number {
  if (!item || !unitId || unitId === item.unitId) return 1;
  const hit = (item.itemUoms ?? []).find(
    (u) => u.unitId === unitId && !u.deletedAt && u.isActive !== false,
  );
  return hit ? Number(hit.factor) || 1 : 1;
}

/** Short unit label for a line (code string), "" when unknown. */
export function unitCodeFor(
  item: ItemLike | null | undefined,
  unitId: string | null | undefined,
): string {
  if (!item || !unitId || unitId === item.unitId) return item?.unit ?? "";
  const hit = (item.itemUoms ?? []).find((u) => u.unitId === unitId);
  return hit?.unit?.code ?? "";
}

/** Convert a per-unit amount between two units of the same item (float). */
export function convertAmount(
  amount: number,
  fromFactor: number,
  toFactor: number,
): number {
  if (!fromFactor || !toFactor || fromFactor === toFactor) return amount;
  return (amount * fromFactor) / toFactor;
}
