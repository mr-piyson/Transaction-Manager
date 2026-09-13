"use client";

import * as React from "react";
import { SupplierCard } from "./supplier-card";
import type { UseItemFormReturn } from "./use-item-form";

interface SuppliersTabProps {
  form: UseItemFormReturn;
  suppliers: any[];
  canManageSupplierItems: boolean;
}

export function SuppliersTab({
  form,
  suppliers,
  canManageSupplierItems,
}: SuppliersTabProps) {
  const {
    mode,
    supplierDrafts,
    errors,
    removeSupplierDraft,
    updateSupplierDraft,
  } = form;

  const [expandedDrafts, setExpandedDrafts] = React.useState<Set<string>>(
    new Set(),
  );

  const toggleExpand = React.useCallback((tempId: string) => {
    setExpandedDrafts((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) {
        next.delete(tempId);
      } else {
        next.add(tempId);
      }
      return next;
    });
  }, []);

  // Auto-expand drafts with errors
  React.useEffect(() => {
    setExpandedDrafts((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const draft of supplierDrafts) {
        const draftErrors = errors.suppliers[draft.tempId];
        if (draftErrors && Object.keys(draftErrors).length > 0) {
          if (!next.has(draft.tempId)) {
            next.add(draft.tempId);
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [errors, supplierDrafts]);

  const supplierIdCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const draft of supplierDrafts) {
      if (draft.supplierId) {
        counts.set(draft.supplierId, (counts.get(draft.supplierId) ?? 0) + 1);
      }
    }
    return counts;
  }, [supplierDrafts]);

  return (
    <div className="space-y-1.5">
      {/* Desktop table header */}
      {supplierDrafts.length > 0 && (
        <div className="hidden sm:grid grid-cols-[1fr_70px_100px_auto] gap-2 px-2 py-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          <span>Supplier</span>
          <span>Price</span>
          <span>Currency</span>
          <span className="w-16" />
        </div>
      )}

      {supplierDrafts.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No supplier prices added yet. Click &quot;Add supplier&quot; to begin.
        </p>
      )}

      {supplierDrafts.map((draft) => (
        <SupplierCard
          key={draft.tempId}
          draft={draft}
          suppliers={suppliers}
          errors={errors.suppliers[draft.tempId]}
          isDuplicate={
            draft.supplierId !== "" &&
            (supplierIdCounts.get(draft.supplierId) ?? 0) > 1
          }
          disabled={!canManageSupplierItems}
          supplierRequired={false}
          canRemove={mode === "edit" || supplierDrafts.length > 1}
          expanded={expandedDrafts.has(draft.tempId)}
          onToggleExpand={() => toggleExpand(draft.tempId)}
          onUpdate={updateSupplierDraft}
          onRemove={removeSupplierDraft}
        />
      ))}
    </div>
  );
}
