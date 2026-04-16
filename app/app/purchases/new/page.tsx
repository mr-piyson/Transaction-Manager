'use client';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Plus,
  Save,
  Store,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import PurchaseForm from './purchaseForm';
import { cn, formatAmount } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { SelectDialog } from '@/components/select-dialog';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';
import { SupplierCard } from '../../suppliers/supplier-card';
import { WarehouseCard } from '../../warehouses/WarehouseCard';
import { InventoryItemCard } from '../../suppliers/[supplierId]/supplierItems/SupplierItemCard';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function NewPurchasePage() {
  const router = useRouter();
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [isReceived, setIsReceived] = useState(false);
  const [lines, setLines] = useState<any[]>([]);

  const { data: suppliers } = trpc.suppliers.getSuppliers.useQuery();
  const { data: warehouses } = trpc.warehouses.getWarehouses.useQuery();
  const { data: inventoryItems } = trpc.inventory.getInventory.useQuery();

  const createPurchase = trpc.purchases.createFullPurchase.useMutation({
    onSuccess: (data) => {
      toast.success(isReceived ? 'Purchase received and stock updated' : 'Purchase draft saved');
      router.push(`/app/purchases`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create purchase');
    },
  });

  const handleSave = () => {
    if (!selectedSupplier) {
      toast.error('Please select a supplier');
      return;
    }
    if (lines.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    if (isReceived && !selectedWarehouse) {
      toast.error('Please select a warehouse to receive items');
      return;
    }

    createPurchase.mutate({
      supplierId: selectedSupplier.id,
      isReceived,
      warehouseId: selectedWarehouse?.id,
      lines: lines.map((l) => ({
        itemId: l.itemId,
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost),
      })),
    });
  };

  const total = lines.reduce((acc, l) => acc + l.total, 0);
  const progressPercent = 0;

  const handleSelectItem = (item: any) => {
    const newLine = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: item.id,
      description: item.name,
      quantity: 1,
      unitCost: Number(item.basePrice),
      total: Number(item.basePrice),
      itemRef: item,
    };
    setLines((prev) => [...prev, newLine]);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header
        className={cn(
          'w-full z-50 transition-all duration-300 print:hidden',
          'sticky top-0',
          'bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/60',
          'border-b border-border',
        )}
      >
        {/* ── Row 1: Back + Title + Save ── */}
        <div className="flex items-center gap-2 px-2 pt-2 pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground h-8 w-8"
            onClick={() => router.push(`/app/purchases`)}
          >
            <ArrowLeft size={16} />
          </Button>

          <div className="flex flex-col min-w-0">
            <span className="font-semibold leading-tight truncate">New Purchase</span>
            <span className="text-xs text-muted-foreground truncate">
              {isReceived ? 'Direct Receipt' : 'Draft Order'}
            </span>
          </div>

          <div className="ml-auto shrink-0">
            <Button onClick={handleSave} disabled={createPurchase.isPending}>
              {createPurchase.isPending ? 'Processing...' : (
                <>
                  <Save className="mr-2 h-4 w-4" /> 
                  {isReceived ? 'Complete Purchase' : 'Save Draft'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <Progress value={progressPercent} className="h-1 w-full" />

        {/* ── Row 2: Supplier Selection ── */}
        <div className="flex flex-col gap-2 p-2 border-b border-border/50">
          <div className="flex gap-2">
            <div className="flex-1">
              <SelectDialog<any>
                title="Select Supplier"
                data={suppliers}
                onSelect={setSelectedSupplier}
                searchFields={['name', 'phone', 'contactName']}
                cardRenderer={SupplierCard}
                rowHeight={72}
                itemName="Suppliers"
              >
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal h-12',
                    !selectedSupplier && 'text-muted-foreground',
                  )}
                >
                  <Store className="mr-2 h-4 w-4 shrink-0" />
                  <div className="flex flex-col items-start overflow-hidden">
                    {selectedSupplier ? (
                      <>
                        <span className="font-medium truncate">{selectedSupplier.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {selectedSupplier.contactName || 'No contact'}
                        </span>
                      </>
                    ) : (
                      <span>Select a supplier</span>
                    )}
                  </div>
                </Button>
              </SelectDialog>
            </div>

            <div className="flex flex-col justify-center px-4 border rounded-md bg-muted/20">
               <div className="flex items-center space-x-2">
                <Switch
                  id="receive-mode"
                  checked={isReceived}
                  onCheckedChange={setIsReceived}
                />
                <Label htmlFor="receive-mode" className="text-xs font-medium cursor-pointer">
                  Received
                </Label>
              </div>
            </div>
          </div>

          {isReceived && (
            <div className="animate-in slide-in-from-top-1 duration-200">
              <SelectDialog<any>
                title="Select Warehouse"
                data={warehouses}
                onSelect={setSelectedWarehouse}
                searchFields={['name', 'address']}
                cardRenderer={WarehouseCard}
                rowHeight={72}
                itemName="Warehouses"
              >
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal h-12 border-dashed',
                    !selectedWarehouse && 'text-muted-foreground',
                    'bg-warning/5 border-warning/30 hover:bg-warning/10'
                  )}
                >
                  <WarehouseIcon className="mr-2 h-4 w-4 shrink-0 text-warning" />
                  <div className="flex flex-col items-start overflow-hidden">
                    {selectedWarehouse ? (
                      <>
                        <span className="font-medium truncate text-warning">{selectedWarehouse.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          Items will be added to this stock
                        </span>
                      </>
                    ) : (
                      <span className="text-warning">Select receiving warehouse...</span>
                    )}
                  </div>
                </Button>
              </SelectDialog>
            </div>
          )}
        </div>

        {/* ── Row 3: Summary ── */}
        <div className="flex items-center justify-between bg-muted/40 px-4 py-2 mx-2 mt-2 mb-2 rounded-md ">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Total Cost</span>
            <span className="text-lg font-bold tabular-nums text-primary">{formatAmount(total)}</span>
        </div>

        {/* ── Row 4: Actions ── */}
        <div className=" flex items-center gap-1.5 px-2 pb-2">
          <SelectDialog<any>
            onSelect={handleSelectItem}
            data={inventoryItems as any}
            searchFields={['code', 'name', 'description']}
            cardRenderer={InventoryItemCard as any}
            rowHeight={72}
          >
            <Button size="sm" className="h-8 gap-1.5 text-xs flex-1 sm:flex-none">
              <Plus size={13} />
              Add Item
            </Button>
          </SelectDialog>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <PurchaseForm lines={lines} setLines={setLines} />
      </main>
    </div>
  );
}
