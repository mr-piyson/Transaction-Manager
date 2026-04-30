'use client';

import { JSX, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Pencil, MapPinIcon, Building2, MapPin, AlignLeft } from 'lucide-react';
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';

import * as z from 'zod';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export const warehouseSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  address: z.string().optional(),
  notes: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export type WarehouseFormValues = z.infer<typeof warehouseSchema>;

export interface WarehouseData {
  id: string;
  name: string;
  address?: string | null;
  isDefault?: boolean;
}

interface WarehouseFormDialogProps {
  warehouse?: WarehouseData;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  children?: JSX.Element;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function WarehouseFormDialog({
  warehouse,
  onSuccess,
  onError,
  children,
  variant,
  className,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: WarehouseFormDialogProps) {
  const isEditMode = Boolean(warehouse);

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (value: boolean) => {
    controlledOnOpenChange?.(value);
    setInternalOpen(value);
  };

  const utils = trpc.useUtils();
  const createMutation = trpc.warehouses.create.useMutation();
  const updateMutation = trpc.warehouses.update.useMutation();

  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WarehouseFormValues>({
    defaultValues: {
      name: warehouse?.name ?? '',
      address: warehouse?.address ?? '',
      isDefault: warehouse?.isDefault ?? false,
    },
  });

  const watchIsDefault = watch('isDefault');

  useEffect(() => {
    reset({
      name: warehouse?.name ?? '',
      address: warehouse?.address ?? '',
      isDefault: warehouse?.isDefault ?? false,
    });
  }, [warehouse, reset]);

  const invalidateQueries = () => {
    utils.warehouses.list.invalidate();
    utils.warehouses.getById.invalidate();
  };

  const onSubmit = async (values: WarehouseFormValues) => {
    if (isEditMode && warehouse) {
      updateMutation.mutate(
        {
          id: warehouse.id,
          ...values,
        },
        {
          onSuccess: (data) => {
            invalidateQueries();
            setOpen(false);
            toast.success('Warehouse updated successfully');
            onSuccess?.(data);
          },
          onError: (err) => {
            toast.error(err.message || 'Failed to update warehouse');
            onError?.(err);
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          ...values,
        },
        {
          onSuccess: (data) => {
            invalidateQueries();
            reset();
            setOpen(false);
            toast.success('Warehouse created successfully');
            onSuccess?.(data);
          },
          onError: (err) => {
            toast.error(err.message || 'Failed to create warehouse');
            onError?.(err);
          },
        },
      );
    }
  };

  const defaultTrigger = isEditMode ? (
    <Button size="sm" variant={variant ?? 'ghost'} className={className}>
      <Pencil className="size-4 mr-2" />
      Edit
    </Button>
  ) : (
    <Button size="sm" variant={variant} className={className}>
      <Plus className="size-4 mr-2" />
      New Warehouse
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children ?? defaultTrigger} />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-row gap-2 text-primary text-2xl items-center">
            <MapPinIcon />
            <span>{isEditMode ? 'Edit Warehouse' : 'New Warehouse'}</span>
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the warehouse details below.'
              : 'Enter the details to create a new warehouse.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FieldGroup className="grid grid-cols-1 gap-4">
            <Field data-invalid={!!errors.name}>
              <FieldLabel>
                Warehouse Name <span className="text-destructive">*</span>
              </FieldLabel>
              <InputGroup>
                <InputGroupInput {...register('name')} placeholder="e.g. Main Warehouse" />
                <InputGroupAddon>
                  <Building2 className="size-4" />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.name?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.address}>
              <FieldLabel>Address</FieldLabel>
              <InputGroup>
                <InputGroupInput {...register('address')} placeholder="123 Storage Rd..." />
                <InputGroupAddon>
                  <MapPin className="size-4" />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.address?.message}</FieldError>
            </Field>

            <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/20">
              <div className="space-y-0.5">
                <FieldLabel className="text-base">Set as Default Warehouse</FieldLabel>
                <DialogDescription className="text-xs">
                  Default warehouses are selected automatically when receiving items.
                </DialogDescription>
              </div>
              <Switch
                checked={watchIsDefault}
                onCheckedChange={(checked) => setValue('isDefault', checked)}
              />
            </div>
          </FieldGroup>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="min-w-30">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Save Warehouse'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
