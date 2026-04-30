'use client';

import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  BoxIcon,
  DollarSign,
  MapPinIcon,
  Plus,
  Save,
  Building2,
  Trash2,
  Package,
} from 'lucide-react';
import { cn, formatAmount } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { useState } from 'react';
import { toast } from 'sonner';
import { ButtonGroup } from '@/components/ui/button-group';
import { SelectDialog } from '@/components/select-dialog';
import { PurchaseLineDialog } from './purchase-line-dialog';

function Supplier_List_Item({ data, className, ...props }: any) {
  const supplier = data;
  return (
    <div className={cn("flex items-center gap-3 p-2", className)} {...props}>
      <div className="bg-muted p-2 rounded-md">
        <Building2 className="size-4" />
      </div>
      <div>
        <p className="font-semibold">{supplier?.name}</p>
        <p className="text-xs text-muted-foreground">{supplier?.email || supplier?.phone}</p>
      </div>
    </div>
  );
}

function Warehouse_List_Item({ data, className, ...props }: any) {
  const warehouse = data;
  return (
    <div className={cn("flex items-center gap-3 p-2", className)} {...props}>
      <div className="bg-muted p-2 rounded-md">
        <MapPinIcon className="size-4" />
      </div>
      <div>
        <p className="font-semibold">{warehouse?.name}</p>
        <p className="text-xs text-muted-foreground">{warehouse?.address || 'No address'}</p>
      </div>
    </div>
  );
}

export default function NewPOPage() {
  const router = useRouter();
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);

  const { data: suppliers } = trpc.suppliers.list.useQuery({});
  const { data: warehouses } = trpc.warehouses.list.useQuery({});

  const createPO = trpc.purchaseOrders.create.useMutation({
    onSuccess: (data) => {
      toast.success('Purchase Order created successfully');
      router.push(`/app/purchase-order/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    if (!selectedSupplier) {
      toast.error('Please select a supplier');
      return;
    }
    if (!selectedWarehouse) {
      toast.error('Please select a destination warehouse');
      return;
    }
    if (lines.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    
    // Transform lines to match the TRPC input schema
    const formattedLines = lines.map(line => ({
      itemId: line.itemId,
      description: line.description,
      quantity: Number(line.quantity),
      unitCost: Math.round(Number(line.unitCost) * 1000), // convert BD back to fils
      taxAmt: 0, // Simplified
    }));

    createPO.mutate({
      supplierId: selectedSupplier.id,
      warehouseId: selectedWarehouse.id,
      lines: formattedLines,
    });
  };

  const total = lines.reduce((acc, l) => acc + (l.total || 0), 0);

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
        {/* ── Row 1: Back + Title + Actions ── */}
        <div className="flex items-center gap-2 px-2 pt-2 pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground h-8 w-8"
            onClick={() => router.push(`/app/purchase-order`)}
          >
            <ArrowLeft size={16} />
          </Button>

          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-semibold leading-tight truncate">New Purchase Order</span>
            <span className="text-xs text-muted-foreground truncate">Draft</span>
          </div>

          <div className="flex items-center gap-2 pr-1">
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs shadow-md shadow-primary/20"
              onClick={handleSave}
              disabled={createPO.isPending}
            >
              <Save size={14} />
              Create Draft PO
            </Button>
          </div>
        </div>

        {/* ── Row 2: Supplier & Warehouse Selection ── */}
        <div className="grid grid-cols-2 gap-2 px-2 py-2 border-b border-border/50 overflow-hidden">
          <SelectDialog<any>
            title="Select Supplier"
            data={suppliers ?? []}
            onSelect={setSelectedSupplier}
            searchFields={['name', 'email', 'phone']}
            cardRenderer={Supplier_List_Item}
            rowHeight={60}
            itemName="Suppliers"
          >
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal h-12',
                !selectedSupplier && 'text-muted-foreground',
              )}
            >
              <Building2 className="mr-2 size-5 text-muted-foreground shrink-0" />
              <div className="flex flex-col items-start overflow-hidden">
                {selectedSupplier ? (
                  <>
                    <span className="font-medium truncate">{selectedSupplier.name}</span>
                    <span className="text-xs text-muted-foreground truncate">Supplier</span>
                  </>
                ) : (
                  <span>Select a supplier</span>
                )}
              </div>
            </Button>
          </SelectDialog>

          <SelectDialog<any>
            title="Select Destination Warehouse"
            data={warehouses ?? []}
            onSelect={setSelectedWarehouse}
            searchFields={['name']}
            cardRenderer={Warehouse_List_Item}
            rowHeight={60}
            itemName="Warehouses"
          >
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal h-12',
                !selectedWarehouse && 'text-muted-foreground',
              )}
            >
              <MapPinIcon className="mr-2 size-5 text-muted-foreground shrink-0" />
              <div className="flex flex-col items-start overflow-hidden">
                {selectedWarehouse ? (
                  <>
                    <span className="font-medium truncate">{selectedWarehouse.name}</span>
                    <span className="text-xs text-muted-foreground truncate">Warehouse</span>
                  </>
                ) : (
                  <span>Select warehouse</span>
                )}
              </div>
            </Button>
          </SelectDialog>
        </div>

        {/* ── Row 3: Financial Summary ── */}
        <div className="grid grid-cols-1 divide-x divide-border bg-muted/40 text-center py-1 mx-2 mt-2 mb-2 rounded-md ">
          <div className="flex flex-col px-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Estimated Cost</span>
            <span className="text-sm font-semibold tabular-nums">{formatAmount(Math.round(total * 1000))}</span>
          </div>
        </div>

        {/* ── Row 4: Actions ── */}
        <div className="flex items-center gap-1.5 px-2 pb-2">
          <ButtonGroup className="w-full">
            <PurchaseLineDialog
              onSuccess={(newLine) => {
                setLines((prev) => [...prev, newLine]);
              }}
            >
              <Button
                variant="secondary"
                size={'sm'}
                className="h-8 border border-secondary gap-1.5 text-xs w-full"
              >
                <BoxIcon size={13} />
                Add Item
              </Button>
            </PurchaseLineDialog>
          </ButtonGroup>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 overflow-auto p-4">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-full">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Package size={24} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No items yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Start adding items to this purchase order using the 'Add Item' button above.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {lines.map((line, index) => (
              <div key={line.id} className="flex items-center gap-3 p-3 bg-card border rounded-lg shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{line.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Qty: {line.quantity}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">Cost: {formatAmount(Math.round(line.unitCost * 1000))}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-primary">{formatAmount(Math.round(line.total * 1000))}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setLines(prev => prev.filter(l => l.id !== line.id))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
