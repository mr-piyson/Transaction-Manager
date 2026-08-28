"use client";

import { Plus, UserPlus } from "lucide-react";
import * as React from "react";
import { useSupplierForm } from "@/components/dialogs";
import { Button } from "@/components/ui/button";
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
    addSupplierDraft,
    removeSupplierDraft,
    updateSupplierDraft,
  } = form;
  const { openCreate } = useSupplierForm();

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
    <div className="space-y-3">
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
          onUpdate={updateSupplierDraft}
          onRemove={removeSupplierDraft}
        />
      ))}

      {canManageSupplierItems && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={addSupplierDraft}
          >
            <Plus className="size-4 mr-1" />
            Add supplier
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => openCreate()}
          >
            <UserPlus className="size-4 mr-1" />
            Create supplier
          </Button>
        </div>
      )}
    </div>
  );
}
