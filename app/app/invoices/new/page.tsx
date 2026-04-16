'use client';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  BoxIcon,
  ChevronLeft,
  DollarSign,
  Group,
  HandCoinsIcon,
  Package,
  Plus,
  Save,
  User,
} from 'lucide-react';
import InvoiceForm from './invoiceForm';
import { cn, formatAmount } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SelectDialog } from '@/components/select-dialog';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { CreateInvoiceLineDialog } from './invoice-line-dialog';
import { useState } from 'react';
import { CustomerCard } from '../../customers/customerCard';
import { toast } from 'sonner';
import { SimpleItemCard } from '@/components/item-card';

export default function InvoiceEditor() {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);

  const { data: customers } = trpc.customers.getCustomers.useQuery();
  const { data: allItems } = trpc.items.getItems.useQuery();

  // Filter items to only show services or products with stock
  // But maybe we want to show all and disable? The user said "view only available stock"
  // Let's filter out products with 0 stock if they are products.
  const availableItems = allItems?.filter((item) => {
    if (item.type === 'SERVICE') return true;
    const totalStock = item.stockEntries?.reduce((acc: number, s: any) => acc + s.quantity, 0) || 0;
    return totalStock > 0;
  });

  const createInvoice = trpc.invoices.createFullInvoice.useMutation({
    onSuccess: (data) => {
      toast.success('Invoice created successfully');
      router.push(`/app/invoices/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create invoice');
    },
  });

  const handleSave = (isCompleted: boolean = false) => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    if (lines.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    createInvoice.mutate({
      customerId: selectedCustomer.id,
      isCompleted,
      lines: lines.map((l) => ({
        itemId: l.itemId,
        inventoryItemId: l.inventoryItemId,
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        purchasePrice: Number(l.purchasePrice),
      })),
    });
  };

  const total = lines.reduce((acc, l) => acc + (l.total || 0), 0);
  const amountPaid = 0;
  const balanceDue = total;
  const progressPercent = 0;

  const handleSelectItem = (item: any) => {
    const newLine = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: item.id,
      inventoryItemId: item.id,
      description: item.name,
      quantity: 1,
      unitPrice: Number(item.salesPrice),
      purchasePrice: Number(item.purchasePrice),
      total: Number(item.salesPrice),
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
        {/* ── Row 1: Back + Invoice ID + Status ── */}
        <div className="flex items-center gap-2 px-2 pt-2 pb-1">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground h-8 w-8"
            onClick={() => router.push(`/app/invoices`)}
          >
            <ArrowLeft size={16} />
          </Button>

          <div className="flex flex-col min-w-0">
            <span className="font-semibold leading-tight truncate">New Invoice</span>
            <span className="text-xs text-muted-foreground truncate">Draft</span>
          </div>

          <div className="ml-auto shrink-0 flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={createInvoice.isPending}
            >
              {createInvoice.isPending ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={createInvoice.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {createInvoice.isPending ? (
                'Processing...'
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Finalize & Send
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Progress bar ── */}
        <Progress value={progressPercent} className="h-1 w-full" />

        {/* ── Row 2: Customer Selection ── */}
        <div className="px-2 py-2 border-b border-border/50">
          <SelectDialog<any>
            title="Select Customer"
            data={customers}
            onSelect={setSelectedCustomer}
            searchFields={['name', 'phone', 'address']}
            cardRenderer={CustomerCard}
            rowHeight={72}
            itemName="Customers"
          >
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal h-12',
                !selectedCustomer && 'text-muted-foreground',
              )}
            >
              <User className="mr-2 h-4 w-4 shrink-0" />
              <div className="flex flex-col items-start overflow-hidden">
                {selectedCustomer ? (
                  <>
                    <span className="font-medium truncate">{selectedCustomer.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {selectedCustomer.phone || 'No phone'}
                    </span>
                  </>
                ) : (
                  <span>Select a customer</span>
                )}
              </div>
            </Button>
          </SelectDialog>
        </div>

        {/* ── Row 3: Financial Summary ── */}
        <div className="grid grid-cols-3 divide-x divide-border bg-muted/40 text-center py-1 mx-2 mt-2 mb-2 rounded-md ">
          <div className="flex flex-col px-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</span>
            <span className="text-sm font-semibold tabular-nums">{formatAmount(total)}</span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Paid</span>
            <span className="text-sm font-semibold tabular-nums text-success-foreground">
              {formatAmount(amountPaid)}
            </span>
          </div>
          <div className="flex flex-col px-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Due</span>
            <span
              className={cn(
                'text-sm font-semibold tabular-nums',
                balanceDue > 0 ? 'text-destructive' : 'text-success-foreground',
              )}
            >
              {formatAmount(balanceDue)}
            </span>
          </div>
        </div>

        {/* ── Row 4: Actions ── */}
        <div className=" flex items-center gap-1.5 px-2 pb-2">
          <SelectDialog<any>
            onSelect={handleSelectItem}
            data={availableItems as any}
            searchFields={['sku', 'name', 'description']}
            cardRenderer={SimpleItemCard as any}
            rowHeight={72}
            itemName="Items"
          >
            <Button size="sm" className="h-8 gap-1.5 text-xs flex-1 sm:flex-none">
              <Plus size={13} />
              Add Product/Service
            </Button>
          </SelectDialog>

          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs flex-1 sm:flex-none"
            onClick={() => {
              const newGroup = {
                id: Math.random().toString(36).substr(2, 9),
                isGroup: true,
                description: 'New Group',
                total: 0,
              };
              setLines((prev) => [...prev, newGroup]);
            }}
          >
            <Group size={13} />
            Group
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <InvoiceForm lines={lines} setLines={setLines} />
      </main>
    </div>
  );
}
