'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SupplierCard } from './supplier-card';
import type { UseItemFormReturn } from './use-item-form';

interface SuppliersTabProps {
  form: UseItemFormReturn;
  suppliers: any[];
  canManageSupplierItems: boolean;
}

export function SuppliersTab({ form, suppliers, canManageSupplierItems }: SuppliersTabProps) {
  const { supplierDrafts, errors, addSupplierDraft, removeSupplierDraft, updateSupplierDraft } =
    form;

  // Detect duplicate supplier IDs across drafts
  const supplierIdCounts = new Map<string, number>();
  for (const draft of supplierDrafts) {
    if (draft.supplierId) {
      supplierIdCounts.set(draft.supplierId, (supplierIdCounts.get(draft.supplierId) ?? 0) + 1);
    }
  }

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
            draft.supplierId !== '' &&
            (supplierIdCounts.get(draft.supplierId) ?? 0) > 1
          }
          disabled={!canManageSupplierItems}
          canRemove={supplierDrafts.length > 1}
          onUpdate={updateSupplierDraft}
          onRemove={removeSupplierDraft}
        />
      ))}

      {canManageSupplierItems && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={addSupplierDraft}
        >
          <Plus className="size-4 mr-1" />
          Add supplier
        </Button>
      )}
    </div>
  );
}
