'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Banknote, Loader2 } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { trpc } from '@/lib/trpc/client';
import { paymentMethodSchema } from '@/lib/validations';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'CREDIT', label: 'Credit Note' },
  { value: 'OTHER', label: 'Other' },
] as const;

const schema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  method: paymentMethodSchema.default('CASH'),
  date: z.string().min(1, 'Date is required'),
  reference: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

type PaymentFormValues = z.infer<typeof schema>;

export type { PaymentFormValues };

export interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: {
    id: string;
    serial?: string;
    total?: number;
    amountDue?: number;
    currency?: string;
  };
  onSuccess?: () => void;
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: PaymentFormDialogProps) {
  const utils = trpc.useUtils();

  const addPaymentMutation = trpc.invoices.addPayment.useMutation({
    onSuccess: () => {
      utils.invoices.byId.invalidate({ id: invoice?.id });
      utils.invoices.list.invalidate();
      toast.success('Payment recorded');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(invoice),
  });

  React.useEffect(() => {
    if (open) reset(defaults(invoice));
  }, [open, invoice, reset]);

  const onSubmit = (values: PaymentFormValues) => {
    if (!invoice?.id) return;
    addPaymentMutation.mutate({
      invoiceId: invoice.id,
      amount: values.amount,
      method: values.method,
      date: values.date ? new Date(values.date) : new Date(),
      reference: values.reference || undefined,
      notes: values.notes || undefined,
    });
  };

  const isPending = addPaymentMutation.isPending;
  const maxPayable = invoice?.amountDue ?? 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="size-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            {invoice?.serial
              ? `${invoice.serial} — Outstanding: ${maxPayable.toFixed(3)} ${invoice.currency ?? ''}`
              : 'Enter payment details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field orientation="vertical">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                max={maxPayable || undefined}
                placeholder="0.000"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </Field>

            <Field orientation="vertical">
              <Label>Method *</Label>
              <Select
                value={watch('method')}
                onValueChange={(v) => setValue('method', v as any, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field orientation="vertical">
            <Label>Date *</Label>
            <DatePicker
              value={watch('date')}
              onChange={(v) => setValue('date', v, { shouldValidate: true })}
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </Field>

          <Field orientation="vertical">
            <Label>Reference</Label>
            <Input
              placeholder="Cheque #, transaction ID, etc."
              {...register('reference')}
            />
          </Field>

          <Field orientation="vertical">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional notes..."
              {...register('notes')}
              rows={2}
            />
          </Field>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaults(
  invoice?: PaymentFormDialogProps['invoice'],
): PaymentFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    amount: invoice?.amountDue ?? 0,
    method: 'CASH',
    date: today,
    reference: '',
    notes: '',
  };
}

// Context for imperative open/close
interface OpenOptions {
  onSuccess?: () => void;
}

interface InvoiceData {
  id: string;
  serial?: string;
  total?: number;
  amountDue?: number;
  currency?: string;
}

interface PaymentFormContextValue {
  openCreate: (invoice: InvoiceData, options?: OpenOptions) => void;
}

const PaymentFormContext = React.createContext<PaymentFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  invoice?: InvoiceData;
  onSuccess?: () => void;
}

export function PaymentFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((invoice: InvoiceData, options?: OpenOptions) => {
    setState({ open: true, invoice, onSuccess: options?.onSuccess });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <PaymentFormContext.Provider value={{ openCreate }}>
      {children}
      <PaymentFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        invoice={state.invoice}
        onSuccess={state.onSuccess}
      />
    </PaymentFormContext.Provider>
  );
}

export function usePaymentForm(): PaymentFormContextValue {
  const ctx = React.useContext(PaymentFormContext);
  if (!ctx) throw new Error('usePaymentForm must be used inside <PaymentFormProvider>');
  return ctx;
}
