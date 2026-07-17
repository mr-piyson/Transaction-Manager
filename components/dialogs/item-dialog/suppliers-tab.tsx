'use client';

import { Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupplierForm } from '@/components/dialogs';
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
  const { openCreate } = useSupplierForm();

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
