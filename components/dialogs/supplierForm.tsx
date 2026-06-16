'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, TriangleAlert } from 'lucide-react';
import * as React from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc/client';
import { Label } from '@/components/ui/label';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().or(z.literal('')).optional(),
  contactName: z.string().optional(),
  website: z.string().optional(),
  taxId: z.string().optional(),
  crNumber: z.string().optional(),
  notes: z.string().optional(),
  paymentTermsDays: z.coerce.number().int().min(0).max(365),
});

export type SupplierFormValues = z.infer<typeof schema>;

interface ValidationAlertProps {
  errors: Partial<Record<keyof SupplierFormValues, { message?: string }>>;
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

export interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: { id: string } & Partial<SupplierFormValues>;
  onSuccess?: (supplierId: string) => void;
}

export function SupplierFormDialog({ open, onOpenChange, supplier, onSuccess }: SupplierFormDialogProps) {
  const isEdit = Boolean(supplier?.id);
  const utils = trpc.useUtils();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SupplierFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(supplier),
  });

  React.useEffect(() => {
    if (open) reset(defaults(supplier));
  }, [open, supplier, reset]);

  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess(data) {
      utils.suppliers.list.invalidate();
      toast.success('Supplier created', { description: data.name });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) { toast.error('Failed to create supplier', { description: err.message }); },
  });

  const updateMutation = trpc.suppliers.update.useMutation({
    onSuccess(data) {
      utils.suppliers.list.invalidate();
      toast.success('Supplier updated', { description: data.name });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) { toast.error('Failed to update supplier', { description: err.message }); },
  });

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const onSubmit: SubmitHandler<SupplierFormValues> = (values) => {
    if (isEdit && supplier?.id) {
      updateMutation.mutate({ id: supplier.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit supplier' : 'New supplier'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the details below and save.' : 'Fill in the details to create a new supplier.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <ValidationAlert errors={errors} />

          <div className="space-y-4">
            <Field>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="Supplier name" aria-invalid={!!errors.name} {...register('name')} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="code">Code</Label>
                <Input id="code" placeholder="SUP-001" {...register('code')} />
              </Field>
              <Field>
                <Label htmlFor="paymentTermsDays">Payment terms (days)</Label>
                <Input id="paymentTermsDays" type="number" min={0} max={365} {...register('paymentTermsDays')} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+973 1234 5678" {...register('phone')} />
              </Field>
              <Field>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="supplier@example.com" {...register('email')} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="contactName">Contact person</Label>
                <Input id="contactName" placeholder="John Doe" {...register('contactName')} />
              </Field>
              <Field>
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://example.com" {...register('website')} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="taxId">Tax ID</Label>
                <Input id="taxId" placeholder="VAT-000001" {...register('taxId')} />
              </Field>
              <Field>
                <Label htmlFor="crNumber">CR Number</Label>
                <Input id="crNumber" placeholder="CR-000001" {...register('crNumber')} />
              </Field>
            </div>

            <Field>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Internal notes..." className="resize-none" rows={3} {...register('notes')} />
            </Field>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Provider + Hook

interface OpenOptions { onSuccess?: (id: string) => void; }

interface SupplierFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (supplier: { id: string } & Partial<SupplierFormValues>, options?: OpenOptions) => void;
}

const SupplierFormContext = React.createContext<SupplierFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  supplier?: { id: string } & Partial<SupplierFormValues>;
  onSuccess?: (id: string) => void;
}

export function SupplierFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, supplier: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback((supplier: { id: string } & Partial<SupplierFormValues>, options?: OpenOptions) => {
    setState({ open: true, supplier, onSuccess: options?.onSuccess });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <SupplierFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <SupplierFormDialog open={state.open} onOpenChange={handleOpenChange} supplier={state.supplier} onSuccess={state.onSuccess} />
    </SupplierFormContext.Provider>
  );
}

export function useSupplierForm(): SupplierFormContextValue {
  const ctx = React.useContext(SupplierFormContext);
  if (!ctx) throw new Error('useSupplierForm must be used inside <SupplierFormProvider>');
  return ctx;
}

function defaults(supplier?: { id: string } & Partial<SupplierFormValues>): SupplierFormValues {
  return {
    name: supplier?.name ?? '',
    code: supplier?.code ?? undefined,
    phone: supplier?.phone ?? undefined,
    email: supplier?.email ?? undefined,
    contactName: supplier?.contactName ?? undefined,
    website: supplier?.website ?? undefined,
    taxId: supplier?.taxId ?? undefined,
    crNumber: supplier?.crNumber ?? undefined,
    notes: supplier?.notes ?? undefined,
    paymentTermsDays: typeof supplier?.paymentTermsDays === 'number' ? supplier.paymentTermsDays : 30,
  };
}
