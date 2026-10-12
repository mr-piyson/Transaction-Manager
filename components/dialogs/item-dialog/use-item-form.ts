"use client";

import * as React from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import {
  getItemMasterDefaults,
  getSupplierItemDraftDefaults,
  type ItemMasterValues,
  type ItemUomDraft,
  makeUomDraft,
  type SupplierItemDraft,
  type SupplierItemPriceDraft,
} from "@/lib/validations/unified-item";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Mode = "create" | "existing" | "add-supplier" | "edit";

export type SectionKey = "identity" | "units" | "pricing" | "suppliers";

export interface ItemIssue {
  /** Which section the offending field lives in. */
  section: SectionKey;
  /** DOM id of the field / row — used to jump to and focus the field. */
  anchor: string;
  message: string;
}

export interface MoneySummary {
  baseCurrency: string;
  taxName: string;
  taxPct: number;
  /** Sale price including tax. */
  taxInclusive: number;
  bestCost: number | null;
  bestCostSupplierId: string | null;
  pricedCount: number;
  marginPct: number | null;
}

/** Stable DOM ids used by validation to anchor errors and focus fields. */
export const ANCHORS = {
  name: "item-field-name",
  sku: "item-field-sku",
  price: "item-field-price",
  unit: "item-field-unit",
  unitRow: (tempId: string) => `item-unit-${tempId}`,
  supplierRow: (tempId: string) => `item-supplier-${tempId}`,
} as const;

export interface UseItemFormReturn {
  mode: Mode;
  master: ItemMasterValues;
  existingMaster: any | null;
  editingItem: any | null;
  supplierDrafts: SupplierItemDraft[];
  suppliers: any[];
  units: any[];
  categories: any[];
  taxRates: any[];
  uomDrafts: ItemUomDraft[];
  /** True once the item has stock/document usage — base unit & factors lock. */
  uomFactorLocked: boolean;
  usageCount: number;
  isDetailLoading: boolean;
  issues: ItemIssue[];
  tried: boolean;
  dirty: boolean;
  duplicateItem: any | null;
  money: MoneySummary;
  isSubmitting: boolean;
  pendingImageFile: File | null;
  imageRemoved: boolean;
  /** Identity fields are read-only when adding a price to an existing item. */
  identityLocked: boolean;

  setMode: (mode: Mode) => void;
  setMasterField: <K extends keyof ItemMasterValues>(
    field: K,
    value: ItemMasterValues[K],
  ) => void;
  setMaster: (master: ItemMasterValues) => void;
  setPendingImageFile: (file: File | null) => void;
  setImageRemoved: (removed: boolean) => void;

  /** Marks `unitId` as the Base (stock) unit and re-scales every factor.
   *  Provide `fallback` ({ code, factor } relative to the current base) when the
   *  unit is not yet part of the ladder — it is added, then promoted. */
  setBaseUnit: (
    unitId: string,
    fallback?: { code: string; factor: number },
  ) => void;
  addUomDraft: (unit: {
    id: string;
    code: string;
    name?: string;
    factor?: number;
    isPurchaseDefault?: boolean;
    isSalesDefault?: boolean;
    barcode?: string;
  }) => void;
  removeUomDraft: (tempId: string) => void;
  updateUomDraft: (tempId: string, patch: Partial<ItemUomDraft>) => void;
  /** Chooses the pre-selected purchase/sales unit. */
  setDefaultUnit: (kind: "purchase" | "sales", unitId: string) => void;

  addSupplierDraft: () => void;
  removeSupplierDraft: (tempId: string) => void;
  updateSupplierDraft: (
    tempId: string,
    patch: Partial<SupplierItemDraft>,
  ) => void;

  /** Units a supplier price may be quoted in (item base + defined UOMs). */
  supplierUnitOptions: { unitId: string; code: string }[];
  /** Unit a freshly added price row defaults to (purchase default, else base). */
  supplierDefaultUnitId: string;
  addSupplierPrice: (tempId: string) => void;
  removeSupplierPrice: (tempId: string, unitId: string) => void;
  updateSupplierPrice: (tempId: string, unitId: string, price: number) => void;

  handleMasterNameBlur: () => void;
  dismissDuplicate: () => void;
  adoptDuplicate: () => void;

  errorFor: (anchor: string) => string | undefined;
  supplierCurrency: (draft: SupplierItemDraft) => string;
  convertToBase: (amount: number, currency: string) => number;
  submit: (keepOpen?: boolean) => Promise<void>;
  reset: () => void;
}

export interface UseItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSupplierId?: string;
  initialItem?: any;
  editItemId?: string;
  onSuccess?: (itemId: string) => void;
}

interface LoadConfig {
  mode: Mode;
  itemId?: string;
  supplierId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newTempId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function usageOfCount(count: any): number {
  return (
    (count?.invoiceLines ?? 0) +
    (count?.purchaseLines ?? 0) +
    (count?.stockMovements ?? 0)
  );
}

/** Unit a new supplier price row should default to for an item. */
function defaultSupplierUnitIdFor(
  item: any,
  baseUnitId?: string | null,
): string {
  const purchaseDefault = (item?.itemUoms ?? []).find(
    (u: any) => u.isPurchaseDefault && !u.deletedAt && u.isActive !== false,
  );
  return purchaseDefault?.unitId ?? baseUnitId ?? item?.unitId ?? "";
}

/** Builds the ordered list of validation issues for the current form state. */
function buildIssues(params: {
  mode: Mode;
  master: ItemMasterValues;
  uomDrafts: ItemUomDraft[];
  supplierDrafts: SupplierItemDraft[];
  existingItems: any[];
  editItemId?: string;
  suppliers: any[];
}): ItemIssue[] {
  const {
    mode,
    master,
    uomDrafts,
    supplierDrafts,
    existingItems,
    editItemId,
    suppliers,
  } = params;
  const issues: ItemIssue[] = [];
  const identityEditable = mode === "create" || mode === "edit";

  if (identityEditable) {
    if (!master.name.trim()) {
      issues.push({
        section: "identity",
        anchor: ANCHORS.name,
        message: "Enter an item name.",
      });
    }

    const sku = master.sku.trim().toUpperCase();
    if (!sku) {
      issues.push({
        section: "identity",
        anchor: ANCHORS.sku,
        message: "Enter an SKU or generate one.",
      });
    } else {
      const clash = existingItems.find(
        (i: any) => i.sku?.toUpperCase().trim() === sku && i.id !== editItemId,
      );
      if (clash) {
        issues.push({
          section: "identity",
          anchor: ANCHORS.sku,
          message: `This SKU already belongs to ${clash.name}.`,
        });
      }
    }

    if (master.type === "PRODUCT") {
      if (!master.unitId) {
        issues.push({
          section: "units",
          anchor: ANCHORS.unit,
          message: "Select a base (stock) unit of measure.",
        });
      }
      for (const draft of uomDrafts) {
        if (draft.unitId === master.unitId) continue;
        if (!(draft.factor > 0)) {
          issues.push({
            section: "units",
            anchor: ANCHORS.unitRow(draft.tempId),
            message: `Enter how many ${master.unit || "base units"} are in one ${draft.unitCode}.`,
          });
        }
      }
    } else if (!master.unit.trim()) {
      issues.push({
        section: "units",
        anchor: ANCHORS.unit,
        message: "Choose the unit shown on invoices.",
      });
    }

    if (master.salesPrice < 0) {
      issues.push({
        section: "pricing",
        anchor: ANCHORS.price,
        message: "Price cannot be negative.",
      });
    }
  }

  const nameById = new Map<string, string>(
    suppliers.map((s: any) => [s.id, s.name]),
  );
  const seen = new Set<string>();
  supplierDrafts.forEach((draft, index) => {
    const anchor = ANCHORS.supplierRow(draft.tempId);
    if (!draft.supplierId) {
      issues.push({
        section: "suppliers",
        anchor,
        message: `Choose a supplier for price ${index + 1}.`,
      });
      return;
    }
    if (seen.has(draft.supplierId)) {
      issues.push({
        section: "suppliers",
        anchor,
        message: `${nameById.get(draft.supplierId) ?? "This supplier"} is listed twice. Keep one price per supplier.`,
      });
    }
    seen.add(draft.supplierId);

    const prices = draft.prices ?? [];
    if (!prices.some((p) => Number(p.price) > 0)) {
      issues.push({
        section: "suppliers",
        anchor,
        message: `Enter at least one unit price for ${nameById.get(draft.supplierId) ?? "this supplier"}.`,
      });
    }
    const seenUnits = new Set<string>();
    for (const p of prices) {
      if (seenUnits.has(p.unitId)) {
        issues.push({
          section: "suppliers",
          anchor,
          message: `A unit is listed twice for ${nameById.get(draft.supplierId) ?? "this supplier"}.`,
        });
      }
      seenUnits.add(p.unitId);
    }
  });

  return issues;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useItemForm({
  open,
  onOpenChange,
  initialSupplierId,
  initialItem,
  editItemId,
  onSuccess,
}: UseItemFormProps): UseItemFormReturn {
  const utils = trpc.useUtils();

  const getInitialConfig = React.useCallback((): LoadConfig => {
    if (editItemId) return { mode: "edit", itemId: editItemId };
    if (initialItem?.id) {
      return {
        mode: "add-supplier",
        itemId: initialItem.id,
        supplierId: initialSupplierId,
      };
    }
    return { mode: "create" };
  }, [editItemId, initialItem?.id, initialSupplierId]);

  const [loadConfig, setLoadConfig] =
    React.useState<LoadConfig>(getInitialConfig);
  const [mode, setModeState] = React.useState<Mode>(
    () => getInitialConfig().mode,
  );
  const [master, setMasterState] = React.useState<ItemMasterValues>(
    getItemMasterDefaults,
  );
  const [existingMaster, setExistingMaster] = React.useState<any | null>(null);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [supplierDrafts, setSupplierDrafts] = React.useState<
    SupplierItemDraft[]
  >([]);
  const [uomDrafts, setUomDrafts] = React.useState<ItemUomDraft[]>([]);
  const [tried, setTried] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [duplicateItem, setDuplicateItem] = React.useState<any | null>(null);
  const [duplicateDismissed, setDuplicateDismissed] = React.useState(false);
  const [pendingImageFile, setPendingImageFileState] =
    React.useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = React.useState(false);

  const initializedRef = React.useRef(false);
  const prevOpenRef = React.useRef(false);

  const setPendingImageFile = React.useCallback((file: File | null) => {
    setPendingImageFileState(file);
  }, []);

  const markDirty = React.useCallback(() => setDirty(true), []);

  // ── Data queries ─────────────────────────────────────────────────────────
  const { data: suppliersData } = trpc.suppliers.list.useQuery(
    {},
    { enabled: open },
  );
  const suppliers = React.useMemo(() => suppliersData ?? [], [suppliersData]);

  const { data: existingItemsData } = trpc.items.list.useQuery(
    {},
    { enabled: open },
  );
  const existingItems = React.useMemo(
    () => existingItemsData ?? [],
    [existingItemsData],
  );

  const { data: unitsData } = trpc.units.list.useQuery(undefined, {
    enabled: open,
  });
  const units = React.useMemo(() => unitsData ?? [], [unitsData]);

  const { data: categoriesData } = trpc.categories.list.useQuery(undefined, {
    enabled: open,
  });
  const categories = React.useMemo(
    () => categoriesData ?? [],
    [categoriesData],
  );

  const { data: taxRatesData } = trpc.settings.taxRates.list.useQuery(
    undefined,
    { enabled: open },
  );
  const taxRates = React.useMemo(() => taxRatesData ?? [], [taxRatesData]);

  const { data: orgData } = trpc.organizations.get.useQuery(undefined, {
    enabled: open,
  });
  const baseCurrency = (orgData?.currency as string) ?? "BHD";

  const { data: ratesData } = trpc.exchangeRates.list.useQuery(undefined, {
    enabled: open,
  });

  const detailItemId =
    loadConfig.mode === "edit" || loadConfig.mode === "add-supplier"
      ? loadConfig.itemId
      : undefined;

  const { data: detailItem, isLoading: isDetailLoading } =
    trpc.items.byId.useQuery(
      { id: detailItemId as string },
      { enabled: open && !!detailItemId },
    );

  // ── Currency helpers ─────────────────────────────────────────────────────
  const supplierCurrency = React.useCallback(
    (draft: SupplierItemDraft) => {
      if (!draft.supplierId) return draft.currency || baseCurrency;
      const supplier = suppliers.find((s: any) => s.id === draft.supplierId);
      return (supplier as any)?.currencyCode ?? baseCurrency;
    },
    [suppliers, baseCurrency],
  );

  const convertToBase = React.useCallback(
    (amount: number, currency: string) => {
      if (!currency || currency === baseCurrency) return amount;
      const rows = ratesData ?? [];
      const direct = rows.find(
        (r: any) =>
          r.fromCurrency === currency && r.toCurrency === baseCurrency,
      );
      if (direct) return amount * Number(direct.rate);
      const inverse = rows.find(
        (r: any) =>
          r.fromCurrency === baseCurrency && r.toCurrency === currency,
      );
      if (inverse && Number(inverse.rate) > 0) {
        return amount / Number(inverse.rate);
      }
      return amount;
    },
    [ratesData, baseCurrency],
  );

  // ── Initialisation ───────────────────────────────────────────────────────
  React.useEffect(() => {
    if (open && !prevOpenRef.current) {
      const cfg = getInitialConfig();
      setLoadConfig(cfg);
      setModeState(cfg.mode);
      initializedRef.current = false;
      setTried(false);
      setDirty(false);
      setDuplicateItem(null);
      setDuplicateDismissed(false);
      setPendingImageFileState(null);
      setImageRemoved(false);
    }
    if (!open) initializedRef.current = false;
    prevOpenRef.current = open;
  }, [open, getInitialConfig]);

  const initCreate = React.useCallback((unitList: any[]) => {
    const defaults = getItemMasterDefaults();
    const def =
      unitList.find((u: any) => u.isDefault && u.isActive) ??
      unitList.find((u: any) => u.isActive) ??
      unitList[0];
    const drafts: ItemUomDraft[] = [];
    if (def) {
      defaults.unitId = def.id;
      defaults.unit = def.code;
      drafts.push(
        makeUomDraft({
          unitId: def.id,
          unitCode: def.code,
          unitName: def.name,
          factor: 1,
        }),
      );
    }
    setMasterState(defaults);
    setUomDrafts(drafts);
    setSupplierDrafts([]);
    setExistingMaster(null);
    setEditingItem(null);
  }, []);

  const initFromItem = React.useCallback(
    (cfg: LoadConfig, item: any) => {
      const unitList = units ?? [];
      const codeById = new Map<string, string>(
        unitList.map((u: any) => [u.id, u.code]),
      );
      const base = getItemMasterDefaults(item);
      if (base.unitId && !base.unit) {
        base.unit = codeById.get(base.unitId) ?? item.unitRef?.code ?? "pcs";
      }
      if (!base.unit && item.unitRef?.code) base.unit = item.unitRef.code;
      setMasterState(base);

      const isProduct = item.type === "PRODUCT";
      const drafts: ItemUomDraft[] = [];
      if (isProduct && item.unitId) {
        drafts.push(
          makeUomDraft({
            unitId: item.unitId,
            unitCode:
              item.unit ??
              item.unitRef?.code ??
              codeById.get(item.unitId) ??
              "",
            factor: 1,
          }),
        );
        for (const u of (item.itemUoms ?? []) as any[]) {
          if (u.unitId === item.unitId) continue;
          drafts.push(
            makeUomDraft({
              id: u.id,
              unitId: u.unitId,
              unitCode: u.unit?.code ?? codeById.get(u.unitId) ?? "",
              unitName: u.unit?.name,
              factor: Number(u.factor) || 1,
              isPurchaseDefault: !!u.isPurchaseDefault,
              isSalesDefault: !!u.isSalesDefault,
              barcode: u.barcode ?? undefined,
              isActive: u.isActive ?? true,
            }),
          );
        }
      }
      setUomDrafts(drafts);

      const drafts2: SupplierItemDraft[] = (item.supplierItems ?? []).map(
        (si: any) => {
          const priceRows: SupplierItemPriceDraft[] = (si.prices ?? []).map(
            (p: any) => ({
              unitId: p.unitId,
              price: Number(p.price) || 0,
            }),
          );
          if (
            priceRows.length === 0 &&
            Number(si.basePrice) > 0 &&
            base.unitId
          ) {
            priceRows.push({
              unitId: base.unitId,
              price: Number(si.basePrice) || 0,
            });
          }
          return {
            ...getSupplierItemDraftDefaults(),
            tempId: newTempId(),
            id: si.id,
            supplierId: si.supplierId,
            supplierSku: si.supplierSku ?? undefined,
            supplierName: si.supplierName ?? undefined,
            basePrice: Number(si.basePrice) || 0,
            currency: si.currency ?? baseCurrency,
            leadTimeDays: si.leadTimeDays ?? undefined,
            minOrderQty: Number(si.minOrderQty) || 1,
            notes: si.notes ?? undefined,
            isActive: si.isActive ?? true,
            prices: priceRows,
          };
        },
      );
      if (
        cfg.supplierId &&
        !drafts2.some((d) => d.supplierId === cfg.supplierId)
      ) {
        const supplier = suppliers.find((s: any) => s.id === cfg.supplierId);
        const defaultUnit = defaultSupplierUnitIdFor(item, base.unitId);
        drafts2.push({
          ...getSupplierItemDraftDefaults(),
          tempId: newTempId(),
          supplierId: cfg.supplierId,
          currency: (supplier as any)?.currencyCode ?? baseCurrency,
          prices: defaultUnit ? [{ unitId: defaultUnit, price: 0 }] : [],
        });
      }
      setSupplierDrafts(drafts2);

      if (cfg.mode === "edit") {
        setEditingItem(item);
        setExistingMaster(null);
      } else {
        setExistingMaster(item);
        setEditingItem(null);
      }
      setModeState(cfg.mode);
    },
    [units, suppliers, baseCurrency],
  );

  React.useEffect(() => {
    if (!open || initializedRef.current) return;
    if (loadConfig.mode === "create") {
      if (unitsData === undefined) return;
      initCreate(units);
    } else {
      if (!detailItem) return;
      initFromItem(loadConfig, detailItem);
    }
    initializedRef.current = true;
  }, [
    open,
    loadConfig,
    detailItem,
    unitsData,
    units,
    initCreate,
    initFromItem,
  ]);

  // ── Image upload ─────────────────────────────────────────────────────────
  const uploadImage = React.useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Upload failed");
      }
      const data = await res.json();
      return data.storagePath as string;
    } catch (err) {
      console.error("[uploadImage]", err);
      toast.error("Image upload failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
      return null;
    }
  }, []);

  // ── Mutations ────────────────────────────────────────────────────────────
  const createMutation = trpc.items.createWithSupplierItems.useMutation();
  const updateWithSuppliersMutation =
    trpc.items.updateWithSupplierItems.useMutation();

  // ── Derived state ────────────────────────────────────────────────────────
  const targetItem = editingItem ?? existingMaster;
  const usageCount = React.useMemo(
    () => usageOfCount(targetItem?._count),
    [targetItem],
  );
  const uomFactorLocked =
    usageCount > 0 &&
    (mode === "edit" || mode === "add-supplier" || mode === "existing");

  const issues = React.useMemo(
    () =>
      buildIssues({
        mode,
        master,
        uomDrafts,
        supplierDrafts,
        existingItems,
        editItemId: editingItem?.id,
        suppliers,
      }),
    [
      mode,
      master,
      uomDrafts,
      supplierDrafts,
      existingItems,
      editingItem?.id,
      suppliers,
    ],
  );

  const issuesByAnchor = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const issue of issues) {
      if (!map.has(issue.anchor)) map.set(issue.anchor, issue.message);
    }
    return map;
  }, [issues]);

  const errorFor = React.useCallback(
    (anchor: string) => (tried ? issuesByAnchor.get(anchor) : undefined),
    [tried, issuesByAnchor],
  );

  const money = React.useMemo<MoneySummary>(() => {
    const taxRate = taxRates.find((t: any) => t.id === master.taxRateId);
    const taxPct = taxRate ? Number(taxRate.rate) : 0;
    const taxName = taxRate?.name ?? "Tax";

    const baseUnitId = master.unitId;
    // Normalise each quoted price to a per-base-unit figure so prices quoted in
    // different units (e.g. per box vs per piece) compare fairly.
    const factorOf = (unitId: string) => {
      if (!baseUnitId || unitId === baseUnitId) return 1;
      const hit = uomDrafts.find((d) => d.unitId === unitId);
      const f = Number(hit?.factor) || 1;
      return f > 0 ? f : 1;
    };
    const priced = supplierDrafts.filter(
      (d) => d.supplierId && (d.prices ?? []).some((p) => Number(p.price) > 0),
    );
    let bestCost: number | null = null;
    let bestCostSupplierId: string | null = null;
    for (const draft of priced) {
      let draftBest: number | null = null;
      for (const p of draft.prices ?? []) {
        const price = Number(p.price) || 0;
        if (price <= 0) continue;
        const perBase = price / factorOf(p.unitId);
        if (draftBest === null || perBase < draftBest) draftBest = perBase;
      }
      if (draftBest === null) continue;
      const cost = convertToBase(draftBest, supplierCurrency(draft));
      if (bestCost === null || cost < bestCost) {
        bestCost = cost;
        bestCostSupplierId = draft.supplierId;
      }
    }
    const marginPct =
      bestCost !== null && master.salesPrice > 0
        ? ((master.salesPrice - bestCost) / master.salesPrice) * 100
        : null;

    return {
      baseCurrency,
      taxName,
      taxPct,
      taxInclusive: master.salesPrice * (1 + taxPct / 100),
      bestCost,
      bestCostSupplierId,
      pricedCount: priced.length,
      marginPct,
    };
  }, [
    taxRates,
    master.taxRateId,
    master.salesPrice,
    master.unitId,
    supplierDrafts,
    uomDrafts,
    convertToBase,
    supplierCurrency,
    baseCurrency,
  ]);

  // ── Master setters ───────────────────────────────────────────────────────
  const setMasterField = React.useCallback(
    <K extends keyof ItemMasterValues>(
      field: K,
      value: ItemMasterValues[K],
    ) => {
      markDirty();
      setMasterState((prev) => ({ ...prev, [field]: value }));
    },
    [markDirty],
  );

  const setMaster = React.useCallback(
    (next: ItemMasterValues) => {
      markDirty();
      setMasterState(next);
    },
    [markDirty],
  );

  const setMode = React.useCallback((next: Mode) => {
    setModeState(next);
  }, []);

  // ── UoM setters ──────────────────────────────────────────────────────────
  const setBaseUnit = React.useCallback(
    (unitId: string, fallback?: { code: string; factor: number }) => {
      markDirty();
      setUomDrafts((prev) => {
        const hasUnit = prev.some((d) => d.unitId === unitId);
        const withUnit =
          hasUnit || !fallback
            ? prev
            : [
                ...prev,
                makeUomDraft({
                  unitId,
                  unitCode: fallback.code,
                  factor: fallback.factor > 0 ? fallback.factor : 1,
                }),
              ];
        const newBase = withUnit.find((d) => d.unitId === unitId);
        const divisor =
          newBase?.factor && newBase.factor > 0 ? newBase.factor : 1;
        return withUnit.map((d) => ({
          ...d,
          factor:
            d.unitId === unitId
              ? 1
              : Math.round((d.factor / divisor) * 1e6) / 1e6,
          isPurchaseDefault: d.unitId === unitId ? false : d.isPurchaseDefault,
          isSalesDefault: d.unitId === unitId ? false : d.isSalesDefault,
        }));
      });
      setMasterState((prev) => {
        const draft = uomDrafts.find((d) => d.unitId === unitId);
        return {
          ...prev,
          unitId,
          unit: draft?.unitCode ?? fallback?.code ?? prev.unit,
        };
      });
    },
    [uomDrafts, markDirty],
  );

  const addUomDraft = React.useCallback(
    (unit: {
      id: string;
      code: string;
      name?: string;
      factor?: number;
      isPurchaseDefault?: boolean;
      isSalesDefault?: boolean;
      barcode?: string;
    }) => {
      markDirty();
      if (uomDrafts.some((d) => d.unitId === unit.id)) return;
      const isFirst = uomDrafts.length === 0;
      setUomDrafts((prev) => [
        ...prev,
        makeUomDraft({
          unitId: unit.id,
          unitCode: unit.code,
          unitName: unit.name,
          factor: isFirst ? 1 : (unit.factor ?? 1),
          isPurchaseDefault: isFirst
            ? false
            : (unit.isPurchaseDefault ?? false),
          isSalesDefault: isFirst ? false : (unit.isSalesDefault ?? false),
          barcode: isFirst ? undefined : unit.barcode,
        }),
      ]);
      setMasterState((prev) =>
        prev.unitId ? prev : { ...prev, unitId: unit.id, unit: unit.code },
      );
    },
    [markDirty, uomDrafts],
  );

  const removeUomDraft = React.useCallback(
    (tempId: string) => {
      markDirty();
      const removed = uomDrafts.find((d) => d.tempId === tempId);
      const next = uomDrafts.filter((d) => d.tempId !== tempId);
      setUomDrafts(next);
      // Drop any supplier price rows quoted in the removed unit — it is no
      // longer part of the item's unit ladder.
      if (removed) {
        setSupplierDrafts((prev) =>
          prev.map((d) => ({
            ...d,
            prices: (d.prices ?? []).filter((p) => p.unitId !== removed.unitId),
          })),
        );
      }
      if (removed && removed.unitId === master.unitId) {
        if (next.length > 0) {
          setMasterState((m) => ({
            ...m,
            unitId: next[0].unitId,
            unit: next[0].unitCode,
          }));
        } else {
          setMasterState((m) => ({ ...m, unitId: undefined }));
        }
      }
    },
    [markDirty, uomDrafts, master.unitId],
  );

  const updateUomDraft = React.useCallback(
    (tempId: string, patch: Partial<ItemUomDraft>) => {
      markDirty();
      setUomDrafts((prev) =>
        prev.map((d) => (d.tempId === tempId ? { ...d, ...patch } : d)),
      );
    },
    [markDirty],
  );

  const setDefaultUnit = React.useCallback(
    (kind: "purchase" | "sales", unitId: string) => {
      markDirty();
      setUomDrafts((prev) =>
        prev.map((d) => {
          const isBase = d.unitId === master.unitId;
          const flag = !isBase && d.unitId === unitId;
          return kind === "purchase"
            ? { ...d, isPurchaseDefault: flag }
            : { ...d, isSalesDefault: flag };
        }),
      );
    },
    [markDirty, master.unitId],
  );

  // ── Supplier price units + setters ───────────────────────────────────────
  const supplierUnitOptions = React.useMemo(() => {
    const opts: { unitId: string; code: string }[] = [];
    if (master.unitId) {
      opts.push({ unitId: master.unitId, code: master.unit || "base" });
    }
    for (const d of uomDrafts) {
      if (d.unitId === master.unitId) continue;
      opts.push({ unitId: d.unitId, code: d.unitCode });
    }
    return opts;
  }, [master.unitId, master.unit, uomDrafts]);

  const supplierDefaultUnitId = React.useMemo(
    () =>
      uomDrafts.find((d) => d.isPurchaseDefault)?.unitId ??
      master.unitId ??
      uomDrafts[0]?.unitId ??
      "",
    [uomDrafts, master.unitId],
  );

  const addSupplierDraft = React.useCallback(() => {
    markDirty();
    setSupplierDrafts((prev) => [
      ...prev,
      {
        ...getSupplierItemDraftDefaults(),
        prices: supplierDefaultUnitId
          ? [{ unitId: supplierDefaultUnitId, price: 0 }]
          : [],
      },
    ]);
  }, [markDirty, supplierDefaultUnitId]);

  const removeSupplierDraft = React.useCallback(
    (tempId: string) => {
      markDirty();
      setSupplierDrafts((prev) => prev.filter((d) => d.tempId !== tempId));
    },
    [markDirty],
  );

  const updateSupplierDraft = React.useCallback(
    (tempId: string, patch: Partial<SupplierItemDraft>) => {
      markDirty();
      setSupplierDrafts((prev) =>
        prev.map((d) => {
          if (d.tempId !== tempId) return d;
          const updated = { ...d, ...patch };
          if (patch.supplierId) {
            const supplier = suppliers.find(
              (s: any) => s.id === patch.supplierId,
            );
            if (supplier) {
              updated.currency =
                (supplier as any).currencyCode ?? updated.currency;
            }
          }
          return updated;
        }),
      );
    },
    [suppliers, markDirty],
  );

  const addSupplierPrice = React.useCallback(
    (tempId: string) => {
      markDirty();
      setSupplierDrafts((prev) =>
        prev.map((d) => {
          if (d.tempId !== tempId) return d;
          const prices = d.prices ?? [];
          const used = new Set(prices.map((p) => p.unitId));
          const next = supplierUnitOptions.find((u) => !used.has(u.unitId));
          if (!next) return d;
          return {
            ...d,
            prices: [...prices, { unitId: next.unitId, price: 0 }],
          };
        }),
      );
    },
    [markDirty, supplierUnitOptions],
  );

  const removeSupplierPrice = React.useCallback(
    (tempId: string, unitId: string) => {
      markDirty();
      setSupplierDrafts((prev) =>
        prev.map((d) =>
          d.tempId === tempId
            ? {
                ...d,
                prices: (d.prices ?? []).filter((p) => p.unitId !== unitId),
              }
            : d,
        ),
      );
    },
    [markDirty],
  );

  const updateSupplierPrice = React.useCallback(
    (tempId: string, unitId: string, price: number) => {
      markDirty();
      setSupplierDrafts((prev) =>
        prev.map((d) =>
          d.tempId === tempId
            ? {
                ...d,
                prices: (d.prices ?? []).map((p) =>
                  p.unitId === unitId ? { ...p, price } : p,
                ),
              }
            : d,
        ),
      );
    },
    [markDirty],
  );

  // ── Duplicate detection ──────────────────────────────────────────────────
  const handleMasterNameBlur = React.useCallback(() => {
    if (mode !== "create") return;
    const query = master.name.trim().toLowerCase();
    if (!query) {
      setDuplicateItem(null);
      return;
    }
    const match = existingItems.find(
      (i: any) => i.name?.toLowerCase().trim() === query,
    );
    setDuplicateItem(match ?? null);
    if (match) setDuplicateDismissed(false);
  }, [mode, master.name, existingItems]);

  const dismissDuplicate = React.useCallback(() => {
    setDuplicateDismissed(true);
  }, []);

  const adoptDuplicate = React.useCallback(() => {
    if (!duplicateItem) return;
    setDuplicateDismissed(true);
    setDuplicateItem(null);
    setExistingMaster(duplicateItem);
    setEditingItem(null);
    setModeState("add-supplier");
    initializedRef.current = false;
    setLoadConfig({
      mode: "add-supplier",
      itemId: duplicateItem.id,
    });
  }, [duplicateItem]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const resetCreateInternal = React.useCallback(() => {
    initCreate(units);
    setTried(false);
    setDirty(false);
    setDuplicateItem(null);
    setDuplicateDismissed(false);
    setPendingImageFileState(null);
    setImageRemoved(false);
  }, [initCreate, units]);

  const submit = React.useCallback(
    async (keepOpen = false) => {
      setTried(true);
      if (issues.length > 0) {
        const first = issues[0];
        requestAnimationFrame(() => {
          const el = document.getElementById(first.anchor);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            const field = el.querySelector<HTMLElement>(
              "input,select,textarea",
            );
            field?.focus({ preventScroll: true });
          }
        });
        toast.error(
          `${issues.length} ${issues.length === 1 ? "thing" : "things"} to fix before saving.`,
        );
        return;
      }

      let uploaded: string | undefined;
      if (pendingImageFile) {
        const path = await uploadImage(pendingImageFile);
        if (path) uploaded = path;
      }
      const finalImage: string | null | undefined = imageRemoved
        ? null
        : uploaded;

      const serializedUoms = uomDrafts
        .filter((d) => d.unitId !== master.unitId)
        .map((d) => ({
          id: d.id,
          unitId: d.unitId,
          factor: d.factor,
          isPurchaseDefault: d.isPurchaseDefault,
          isSalesDefault: d.isSalesDefault,
          barcode: d.barcode || undefined,
          isActive: d.isActive,
        }));

      const validUnitIds = new Set(supplierUnitOptions.map((u) => u.unitId));
      const deriveBasePrice = (draft: SupplierItemDraft) => {
        const prices = draft.prices ?? [];
        const baseRow = prices.find((p) => p.unitId === master.unitId);
        if (baseRow) return Number(baseRow.price) || 0;
        const pd = prices.find((p) => p.unitId === supplierDefaultUnitId);
        if (pd) return Number(pd.price) || 0;
        const first = prices.find((p) => Number(p.price) > 0);
        return first ? Number(first.price) || 0 : 0;
      };
      const supplierPayload = (draft: SupplierItemDraft) => ({
        supplierId: draft.supplierId,
        supplierSku: draft.supplierSku || undefined,
        supplierName: draft.supplierName || undefined,
        basePrice: String(deriveBasePrice(draft)),
        currency: supplierCurrency(draft),
        leadTimeDays: draft.leadTimeDays,
        minOrderQty: String(draft.minOrderQty),
        notes: draft.notes || undefined,
        prices: (draft.prices ?? [])
          .filter(
            (p) =>
              p.unitId && Number(p.price) > 0 && validUnitIds.has(p.unitId),
          )
          .map((p) => ({ unitId: p.unitId, price: String(p.price) })),
      });
      const supplierPayloadWithId = (draft: SupplierItemDraft) => ({
        id: draft.id,
        ...supplierPayload(draft),
        isActive: draft.isActive,
      });

      const itemPayload = {
        type: master.type,
        sku: master.sku.trim(),
        name: master.name.trim(),
        barcode: master.barcode?.trim() || undefined,
        description: master.description,
        image:
          finalImage !== undefined ? finalImage : (master.image ?? undefined),
        unit: master.unit,
        unitId: master.unitId,
        isSaleable: master.isSaleable,
        isPurchasable: master.isPurchasable,
        salesPrice: String(master.salesPrice),
        minStock: master.minStock,
        reorderPoint: master.reorderPoint,
        reorderQty: master.reorderQty,
        categoryId: master.categoryId || undefined,
        taxRateId: master.taxRateId || undefined,
      };

      const nonEmptySuppliers = supplierDrafts.filter((d) => d.supplierId);

      try {
        if (mode === "create") {
          const res = await createMutation.mutateAsync({
            item: itemPayload,
            itemUoms: serializedUoms,
            supplierItems: nonEmptySuppliers.map(supplierPayload),
          });
          utils.items.list.invalidate();
          utils.suppliers.list.invalidate();
          const unitCount = uomDrafts.length;
          toast.success(
            `Created “${master.name}” with ${unitCount} unit${unitCount === 1 ? "" : "s"} and ${nonEmptySuppliers.length} supplier price${nonEmptySuppliers.length === 1 ? "" : "s"}.`,
          );
          onSuccess?.(res.item.id);
          if (keepOpen) {
            resetCreateInternal();
          } else {
            onOpenChange(false);
          }
        } else if (mode === "edit" && editingItem) {
          await updateWithSuppliersMutation.mutateAsync({
            id: editingItem.id,
            item: itemPayload,
            itemUoms: serializedUoms,
            supplierItems: nonEmptySuppliers.map(supplierPayloadWithId),
          });
          utils.items.list.invalidate();
          utils.items.byId.invalidate({ id: editingItem.id });
          toast.success(`Saved changes to “${master.name}”.`);
          onSuccess?.(editingItem.id);
          onOpenChange(false);
        } else {
          const target = existingMaster ?? editingItem;
          if (!target) return;
          await updateWithSuppliersMutation.mutateAsync({
            id: target.id,
            supplierItems: nonEmptySuppliers.map(supplierPayloadWithId),
          });
          utils.items.list.invalidate();
          utils.items.byId.invalidate({ id: target.id });
          const added = nonEmptySuppliers.length;
          toast.success(
            `Added ${added} supplier price${added === 1 ? "" : "s"} to “${target.name}”.`,
          );
          onSuccess?.(target.id);
          if (keepOpen) {
            setSupplierDrafts((prev) => [
              ...prev,
              {
                ...getSupplierItemDraftDefaults(),
                prices: supplierDefaultUnitId
                  ? [{ unitId: supplierDefaultUnitId, price: 0 }]
                  : [],
              },
            ]);
            setTried(false);
            setDirty(false);
          } else {
            onOpenChange(false);
          }
        }
      } catch (err) {
        toast.error("Could not save item", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      issues,
      pendingImageFile,
      imageRemoved,
      uomDrafts,
      master,
      supplierDrafts,
      supplierCurrency,
      supplierUnitOptions,
      supplierDefaultUnitId,
      mode,
      editingItem,
      existingMaster,
      createMutation,
      updateWithSuppliersMutation,
      utils,
      onSuccess,
      onOpenChange,
      uploadImage,
    ],
  );

  const reset = React.useCallback(() => {
    setModeState("create");
    setMasterState(getItemMasterDefaults());
    setExistingMaster(null);
    setEditingItem(null);
    setSupplierDrafts([]);
    setUomDrafts([]);
    setTried(false);
    setDirty(false);
    setDuplicateItem(null);
    setDuplicateDismissed(false);
    setPendingImageFileState(null);
    setImageRemoved(false);
    initializedRef.current = false;
  }, []);

  return {
    mode,
    master,
    existingMaster,
    editingItem,
    supplierDrafts,
    suppliers,
    units,
    categories,
    taxRates,
    uomDrafts,
    uomFactorLocked,
    usageCount,
    isDetailLoading,
    issues,
    tried,
    dirty,
    duplicateItem: duplicateDismissed ? null : duplicateItem,
    money,
    isSubmitting:
      createMutation.isPending ||
      updateWithSuppliersMutation.isPending ||
      isDetailLoading,
    pendingImageFile,
    imageRemoved,
    identityLocked: mode === "add-supplier" || mode === "existing",

    setMode,
    setMasterField,
    setMaster,
    setPendingImageFile,
    setImageRemoved,
    setBaseUnit,
    addUomDraft,
    removeUomDraft,
    updateUomDraft,
    setDefaultUnit,
    addSupplierDraft,
    removeSupplierDraft,
    updateSupplierDraft,
    supplierUnitOptions,
    supplierDefaultUnitId,
    addSupplierPrice,
    removeSupplierPrice,
    updateSupplierPrice,
    handleMasterNameBlur,
    dismissDuplicate,
    adoptDuplicate,
    errorFor,
    supplierCurrency,
    convertToBase,
    submit,
    reset,
  };
}
