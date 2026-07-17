'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import {
  type ItemMasterValues,
  type SupplierItemDraft,
  getItemMasterDefaults,
  getSupplierItemDraftDefaults,
} from '@/lib/validations/unified-item';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Mode = 'create' | 'existing' | 'add-supplier';

export type MasterFieldErrors = Partial<Record<keyof ItemMasterValues, string>>;

export interface SupplierDraftErrors {
  [tempId: string]: Partial<Record<keyof SupplierItemDraft, string>>;
}

export interface FormErrors {
  master: MasterFieldErrors;
  suppliers: SupplierDraftErrors;
}

export interface UseItemFormReturn {
  mode: Mode;
  master: ItemMasterValues;
  existingMaster: any | null;
  supplierDrafts: SupplierItemDraft[];
  errors: FormErrors;
  isSubmitting: boolean;
  pendingImageFile: File | null;

  setMode: (mode: Mode) => void;
  setMasterField: <K extends keyof ItemMasterValues>(field: K, value: ItemMasterValues[K]) => void;
  setMaster: (master: ItemMasterValues) => void;
  setPendingImageFile: (file: File | null) => void;

  addSupplierDraft: () => void;
  removeSupplierDraft: (tempId: string) => void;
  updateSupplierDraft: (tempId: string, patch: Partial<SupplierItemDraft>) => void;

  handleMasterNameBlur: () => void;
  submit: (keepOpen?: boolean) => Promise<void>;
  reset: () => void;
}

export interface UseItemFormOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected supplier for "add-supplier" mode */
  initialSupplierId?: string;
  /** Pre-existing item for "add-supplier" mode */
  initialItem?: any;
  onSuccess?: (itemId: string) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

let nextTempId = 0;
function makeTempId() {
  return `_draft_${++nextTempId}_${Date.now()}`;
}

export function useItemForm({
  open,
  onOpenChange,
  initialSupplierId,
  initialItem,
  onSuccess,
}: UseItemFormOptions): UseItemFormReturn {
  const utils = trpc.useUtils();

  // Determine initial mode
  const getInitialMode = React.useCallback((): Mode => {
    if (initialItem?.id) return 'add-supplier';
    return 'create';
  }, [initialItem?.id]);

  const [mode, setModeState] = React.useState<Mode>(getInitialMode);
  const [master, setMasterState] = React.useState<ItemMasterValues>(getItemMasterDefaults);
  const [existingMaster, setExistingMaster] = React.useState<any | null>(null);
  const [supplierDrafts, setSupplierDrafts] = React.useState<SupplierItemDraft[]>(() => {
    if (initialSupplierId && initialItem) {
      return [
        {
          ...getSupplierItemDraftDefaults(),
          tempId: makeTempId(),
          supplierId: initialSupplierId,
        },
      ];
    }
    return [getSupplierItemDraftDefaults()];
  });
  const [errors, setErrors] = React.useState<FormErrors>({ master: {}, suppliers: {} });
  const [pendingImageFile, setPendingImageFileState] = React.useState<File | null>(null);

  const setPendingImageFile = React.useCallback((file: File | null) => {
    setPendingImageFileState(file);
  }, []);

  // ── Image upload helper ──────────────────────────────────────────────────
  const uploadImage = React.useCallback(async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Upload failed');
      }
      const data = await res.json();
      return data.storagePath as string;
    } catch (err) {
      console.error('[uploadImage]', err);
      toast.error('Image upload failed', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
      return null;
    }
  }, []);

  // Data queries
  const { data: suppliersData } = trpc.suppliers.list.useQuery(
    { limit: 200 },
    { enabled: open },
  );
  const suppliers = React.useMemo(() => {
    const list = Array.isArray(suppliersData) ? suppliersData : (suppliersData?.data ?? []);
    return list;
  }, [suppliersData]);

  const { data: existingItemsData } = trpc.items.list.useQuery(
    { limit: 200 },
    { enabled: open },
  );
  const existingItems = React.useMemo(() => {
    const list = Array.isArray(existingItemsData) ? existingItemsData : (existingItemsData?.data ?? []);
    return list;
  }, [existingItemsData]);

  const { data: categories } = trpc.categories.list.useQuery(undefined, { enabled: open });
  const { data: units } = trpc.units.list.useQuery(undefined, { enabled: open });
  const { data: taxRates } = trpc.settings.taxRates.list.useQuery(undefined, { enabled: open });
  const generateSku = trpc.categories.generateSku.useMutation();

  // Mutations
  const createMutation = trpc.items.createWithSupplierItems.useMutation({
    onSuccess(data) {
      utils.items.list.invalidate();
      utils.suppliers.list.invalidate();
      toast.success('Item created with supplier prices', {
        description: data.item.name,
      });
      onSuccess?.(data.item.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error('Failed to create item', { description: err.message });
    },
  });

  // Reset on open — only when `open` transitions to true or initial props change
  const prevOpenRef = React.useRef(open);
  React.useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    // Only reset when dialog first opens (false → true) or initial props change while open
    if (!open) return;
    if (wasOpen && !initialItem?.id && !initialSupplierId) return;

    const m = getInitialMode();
    setModeState(m);
    if (initialItem?.id) {
      setMasterState(getItemMasterDefaults(initialItem));
      setExistingMaster(initialItem);
    } else {
      const unitList = Array.isArray(units) ? units : [];
      const defaultUnit = unitList.find((u: any) => u.isDefault);
      const defaults = getItemMasterDefaults();
      if (defaultUnit) {
        defaults.unitId = defaultUnit.id;
        defaults.unit = defaultUnit.code;
      }
      setMasterState(defaults);
      setExistingMaster(null);
    }
    setSupplierDrafts(
      initialSupplierId
        ? [
            {
              ...getSupplierItemDraftDefaults(),
              tempId: makeTempId(),
              supplierId: initialSupplierId,
            },
          ]
        : [getSupplierItemDraftDefaults()],
    );
    setErrors({ master: {}, suppliers: {} });
    setPendingImageFileState(null);
  }, [open, getInitialMode, initialItem, initialSupplierId, units]);

  // ── Master field setters ────────────────────────────────────────────────

  const setMode = React.useCallback((m: Mode) => {
    setModeState(m);
  }, []);

  const setMasterField = React.useCallback(
    <K extends keyof ItemMasterValues>(field: K, value: ItemMasterValues[K]) => {
      setMasterState((prev) => ({ ...prev, [field]: value }));
      // Clear error for this field
      setErrors((prev) => ({
        ...prev,
        master: { ...prev.master, [field]: undefined },
      }));
    },
    [],
  );

  const setMaster = React.useCallback((m: ItemMasterValues) => {
    setMasterState(m);
  }, []);

  // ── Supplier draft setters ──────────────────────────────────────────────

  const addSupplierDraft = React.useCallback(() => {
    setSupplierDrafts((prev) => [...prev, getSupplierItemDraftDefaults()]);
  }, []);

  const removeSupplierDraft = React.useCallback((tempId: string) => {
    setSupplierDrafts((prev) => prev.filter((d) => d.tempId !== tempId));
    setErrors((prev) => {
      const next = { ...prev.suppliers };
      delete next[tempId];
      return { ...prev, suppliers: next };
    });
  }, []);

  const updateSupplierDraft = React.useCallback(
    (tempId: string, patch: Partial<SupplierItemDraft>) => {
      setSupplierDrafts((prev) =>
        prev.map((d) => {
          if (d.tempId !== tempId) return d;
          const updated = { ...d, ...patch };

          // Auto-fill currency from supplier
          if (patch.supplierId) {
            const supplier = suppliers.find((s: any) => s.id === patch.supplierId);
            if (supplier) {
              updated.currency = (supplier as any).currencyCode ?? updated.currency;
              // Auto-fill master from first supplier if in create mode and master is empty
              if (mode === 'create') {
                setMasterState((prevMaster) => {
                  const next = { ...prevMaster };
                  if (!next.sku && updated.supplierSku) {
                    next.sku = updated.supplierSku;
                  }
                  return next;
                });
              }
            }
          }

          return updated;
        }),
      );

      // Clear error for this field
      setErrors((prev) => {
        const draftErrors = { ...prev.suppliers[tempId] };
        if (patch.supplierId !== undefined) delete draftErrors.supplierId;
        if (patch.supplierSku !== undefined) delete draftErrors.supplierSku;
        if (patch.basePrice !== undefined) delete draftErrors.basePrice;
        return {
          ...prev,
          suppliers: { ...prev.suppliers, [tempId]: draftErrors },
        };
      });
    },
    [suppliers, mode],
  );

  // ── Name blur → detect existing item ────────────────────────────────────

  const handleMasterNameBlur = React.useCallback(() => {
    if (!master.name || mode !== 'create') return;
    const match = existingItems.find(
      (i: any) => i.name.toLowerCase().trim() === master.name.toLowerCase().trim(),
    );
    if (match) {
      setExistingMaster(match);
      setMasterState(getItemMasterDefaults(match));
      setModeState('existing');
    }
  }, [master.name, mode, existingItems]);

  // ── Validation ──────────────────────────────────────────────────────────

  const validate = React.useCallback((): boolean => {
    const masterErrors: MasterFieldErrors = {};

    if (mode === 'create') {
      if (!master.name.trim()) masterErrors.name = 'Item name is required';
      if (!master.sku.trim()) masterErrors.sku = 'Internal SKU is required';
      if (!master.unit.trim()) masterErrors.unit = 'Unit of measure is required';

      const skuTaken = existingItems.some(
        (i: any) => i.sku.toLowerCase().trim() === master.sku.toLowerCase().trim(),
      );
      if (skuTaken) masterErrors.sku = 'Internal SKU already exists';
    }

    const supplierErrors: SupplierDraftErrors = {};
    let hasSupplierErrors = false;

    for (const draft of supplierDrafts) {
      const draftErrors: Partial<Record<keyof SupplierItemDraft, string>> = {};
      if (!draft.supplierId) draftErrors.supplierId = 'Select a supplier';
      if (draft.basePrice < 0) draftErrors.basePrice = 'Valid price is required';

      // Check duplicate supplier in drafts
      const duplicates = supplierDrafts.filter((d) => d.supplierId === draft.supplierId);
      if (draft.supplierId && duplicates.length > 1) {
        draftErrors.supplierId = 'This supplier is already added';
      }

      if (Object.keys(draftErrors).length > 0) {
        supplierErrors[draft.tempId] = draftErrors;
        hasSupplierErrors = true;
      }
    }

    const newErrors: FormErrors = {
      master: masterErrors,
      suppliers: supplierErrors,
    };
    setErrors(newErrors);

    return Object.keys(masterErrors).length === 0 && !hasSupplierErrors;
  }, [mode, master, supplierDrafts, existingItems]);

  // ── Submit ──────────────────────────────────────────────────────────────

  const submit = React.useCallback(
    async (keepOpen = false) => {
      if (!validate()) return;

      // Upload pending image before creating item
      let imageUrl: string | undefined;
      if (pendingImageFile) {
        const uploaded = await uploadImage(pendingImageFile);
        if (uploaded) {
          imageUrl = uploaded;
        }
      }

      if (mode === 'existing' && existingMaster) {
        // Only add supplier items to existing item
        const payload = {
          item: {
            type: existingMaster.type ?? 'PRODUCT',
            sku: existingMaster.sku,
            name: existingMaster.name,
            barcode: existingMaster.barcode ?? undefined,
            description: existingMaster.description ?? undefined,
            image: imageUrl ?? existingMaster.image ?? undefined,
            unit: existingMaster.unit ?? 'pcs',
            unitId: existingMaster.unitId ?? undefined,
            isSaleable: existingMaster.isSaleable ?? true,
            isPurchasable: existingMaster.isPurchasable ?? true,
            purchasePrice: Number(existingMaster.purchasePrice) ?? 0,
            salesPrice: Number(existingMaster.salesPrice) ?? 0,
            minStock: existingMaster.minStock ?? 0,
            reorderPoint: existingMaster.reorderPoint ?? 0,
            reorderQty: existingMaster.reorderQty ?? 0,
            categoryId: existingMaster.categoryId ?? undefined,
            taxRateId: existingMaster.taxRateId ?? undefined,
            isActive: existingMaster.isActive ?? true,
          },
          supplierItems: supplierDrafts.map((d) => ({
            supplierId: d.supplierId,
            supplierSku: d.supplierSku,
            supplierName: d.supplierName,
            basePrice: String(d.basePrice),
            currency: d.currency,
            leadTimeDays: d.leadTimeDays,
            minOrderQty: String(d.minOrderQty),
            notes: d.notes,
          })),
        };
        createMutation.mutate(payload);
      } else if (mode === 'create') {
        const payload = {
          item: {
            type: master.type,
            sku: master.sku,
            name: master.name,
            barcode: master.barcode,
            description: master.description,
            image: imageUrl ?? master.image,
            unit: master.unit,
            unitId: master.unitId,
            isSaleable: master.isSaleable,
            isPurchasable: master.isPurchasable,
            purchasePrice: String(master.purchasePrice),
            salesPrice: String(master.salesPrice),
            minStock: master.minStock,
            reorderPoint: master.reorderPoint,
            reorderQty: master.reorderQty,
            categoryId: master.categoryId,
            taxRateId: master.taxRateId,
            isActive: master.isActive,
          },
          supplierItems: supplierDrafts.map((d) => ({
            supplierId: d.supplierId,
            supplierSku: d.supplierSku,
            supplierName: d.supplierName,
            basePrice: String(d.basePrice),
            currency: d.currency,
            leadTimeDays: d.leadTimeDays,
            minOrderQty: String(d.minOrderQty),
            notes: d.notes,
          })),
        };
        createMutation.mutate(payload);
      }
    },
    [validate, mode, existingMaster, master, supplierDrafts, createMutation, pendingImageFile, uploadImage],
  );

  // ── Reset ───────────────────────────────────────────────────────────────

  const reset = React.useCallback(() => {
    setModeState('create');
    setMasterState(getItemMasterDefaults());
    setExistingMaster(null);
    setSupplierDrafts([getSupplierItemDraftDefaults()]);
    setErrors({ master: {}, suppliers: {} });
    setPendingImageFileState(null);
  }, []);

  return {
    mode,
    master,
    existingMaster,
    supplierDrafts,
    errors,
    isSubmitting: createMutation.isPending,
    pendingImageFile,
    setMode,
    setMasterField,
    setMaster,
    setPendingImageFile,
    addSupplierDraft,
    removeSupplierDraft,
    updateSupplierDraft,
    handleMasterNameBlur,
    submit,
    reset,
  };
}
