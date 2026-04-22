'use client';
import { Button } from '@/components/ui/button';
// Using any for type compatibility
import { FileText, Box, Trash2 } from 'lucide-react';
import { SelectDialog } from '@/components/select-dialog';
import { trpc } from '@/lib/trpc/client';
import { UniversalContextMenu } from '@/components/context-menu';
import { alert } from '@/components/Alert-dialog';
import { Item } from '@prisma/client';
import InvoiceItemCard from './invoiceItem';
import { InvoiceLineDialog, ItemSelectionDialog } from './invoice-line-dialog';
import InvoiceItemCardGroup from './InvoiceItemGroup';
export default function InvoiceForm({
  lines,
  setLines,
  items,
}: {
  lines: any[];
  setLines: React.Dispatch<React.SetStateAction<any[]>>;
  items: any[];
}) {
  const utils = trpc.useUtils();

  const handleSelectItem = (item: any, parentId?: string) => {
    const newLine = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: item.id,
      inventoryItemId: item.id,
      description: item.name,
      quantity: 1,
      unitPrice: Number(item.salesPrice) / 1000,
      purchasePrice: Number(item.purchasePrice) / 1000,
      total: Number(item.salesPrice) / 1000,
      parentId: parentId,
      itemRef: item,
    };
    setLines((prev) => [...prev, newLine]);
  };

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileText size={24} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No items yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-50">
          Start adding items to this invoice using the 'Add Item' button above.
        </p>
      </div>
    );
  }

  const regularLines = lines.filter((l: any) => !l.isGroup && !l.parentId);
  const groups = lines.filter((l: any) => l.isGroup);

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Render Groups */}
      {groups.map((g: any) => {
        const childLines = lines.filter((l: any) => l.parentId === g.id);
        const groupTotal = childLines.reduce((acc: number, l: any) => acc + l.total, 0);
        return (
          <UniversalContextMenu
            key={g.id}
            items={[
              {
                id: 'delete',
                label: 'Delete',
                icon: Trash2,
                onClick: async () => {
                  const confirmed = await alert.delete({
                    title: 'Delete Group',
                    description: 'Are you sure you want to delete this group? ' + g.id,
                  });
                  if (confirmed) {
                    setLines((prev) => prev.filter((l) => l.id !== g.id && l.parentId !== g.id));
                  }
                },
                destructive: true,
                type: 'item',
              },
            ]}
          >
            <InvoiceItemCardGroup
              key={g.id}
              title={g.description || 'Group'}
              totalQty={groupTotal}
              actionSlot={
                <InvoiceLineDialog
                  onSuccess={(newLine) => {
                    setLines((prev) => [...prev, { ...newLine, parentId: g.id }]);
                  }}
                >
                  <Button size="sm" className="h-8 gap-1.5 text-xs flex-1 sm:flex-none">
                    <Box size={13} />
                    Add Item
                  </Button>
                </InvoiceLineDialog>
              }
            >
              {childLines.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No items in this group
                </div>
              ) : (
                childLines.map((line: any) => (
                  <InvoiceItemCard
                    key={line.id}
                    line={line as any}
                    onDelete={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                    onUpdate={(updatedLine) =>
                      setLines((prev) => prev.map((l) => (l.id === line.id ? updatedLine : l)))
                    }
                  />
                ))
              )}
            </InvoiceItemCardGroup>
          </UniversalContextMenu>
        );
      })}
      {/* Render Rigular Lines */}
      {regularLines.map((line: any) => (
        <InvoiceItemCard
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
