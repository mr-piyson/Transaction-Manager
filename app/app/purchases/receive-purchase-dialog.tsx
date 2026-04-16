'use client';

import { JSX, useState } from 'react';
import { CheckCircle2, Warehouse, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ReceivePurchaseDialogProps {
  purchaseId: string;
  onSuccess?: () => void;
  trigger?: JSX.Element;
}

export function ReceivePurchaseDialog({
  purchaseId,
  onSuccess,
  trigger,
}: ReceivePurchaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState<string | null>(null);

  const { data: warehouses } = trpc.warehouses.getWarehouses.useQuery();
  const receiveMutation = trpc.purchases.receiveOrder.useMutation({
    onSuccess: () => {
      toast.success('Inventory updated successfully');
      setOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to receive stock');
    },
  });

  const handleConfirm = () => {
    if (!warehouseId) {
      toast.error('Please select a warehouse');
      return;
    }
    receiveMutation.mutate({ purchaseOrderId: purchaseId, warehouseId });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger || (
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-warning/10 bg-warning/5 text-warning hover:bg-warning/10 hover:text-warning"
            >
              <CheckCircle2 className="size-3 mr-1.5" />
              Receive Stock
            </Button>
          )
        }
      ></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="size-5 text-primary" />
            Receive Physical Inventory
          </DialogTitle>
          <DialogDescription>
            Select the warehouse where these items have been received. This action will update
            current stock levels.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Destination Warehouse
            </Label>
            <Select value={warehouseId} onValueChange={(value) => setWarehouseId(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse..." />
              </SelectTrigger>
              <SelectContent>
                {warehouses?.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={receiveMutation.isPending || !warehouseId}
            className="min-w-32"
          >
            {receiveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="size-4 mr-2" />
            )}
            Confirm Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
