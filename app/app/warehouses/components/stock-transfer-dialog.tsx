'use client';

import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightLeft } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';

const transferSchema = z.object({
  toWarehouseId: z.string().min(1, 'Destination is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional(),
});

type TransferFormValues = z.infer<typeof transferSchema>;

export function StockTransferDialog({
  itemId,
  fromWarehouseId,
  itemName,
  currentQuantity,
  children,
}: {
  itemId: string;
  fromWarehouseId: string;
  itemName: string;
  currentQuantity: number;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: warehouses } = trpc.warehouses.list.useQuery({});

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transferSchema),
    defaultValues: { quantity: 1, notes: '' },
  });

  const quantity = watch('quantity') || 0;
  const destinationOptions = warehouses?.filter((w) => w.id !== fromWarehouseId) || [];

  const mutation = trpc.stock.transfer.useMutation({
    onSuccess: () => {
      toast.success('Stock transferred successfully');
      utils.warehouses.getById.invalidate({ id: fromWarehouseId });
      utils.stock.levels.invalidate();
      setOpen(false);
      reset();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (data: TransferFormValues) => {
    mutation.mutate({
      itemId,
      fromWarehouseId,
      toWarehouseId: data.toWarehouseId,
      quantity: data.quantity,
      notes: data.notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transfer Stock
          </DialogTitle>
          <DialogDescription>
            Move <strong className="text-foreground">{itemName}</strong> to another location.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Available to Transfer</p>
              <p className="text-2xl font-bold font-mono">{currentQuantity}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">Remaining</p>
              <p
                className={`text-2xl font-bold font-mono ${currentQuantity - quantity < 0 ? 'text-destructive' : 'text-primary'}`}
              >
                {currentQuantity - quantity}
              </p>
            </div>
          </div>

          <Field data-invalid={!!errors.toWarehouseId}>
            <FieldLabel>Destination Warehouse</FieldLabel>
            <select
              {...register('toWarehouseId')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a warehouse...</option>
              {destinationOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <FieldError>{errors.toWarehouseId?.message}</FieldError>
            {destinationOptions.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">No other warehouses available.</p>
            )}
          </Field>

          <Field data-invalid={!!errors.quantity}>
            <FieldLabel>Transfer Quantity</FieldLabel>
            <Input
              type="number"
              min={1}
              max={currentQuantity}
              {...register('quantity', { valueAsNumber: true })}
              className="font-mono"
            />
            <FieldError>{errors.quantity?.message}</FieldError>
            {quantity > currentQuantity && (
              <p className="text-sm text-destructive mt-1 font-medium">
                Cannot transfer more than available stock.
              </p>
            )}
          </Field>

          <Field data-invalid={!!errors.notes}>
            <FieldLabel>Notes (Optional)</FieldLabel>
            <Input {...register('notes')} placeholder="e.g. Requested by site manager" />
            <FieldError>{errors.notes?.message}</FieldError>
          </Field>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || quantity > currentQuantity || quantity <= 0}
            >
              Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
