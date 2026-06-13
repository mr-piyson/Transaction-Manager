'use client';

/**
 * customer-form.tsx
 * ─────────────────
 * Self-contained customer create/edit dialog.
 *
 * Exports
 * ───────
 *   <CustomerFormProvider />   — mount once in your root layout
 *   useCustomerForm()          — imperative hook: openCreate() / openEdit()
 *   <CustomerFormDialog />     — controlled dialog if you prefer local state
 *
 * Requirements
 * ────────────
 *   shadcn/ui v4  (Field, Input, Label, Button, Dialog, Alert)
 *   react-hook-form, @hookform/resolvers/zod, zod
 *   @trpc/react-query  (api.customer.create / update)
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, TriangleAlert } from 'lucide-react';
import * as React from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
// shadcn v4 primitives ── no <Form> wrapper component
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field'; // shadcn v4
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc/client';
import { Label } from '../ui/label';

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.email('Invalid email address').or(z.literal('')).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
  creditLimit: z.coerce
    .number()
    .int('Must be a whole number')
    .min(0, 'Must be 0 or more')
    .default(0),
});

export type CustomerFormValues = z.infer<typeof schema>;

// ─────────────────────────────────────────────────────────────────────────────
// Validation alert — all errors in one place, above the form
// ─────────────────────────────────────────────────────────────────────────────

interface ValidationAlertProps {
  errors: Partial<Record<keyof CustomerFormValues, { message?: string }>>;
}

function ValidationAlert({ errors }: ValidationAlertProps) {
  const messages = Object.values(errors)
    .map((e) => e?.message)
    .filter(Boolean) as string[];

  if (messages.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>Please fix the following</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc pl-4 space-y-0.5 text-sm">
          {messages.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomerFormDialog  (controlled, composable)
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Provide id + values to enter edit mode; omit for create mode. */
  customer?: { id: string } & Partial<CustomerFormValues>;
  /** Receives the id of the created / updated customer. */
  onSuccess?: (customerId: string) => void;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: CustomerFormDialogProps) {
  const isEdit = Boolean(customer?.id);
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(customer),
  });

  // Re-populate whenever the dialog (re)opens with new data
  React.useEffect(() => {
    if (open) reset(defaults(customer));
  }, [open, customer, reset]);

  // ── mutations ──────────────────────────────────────────────────────────────

  const createMutation = trpc.customers.create.useMutation({
    onSuccess(data) {
      utils.customers.list.invalidate();
      toast.success('Customer created', { description: data.name });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error('Failed to create customer', { description: err.message });
    },
  });

  const updateMutation = trpc.customers.update.useMutation({
    onSuccess(data) {
      utils.customers.list.invalidate();
      utils.customers.getById.invalidate({ id: data.id });
      toast.success('Customer updated', { description: data.name });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error('Failed to update customer', { description: err.message });
    },
  });

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const onSubmit: SubmitHandler<CustomerFormValues> = (values) => {
    if (isEdit && customer?.id) {
      updateMutation.mutate({ id: customer.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit customer' : 'New customer'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details below and save.'
              : 'Fill in the details to create a new customer.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* ── Validation alert box ─────────────────────────────────────── */}
          <ValidationAlert errors={errors} />

          <div className="space-y-4">
            {/* Name */}
            <Field>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Acme Corp"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
            </Field>

            {/* Phone + Email */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+973 1234 5678"
                  aria-invalid={!!errors.phone}
                  {...register('phone')}
                />
              </Field>
              <Field>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="billing@acme.com"
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
              </Field>
            </div>

            {/* Address + City */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="123 Main St" {...register('address')} />
              </Field>
              <Field>
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="Manama" {...register('city')} />
              </Field>
            </div>

            {/* Tax ID + Credit limit */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="taxId">Tax ID</Label>
                <Input id="taxId" placeholder="VAT-000001" {...register('taxId')} />
              </Field>
              <Field>
                <Label htmlFor="creditLimit">Credit limit (fils)</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  aria-invalid={!!errors.creditLimit}
                  {...register('creditLimit')}
                />
              </Field>
            </div>

            {/* Notes */}
            <Field>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any internal notes…"
                className="resize-none"
                rows={3}
                {...register('notes')}
              />
            </Field>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider + useCustomerForm hook  (toast-style imperative API)
// ─────────────────────────────────────────────────────────────────────────────

interface OpenOptions {
  onSuccess?: (id: string) => void;
}

interface CustomerFormContextValue {
  /** Open in create mode */
  openCreate: (options?: OpenOptions) => void;
  /** Open in edit mode — pass any existing field values you have */
  openEdit: (customer: { id: string } & Partial<CustomerFormValues>, options?: OpenOptions) => void;
}

const CustomerFormContext = React.createContext<CustomerFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  customer?: { id: string } & Partial<CustomerFormValues>;
  onSuccess?: (id: string) => void;
}

/**
 * Mount once near the top of your tree (e.g. root layout / providers.tsx).
 * The dialog portal renders here; children are optional.
 */
export function CustomerFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({
      open: true,
      customer: undefined,
      onSuccess: options?.onSuccess,
    });
  }, []);

  const openEdit = React.useCallback(
    (customer: { id: string } & Partial<CustomerFormValues>, options?: OpenOptions) => {
      setState({ open: true, customer, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <CustomerFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <CustomerFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        customer={state.customer}
        onSuccess={state.onSuccess}
      />
    </CustomerFormContext.Provider>
  );
}

/**
 * useCustomerForm()
 *
 * Call openCreate() or openEdit() from any component, hook, or event handler.
 * Must be used inside <CustomerFormProvider>.
 *
 * @example
 *   const { openCreate, openEdit } = useCustomerForm();
 *   openCreate({ onSuccess: (id) => router.push(`/customers/${id}`) });
 *   openEdit({ id: c.id, name: c.name, creditLimit: Number(c.creditLimit) });
 */
export function useCustomerForm(): CustomerFormContextValue {
  const ctx = React.useContext(CustomerFormContext);
  if (!ctx) throw new Error('useCustomerForm must be used inside <CustomerFormProvider>');
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function defaults(customer?: { id: string } & Partial<CustomerFormValues>): CustomerFormValues {
  return {
    name: customer?.name ?? '',
    phone: customer?.phone ?? undefined,
    email: customer?.email ?? undefined,
    address: customer?.address ?? undefined,
    city: customer?.city ?? undefined,
    taxId: customer?.taxId ?? undefined,
    notes: customer?.notes ?? undefined,
    creditLimit: typeof customer?.creditLimit === 'number' ? customer.creditLimit : 0,
  };
}
