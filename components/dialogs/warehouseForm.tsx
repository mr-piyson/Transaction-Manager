'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, TriangleAlert } from 'lucide-react';
import * as React from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc/client';
import { Label } from '@/components/ui/label';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  isDefault: z.boolean(),
});

export type WarehouseFormValues = z.infer<typeof schema>;

interface ValidationAlertProps {
  errors: Partial<Record<keyof WarehouseFormValues, { message?: string }>>;
}

function ValidationAlert({ errors }: ValidationAlertProps) {
  const messages = Object.values(errors).map((e) => e?.message).filter(Boolean) as string[];
  if (messages.length === 0) return null;
  return (
    <Alert variant="destructive" className="mb-4">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>Please fix the following</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc pl-4 space-y-0.5 text-sm">
          {messages.map((msg) => <li key={msg}>{msg}</li>)}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: { id: string } & Partial<WarehouseFormValues>;
  onSuccess?: (warehouseId: string) => void;
}

export function WarehouseFormDialog({ open, onOpenChange, warehouse, onSuccess }: WarehouseFormDialogProps) {
  const isEdit = Boolean(warehouse?.id);
  const utils = trpc.useUtils();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<WarehouseFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(warehouse),
  });

  const isDefault = watch('isDefault');

  React.useEffect(() => {
    if (open) reset(defaults(warehouse));
  }, [open, warehouse, reset]);

  const createMutation = trpc.warehouses.create.useMutation({
    onSuccess(data) {
      utils.warehouses.list.invalidate();
      toast.success('Warehouse created', { description: data.name });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) { toast.error('Failed to create warehouse', { description: err.message }); },
  });

  const updateMutation = trpc.warehouses.update.useMutation({
    onSuccess(data) {
      utils.warehouses.list.invalidate();
      toast.success('Warehouse updated', { description: data.name });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) { toast.error('Failed to update warehouse', { description: err.message }); },
  });

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const onSubmit: SubmitHandler<WarehouseFormValues> = (values) => {
    if (isEdit && warehouse?.id) {
      updateMutation.mutate({ id: warehouse.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit warehouse' : 'New warehouse'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the details below and save.' : 'Fill in the details to create a new warehouse.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <ValidationAlert errors={errors} />

          <div className="space-y-4">
            <Field>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="Main Warehouse" aria-invalid={!!errors.name} {...register('name')} />
            </Field>

            <Field>
              <Label htmlFor="code">Code</Label>
              <Input id="code" placeholder="WH-01" {...register('code')} />
            </Field>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isDefault"
                checked={isDefault}
                onCheckedChange={(checked) => setValue('isDefault', checked === true)}
              />
              <Label htmlFor="isDefault" className="text-sm font-normal">Set as default warehouse</Label>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create warehouse'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Provider + Hook

interface OpenOptions { onSuccess?: (id: string) => void; }

interface WarehouseFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (warehouse: { id: string } & Partial<WarehouseFormValues>, options?: OpenOptions) => void;
}

const WarehouseFormContext = React.createContext<WarehouseFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  warehouse?: { id: string } & Partial<WarehouseFormValues>;
  onSuccess?: (id: string) => void;
}

export function WarehouseFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, warehouse: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback((warehouse: { id: string } & Partial<WarehouseFormValues>, options?: OpenOptions) => {
    setState({ open: true, warehouse, onSuccess: options?.onSuccess });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <WarehouseFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <WarehouseFormDialog open={state.open} onOpenChange={handleOpenChange} warehouse={state.warehouse} onSuccess={state.onSuccess} />
    </WarehouseFormContext.Provider>
  );
}

export function useWarehouseForm(): WarehouseFormContextValue {
  const ctx = React.useContext(WarehouseFormContext);
  if (!ctx) throw new Error('useWarehouseForm must be used inside <WarehouseFormProvider>');
  return ctx;
}

function defaults(warehouse?: { id: string } & Partial<WarehouseFormValues>): WarehouseFormValues {
  return {
    name: warehouse?.name ?? '',
    code: warehouse?.code ?? undefined,
    isDefault: warehouse?.isDefault ?? false,
  };
}
