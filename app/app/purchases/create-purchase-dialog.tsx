'use client';

import * as z from 'zod';
import { useState } from 'react';
import { Loader2, Plus, ShoppingCart, User, Package, Trash2, Banknote } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Format } from '@/lib/format';

interface ItemLine {
  stockItemId: number;
  quantity: number;
  purchasePrice: number;
}

export function CreatePurchaseDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string>('');
  const [lines, setLines] = useState<ItemLine[]>([]);

  
  const { data: suppliers } = trpc.suppliers.getSuppliers.useQuery();
  const { data: stockItems } = trpc.stockItems.getStockItems.useQuery();

  const createMutation = trpc.purchases.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      setLines([]);
      setSupplierId('');
      onSuccess?.();
      toast.success('Purchase order created');
    },
  });

  const addLine = () => {
    setLines([...lines, { stockItemId: 0, quantity: 1, purchasePrice: 0 }]);
  };

  const updateLine = (index: number, field: keyof ItemLine, value: number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!supplierId || lines.length === 0 || lines.some(l => l.stockItemId === 0)) {
      toast.error('Please select a supplier and add at least one valid item');
      return;
    }

    createMutation.mutate({
      supplierId: Number(supplierId),
      organizationId: 1, // Will be handled on server via ctx but router requires it in input for now
      lines,
    });
  };

  const total = lines.reduce((acc, l) => acc + l.purchasePrice * l.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="size-4" />
          New Purchase
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-primary font-bold text-2xl">
            <ShoppingCart className="size-6" />
            Create Purchase Order
          </DialogTitle>
          <DialogDescription>
            Enter purchase details from your supplier. This will generate a pending order.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6 pt-2 space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <User className="size-3" /> Supplier
              </Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <Package className="size-3" /> Purchase Lines
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine} className="h-7 text-[10px] uppercase">
                <Plus className="size-3 mr-1" /> Add Line
              </Button>
            </div>

            <ScrollArea className="h-[250px] border rounded-xl bg-muted/20 p-4">
              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div key={index} className="flex gap-3 items-end group bg-background p-3 rounded-lg border shadow-sm">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Product/Service</Label>
                      <Select 
                        value={line.stockItemId.toString()} 
                        onValueChange={(val) => {
                          const item = stockItems?.find(s => s.id === Number(val));
                          updateLine(index, 'stockItemId', Number(val));
                          if (item) updateLine(index, 'purchasePrice', item.purchasePrice);
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select item..." />
                        </SelectTrigger>
                        <SelectContent>
                          {stockItems?.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-24 space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Qty</Label>
                      <Input 
                        type="number" 
                        value={line.quantity} 
                        onChange={(e) => updateLine(index, 'quantity', Number(e.target.value))}
                        className="h-9"
                      />
                    </div>

                    <div className="w-32 space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Unit Cost</Label>
                      <Input 
                        type="number" 
                        value={line.purchasePrice} 
                        onChange={(e) => updateLine(index, 'purchasePrice', Number(e.target.value))}
                        className="h-9"
                      />
                    </div>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeLine(index)}
                      className="h-9 w-9 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}

                {lines.length === 0 && (
                  <div className="h-32 flex flex-col items-center justify-center text-muted-foreground italic text-xs">
                    No items added yet. Click 'Add Line' to start.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-6 bg-muted/30 border-t flex items-center justify-between sm:justify-between">
          <div className="text-left">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block leading-none mb-1 text-nowrap">Total Obligation</span>
            <span className="text-xl font-black text-primary flex items-center gap-1">
              <Banknote className="size-5" />
              {Format.money.db(total)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || lines.length === 0}
              className="min-w-32"
            >
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <ShoppingCart className="size-4 mr-2" />}
              Create Order
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
