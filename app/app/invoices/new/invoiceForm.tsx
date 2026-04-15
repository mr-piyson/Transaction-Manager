'use client';
import { Button } from '@/components/ui/button';
// Using any for type compatibility
import { FileText, Box, Trash2 } from 'lucide-react';
import { SelectDialog } from '@/components/select-dialog';
import { trpc } from '@/lib/trpc/client';
import { UniversalContextMenu } from '@/components/context-menu';
import { alert } from '@/components/Alert-dialog';
import { Item } from '@prisma/client';
// import InvoiceItemCardGroup from './invoiceItemGroup';
import InvoiceItemCard from './invoiceItem';
import { InventoryItemCard } from '../../suppliers/[supplierId]/supplierItems/SupplierItemCard';
import { useState } from 'react';

export default function InvoiceForm() {
  const utils = trpc.useUtils();
  const { data: inventoryItems } = trpc.inventory.getInventory.useQuery();

  const handleSelectItem = (item: Item, parentId?: number) => {};

  const [lines, setLines] = useState([]);

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
    <div className="flex flex-col gap-4">
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
                },
                destructive: true,
                type: 'item',
              },
            ]}
            children={undefined}
          >
            {/* <InvoiceItemCardGroup
              key={g.id}
              title={g.description || 'Group'}
              totalQty={groupTotal}
              actionSlot={
                <SelectDialog<any>
                  onSelect={(item) => handleSelectItem(item, g.id)}
                  data={inventoryItems as any}
                  searchFields={['code', 'name', 'description']}
                  cardRenderer={InventoryItemCard as any}
                  rowHeight={72}
                >
                  <Button size="sm" className="h-8 gap-1.5 text-xs flex-1 sm:flex-none">
                    <Box size={13} />
                    Add Item
                  </Button>
                </SelectDialog>
              }
            >
              {childLines.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No items in this group
                </div>
              ) : (
                childLines.map((line: any) => <InvoiceItemCard key={line.id} line={line as any} />)
              )}
            </InvoiceItemCardGroup> */}
          </UniversalContextMenu>
        );
      })}
      {/* Render Rigular Lines */}
      {regularLines.map((line: any) => (
        <InvoiceItemCard key={line.id} line={line as any} />
      ))}
    </div>
  );
}
