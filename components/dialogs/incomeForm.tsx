'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, TriangleAlert } from 'lucide-react';
import * as React from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc/client';

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'ONLINE', 'OTHER'] as const;

const schema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  method: z.enum(PAYMENT_METHODS).default('CASH'),
  date: z.string().min(1, 'Date is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
  customerId: z.string().optional(),
  invoiceId: z.string().optional(),
});

export type IncomeFormValues = z.infer<typeof schema>;

export interface IncomeFormRecord {
  id: string;
  description: string;
  amount: number | string;
  method: string;
  date: string | Date;
  reference?: string | null;
  notes?: string | null;
  customerId?: string | null;
  invoiceId?: string | null;
}

function toDateInputValue(date: Date): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaults(income?: IncomeFormRecord): IncomeFormValues {
  return {
    description: income?.description ?? '',
    amount: income ? Number(income.amount) : ('' as unknown as number),
    method: (income?.method as (typeof PAYMENT_METHODS)[number]) ?? 'CASH',
    date: income?.date ? toDateInputValue(new Date(income.date)) : toDateInputValue(new Date()),
    reference: income?.reference ?? undefined,
    notes: income?.notes ?? undefined,
    customerId: income?.customerId ?? '',
    invoiceId: income?.invoiceId ?? '',
  };
}

interface ValidationAlertProps {
  errors: Partial<Record<keyof IncomeFormValues, { message?: string }>>;
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

export interface IncomeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income?: IncomeFormRecord;
  onSuccess?: (incomeId: string) => void;
}

export function IncomeFormDialog({
  open,
  onOpenChange,
  income,
  onSuccess,
}: IncomeFormDialogProps) {
  const isEdit = Boolean(income?.id);
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IncomeFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(income),
  });

  const customerId = watch('customerId');

  React.useEffect(() => {
    if (open) reset(defaults(income));
  }, [open, income, reset]);

  const { data: customers } = trpc.customers.list.useQuery(
    { page: 1, limit: 500 },
    { enabled: open },
  );
  const { data: invoices } = trpc.invoices.list.useQuery(
    { page: 1, limit: 500 },
    { enabled: open },
  );

  const createMutation = trpc.incomes.create.useMutation({
    onSuccess(data) {
      utils.incomes.list.invalidate();
      toast.success('Income recorded');
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error('Failed to record income', { description: err.message });
    },
  });

  const updateMutation = trpc.incomes.update.useMutation({
    onSuccess(data) {
      utils.incomes.list.invalidate();
      utils.incomes.byId.invalidate({ id: data.id });
      toast.success('Income updated');
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error('Failed to update income', { description: err.message });
    },
  });

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const onSubmit: SubmitHandler<IncomeFormValues> = (values) => {
    const input = {
      description: values.description,
      amount: values.amount,
      method: values.method,
      date: new Date(values.date),
      reference: values.reference || undefined,
      notes: values.notes || undefined,
      customerId: values.customerId || undefined,
      invoiceId: values.invoiceId || undefined,
    };

    if (isEdit && income?.id) {
      updateMutation.mutate({ id: income.id, ...input });
    } else {
      createMutation.mutate(input);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit income' : 'Record income'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details below. Accounting fields will re-post the journal entry.'
              : 'Fill in the details to record a new income. A journal entry is posted automatically.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <ValidationAlert errors={errors} />

          <div className="space-y-4">
            <Field>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="e.g. Consulting services, product sale"
                aria-invalid={!!errors.description}
                {...register('description')}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  aria-invalid={!!errors.amount}
                  {...register('amount')}
                />
              </Field>
              <Field>
                <Label htmlFor="method">Payment method</Label>
                <NativeSelect id="method" {...register('method')}>
                  {PAYMENT_METHODS.map((m) => (
                    <NativeSelectOption key={m} value={m}>
                      {m}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" aria-invalid={!!errors.date} {...register('date')} />
              </Field>
              <Field>
                <Label htmlFor="reference">Reference</Label>
                <Input id="reference" placeholder="e.g. REF-001" {...register('reference')} />
              </Field>
            </div>

            <Field>
              <Label htmlFor="customerId">Customer</Label>
              <NativeSelect
                id="customerId"
                value={customerId ?? ''}
                onChange={(e) => setValue('customerId', e.target.value)}
              >
                <NativeSelectOption value="">No customer</NativeSelectOption>
                {(customers?.data ?? []).map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <Label htmlFor="invoiceId">Invoice</Label>
              <NativeSelect id="invoiceId" {...register('invoiceId')}>
                <NativeSelectOption value="">No invoice</NativeSelectOption>
                {(invoices?.data ?? []).map((inv) => (
                  <NativeSelectOption key={inv.id} value={inv.id}>
                    {inv.serial}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Internal notes..."
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
              {isEdit ? 'Save changes' : 'Record income'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Provider + Hook

interface OpenOptions {
  onSuccess?: (id: string) => void;
}

interface IncomeFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (income: IncomeFormRecord, options?: OpenOptions) => void;
}

const IncomeFormContext = React.createContext<IncomeFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  income?: IncomeFormRecord;
  onSuccess?: (id: string) => void;
}

export function IncomeFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, income: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback((income: IncomeFormRecord, options?: OpenOptions) => {
    setState({ open: true, income, onSuccess: options?.onSuccess });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <IncomeFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <IncomeFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        income={state.income}
        onSuccess={state.onSuccess}
      />
    </IncomeFormContext.Provider>
  );
}

export function useIncomeForm(): IncomeFormContextValue {
  const ctx = React.useContext(IncomeFormContext);
  if (!ctx) throw new Error('useIncomeForm must be used inside <IncomeFormProvider>');
  return ctx;
}
