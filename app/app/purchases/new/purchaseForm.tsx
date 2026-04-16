'use client';
import { FileText, Trash2 } from 'lucide-react';
import { UniversalContextMenu } from '@/components/context-menu';
import { alert } from '@/components/Alert-dialog';
import PurchaseItemCard from './purchaseItem';
import React from 'react';

export default function PurchaseForm({
  lines,
  setLines,
}: {
  lines: any[];
  setLines: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileText size={24} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No items yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-50">
          Start adding items to this purchase using the 'Add Item' button above.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {lines.map((line: any) => (
        <PurchaseItemCard
          key={line.id}
          line={line as any}
          onDelete={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
          onUpdate={(updatedLine) =>
            setLines((prev) => prev.map((l) => (l.id === line.id ? updatedLine : l)))
          }
        />
      ))}
    </div>
  );
}
