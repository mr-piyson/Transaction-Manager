'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  UserPlus,
  Package,
  ChevronRight,
  CheckCircle2,
  ShoppingCart,
  User,
  DollarSign,
  Layers,
  Search,
  Box,
  WarehouseIcon,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn, formatAmount } from '@/lib/utils';
import { SelectDialog } from '@/components/select-dialog';
import { CreateCustomerDialog } from '../../customers/create-customer-dialog';
import { CreateStockItemDialog } from '../../stock-items/create-stockItem-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

type InvoiceLine = {
  stockItemId?: number;
  inventoryItemId?: number;
  description: string;
  quantity: number;
  salesPrice: number;
  purchasePrice: number;
  sku?: string;
};

export default function NewInvoicePage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  // State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [isSubmiting, setIsSubmitting] = useState(false);

  // Queries
  const { data: customers } = trpc.customers.getCustomers.useQuery();
  const { data: stockItems } = trpc.stockItems.getStockItems.useQuery();
  const { data: warehouses } = trpc.warehouses.getWarehouses.useQuery();

  // Mutation
  const createInvoiceMutation = trpc.invoices.createFullInvoice.useMutation();

  const selectedCustomer = customers?.find((c) => c.id === selectedCustomerId);

  const handleAddLine = (item: any) => {
    const newLine: InvoiceLine = {
      stockItemId: item.id,
      description: item.name,
      quantity: 1,
      salesPrice: item.salesPrice || 0,
      purchasePrice: item.purchasePrice || 0,
      sku: item.sku,
    };
    setLines([...lines, newLine]);
    toast.success(`${item.name} added to invoice`);
  };

  const updateLine = (index: number, updates: Partial<InvoiceLine>) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], ...updates };
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return lines.reduce((acc, line) => acc + line.salesPrice * line.quantity, 0);
  };

  const handleCreateInvoice = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }
    if (lines.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createInvoiceMutation.mutateAsync({
        customerId: selectedCustomerId,
        warehouseId: warehouseId || undefined,
        lines: lines.map((l) => ({
          stockItemId: l.stockItemId,
          description: l.description,
          quantity: l.quantity,
          salesPrice: l.salesPrice,
          purchasePrice: l.purchasePrice,
        })),
        isCompleted: false, // Keep as draft initially
      });

      toast.success('Invoice created successfully');
      router.push(`/app/invoices/${result.id}/editor`);
      utils.invoices.getInvoices.invalidate();
    } catch (error) {
      toast.error('Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden safe-p-top">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-4 border-b shrink-0 bg-background/80 backdrop-blur-lg sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">New Invoice</h1>
          <p className="text-xs text-muted-foreground">Create a fresh sales transaction</p>
        </div>
        <Badge variant="outline" className="h-6 font-mono bg-muted/50">
          DRAFT
        </Badge>
      </header>

      <main className="flex-1 overflow-y-auto pb-40">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          {/* Section: Customer */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <User className="size-4" /> Customer Selection
              </h2>
            </div>

            <Card className="p-1 border-2 border-dashed border-primary/20 bg-primary/5">
              <div className="flex gap-1">
                <SelectDialog<any>
                  title="Select Customer"
                  data={customers}
                  searchFields={['name', 'phone', 'email']}
                  onSelect={(c) => setSelectedCustomerId(c.id)}
                  cardRenderer={({ data }) => (
                    <div className="flex items-center gap-4 p-3 border-b border-border/50 hover:bg-accent/50 cursor-pointer">
                      <div className="bg-primary/10 p-2 rounded-full shrink-0">
                        <User size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{data.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {data.phone} • {data.email || 'No Email'}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  )}
                  rowHeight={60}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      'flex-1 h-16 justify-start gap-4 hover:bg-background/50 transition-all rounded-xl',
                      selectedCustomer ? 'bg-background shadow-sm' : '',
                    )}
                  >
                    <div
                      className={cn(
                        'p-3 rounded-full shrink-0',
                        selectedCustomer
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <User size={20} />
                    </div>
                    <div className="text-left min-w-0">
                      {selectedCustomer ? (
                        <>
                          <div className="font-bold text-sm truncate">{selectedCustomer.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {selectedCustomer.phone}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-sm">Choose Customer</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            Select from address book
                          </div>
                        </>
                      )}
                    </div>
                  </Button>
                </SelectDialog>

                <CreateCustomerDialog onSuccess={(c) => setSelectedCustomerId(c.id)}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-16 w-16 rounded-xl hover:bg-primary/10 hover:text-primary"
                  >
                    <UserPlus className="size-6" />
                  </Button>
                </CreateCustomerDialog>
              </div>
            </Card>
          </section>

          {/* Section: Warehouse */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <WarehouseIcon className="size-4" /> Fulfillment
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {warehouses?.map((w) => (
                <Button
                  key={w.id}
                  variant="outline"
                  className={cn(
                    'h-12 justify-start gap-3 rounded-xl border-border transition-all',
                    warehouseId === w.id
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'hover:bg-accent/50',
                  )}
                  onClick={() => setWarehouseId(w.id)}
                >
                  <div
                    className={cn(
                      'size-2 rounded-full',
                      warehouseId === w.id ? 'bg-primary' : 'bg-muted',
                    )}
                  />
                  <span className="text-xs font-semibold">{w.name}</span>
                </Button>
              ))}
            </div>
          </section>

          {/* Section: Items */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <Box className="size-4" /> Invoice Items
              </h2>
              <div className="flex gap-2">
                <CreateStockItemDialog
                  onSuccess={(item) => {
                    utils.stockItems.getStockItems.invalidate();
                    handleAddLine(item);
                  }}
                />
                <SelectDialog<any>
                  title="Add Item"
                  data={stockItems}
                  searchFields={['name', 'sku']}
                  onSelect={handleAddLine}
                  cardRenderer={({ data }) => (
                    <div className="flex items-center gap-4 p-3 border-b border-border/50 hover:bg-accent/50 cursor-pointer">
                      <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
                        <Package size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{data.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[9px] px-1 h-3.5 font-mono">
                            {data.sku}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            • {formatAmount(data.salesPrice)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  )}
                  rowHeight={64}
                >
                  <Button
                    size="sm"
                    className="gap-2 rounded-full px-4 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                  >
                    <Plus className="size-4" /> Catalog
                  </Button>
                </SelectDialog>
              </div>
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {lines.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/20 border-2 border-dashed rounded-3xl"
                  >
                    <div className="p-4 bg-muted/40 rounded-full mb-4">
                      <ShoppingCart className="size-10 opacity-20" />
                    </div>
                    <p className="text-sm font-medium">Your invoice is empty</p>
                    <p className="text-[10px] opacity-60">
                      Add items from the catalog to get started
                    </p>
                  </motion.div>
                ) : (
                  lines.map((line, idx) => (
                    <motion.div
                      key={`${line.stockItemId}-${idx}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      layout
                    >
                      <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all group rounded-2xl">
                        <div className="p-4 space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-sm text-foreground truncate">
                                {line.description}
                              </h3>
                              <Badge variant="outline" className="text-[10px] mt-1 h-4 font-mono">
                                {line.sku || 'CUSTOM'}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive/40 hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full"
                              onClick={() => removeLine(idx)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                <Layers className="size-3" /> Qty
                              </label>
                              <Input
                                type="number"
                                value={line.quantity}
                                onChange={(e) =>
                                  updateLine(idx, { quantity: Number(e.target.value) })
                                }
                                className="h-9 font-bold bg-muted/30 border-none focus-visible:ring-primary/30 rounded-lg text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                <DollarSign className="size-3" /> Sales
                              </label>
                              <Input
                                type="number"
                                value={line.salesPrice}
                                onChange={(e) =>
                                  updateLine(idx, { salesPrice: Number(e.target.value) })
                                }
                                className="h-9 font-bold bg-muted/30 border-none focus-visible:ring-primary/30 rounded-lg text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 opacity-50">
                                <Search className="size-3" /> Purchase
                              </label>
                              <Input
                                type="number"
                                value={line.purchasePrice}
                                onChange={(e) =>
                                  updateLine(idx, { purchasePrice: Number(e.target.value) })
                                }
                                className="h-9 font-bold bg-muted/30 border-none focus-visible:ring-primary/30 rounded-lg text-sm opacity-50"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="bg-muted/30 px-4 py-2 flex justify-between items-center border-t border-border/20">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            Subtotal
                          </span>
                          <span className="text-sm font-black tabular-nums">
                            {formatAmount(line.salesPrice * line.quantity)}
                          </span>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>

      {/* Footer / Summary Action Bar */}
      <footer className="shrink-0 border-t bg-background/95 backdrop-blur-md p-4 pb-8 space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] sticky bottom-0 z-20">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-end justify-between px-2">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Total Amount
              </p>
              <h2 className="text-3xl font-black tabular-nums tracking-tighter">
                {formatAmount(calculateTotal())}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Items
              </p>
              <p className="text-lg font-bold">{lines.length}</p>
            </div>
          </div>

          <Button
            className="w-full h-14 text-lg font-bold gap-3 rounded-2xl bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
            disabled={!selectedCustomerId || lines.length === 0 || isSubmiting}
            onClick={handleCreateInvoice}
          >
            {isSubmiting ? (
              <>
                <div className="size-5 border-2 border-white/20 border-t-white animate-spin rounded-full" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-6" />
                <span>Create Invoice Draft</span>
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
