'use client';

import * as z from 'zod';
import { useState } from 'react';
import { Loader2, Plus, PenTool, Hash, AlertTriangle, Box, Warehouse } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function StockAdjustmentDialog() {
  const [open, setOpen] = useState(false);
  const [stockItemId, setStockItemId] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('0');
  const [type, setType] = useState<'ADJUSTMENT' | 'WASTAGE'>('ADJUSTMENT');
  const [notes, setNotes] = useState<string>('');

  const utils = trpc.useUtils();
  const { data: items } = trpc.stockItems.getStockItems.useQuery();
  const { data: warehouses } = trpc.warehouses.getWarehouses.useQuery();

  const adjustMutation = trpc.stock.adjustStock.useMutation({
    onSuccess: () => {
      utils.stock.getStocks.invalidate();
      utils.stock.getStockMovements.invalidate();
      setOpen(false);
      reset();
      toast.success('Stock adjusted successfully');
    },
  });

  const reset = () => {
    setStockItemId('');
    setWarehouseId('');
    setQuantity('0');
    setType('ADJUSTMENT');
    setNotes('');
  };

  const handleSubmit = () => {
    if (!stockItemId || !warehouseId || Number(quantity) === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    adjustMutation.mutate({
      stockItemId: Number(stockItemId),
      warehouseId: Number(warehouseId),
      quantity: Number(quantity),
      type,
      notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8 text-[10px] uppercase tracking-wider font-bold"
          >
            <PenTool className="size-3" />
            Manual Adjustment
          </Button>
        }
      ></DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <AlertTriangle className="size-5" />
            Stock Adjustment
          </DialogTitle>
          <DialogDescription>
            Account for damage, loss, or manual inventory corrections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground mr-2">
                Item
              </Label>
              <Select value={stockItemId} onValueChange={(val: any) => setStockItemId(val)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select item..." />
                </SelectTrigger>
                <SelectContent>
                  {items?.map((i) => (
                    <SelectItem key={i.id} value={i.id.toString()}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground mr-2">
                Warehouse
              </Label>
              <Select value={warehouseId} onValueChange={(val: any) => setWarehouseId(val)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Location..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map((w) => (
                    <SelectItem key={w.id} value={w.id.toString()}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground mr-2">
                Quantity Offset
              </Label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="pl-9 h-9"
                  placeholder="+/-"
                />
              </div>
              <p className="text-[9px] text-muted-foreground italic">
                Use negative values to deduct
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground mr-2">
                Reason
              </Label>
              <Select value={type} onValueChange={(val: any) => setType(val)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADJUSTMENT">Stock Count Correction</SelectItem>
                  <SelectItem value="WASTAGE">Damage / Expiry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 text-left">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mr-2">
              Internal Notes
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9"
              placeholder="e.g. Broken during transit..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={adjustMutation.isPending}
            className="min-w-[120px]"
          >
            {adjustMutation.isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Box className="size-4 mr-2" />
            )}
            Apply Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
