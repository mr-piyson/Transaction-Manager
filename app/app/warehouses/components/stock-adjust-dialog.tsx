'use client';

import { useState, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Scale, PackagePlus, PackageMinus } from 'lucide-react';

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

const adjustSchema = z.object({
  adjustment: z.number().int().refine((n) => n !== 0, 'Adjustment cannot be zero'),
  reason: z.string().min(1, 'Reason is required for manual adjustments'),
});

type AdjustFormValues = z.infer<typeof adjustSchema>;

export function StockAdjustDialog({
  itemId,
  warehouseId,
  itemName,
  currentQuantity,
  children,
}: {
  itemId: string;
  warehouseId: string;
  itemName: string;
  currentQuantity: number;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adjustSchema),
    defaultValues: { adjustment: 0, reason: '' },
  });

  const adjustment = watch('adjustment') || 0;
  const isPositive = adjustment > 0;
  const isNegative = adjustment < 0;
  const finalQuantity = currentQuantity + Number(adjustment);

  const mutation = trpc.stock.adjust.useMutation({
    onSuccess: () => {
      toast.success('Stock adjusted successfully');
      utils.warehouses.getById.invalidate({ id: warehouseId });
      utils.stock.levels.invalidate();
      setOpen(false);
      reset();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const onSubmit = (data: AdjustFormValues) => {
    mutation.mutate({
      itemId,
      warehouseId,
      adjustment: data.adjustment,
      reason: data.reason,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Adjust Stock
          </DialogTitle>
          <DialogDescription>
            Manually increase or decrease the stock level for <strong className="text-foreground">{itemName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Stock</p>
              <p className="text-2xl font-bold font-mono">{currentQuantity}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">New Stock</p>
              <p className={`text-2xl font-bold font-mono ${finalQuantity < 0 ? 'text-destructive' : 'text-primary'}`}>
                {finalQuantity}
              </p>
            </div>
          </div>

          <Field data-invalid={!!errors.adjustment}>
            <FieldLabel>Adjustment Quantity (+/-)</FieldLabel>
            <div className="relative">
              <Input
                type="number"
                {...register('adjustment', { valueAsNumber: true })}
                className={`pl-9 font-mono ${isPositive ? 'border-primary text-primary' : isNegative ? 'border-destructive text-destructive' : ''}`}
                placeholder="e.g. 5 or -2"
              />
              <div className="absolute left-3 top-2.5 text-muted-foreground">
                {isPositive ? <PackagePlus className="h-4 w-4 text-primary" /> : isNegative ? <PackageMinus className="h-4 w-4 text-destructive" /> : <Scale className="h-4 w-4" />}
              </div>
            </div>
            <FieldError>{errors.adjustment?.message}</FieldError>
            {finalQuantity < 0 && (
              <p className="text-sm text-destructive mt-1 font-medium">Warning: Resulting stock cannot be negative.</p>
            )}
          </Field>

          <Field data-invalid={!!errors.reason}>
            <FieldLabel>Reason for Adjustment</FieldLabel>
            <Input {...register('reason')} placeholder="e.g. Found extra in bin, damaged item..." />
            <FieldError>{errors.reason?.message}</FieldError>
          </Field>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || finalQuantity < 0 || adjustment === 0}>
              Confirm Adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
