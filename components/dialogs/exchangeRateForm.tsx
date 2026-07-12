'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightLeft, Loader2, Trash2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc/client';
import { CURRENCIES, type CurrencyCode } from '@/lib/utils';
import { exchangeRateInputSchema } from '@/lib/validations';

type ExchangeRateFormValues = z.infer<typeof exchangeRateInputSchema>;

export interface ExchangeRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rate?: {
    id: string;
    fromCurrency: CurrencyCode;
    toCurrency: CurrencyCode;
    rate: number;
    effectiveDate: Date;
    source: string | null;
  };
  onSuccess?: () => void;
}

export function ExchangeRateDialog({
  open,
  onOpenChange,
  rate,
  onSuccess,
}: ExchangeRateDialogProps) {
  const isEdit = Boolean(rate?.id);
  const utils = trpc.useUtils();

  const upsertMutation = trpc.exchangeRates.manualUpsert.useMutation({
    onSuccess: () => {
      utils.exchangeRates.list.invalidate();
      toast.success(isEdit ? 'Exchange rate updated' : 'Exchange rate added');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.exchangeRates.delete.useMutation({
    onSuccess: () => {
      utils.exchangeRates.list.invalidate();
      toast.success('Exchange rate deleted');
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
  } = useForm<ExchangeRateFormValues>({
    resolver: zodResolver(exchangeRateInputSchema) as any,
    defaultValues: defaults(rate) as any,
  });

  React.useEffect(() => {
    reset(defaults(rate));
  }, [rate, reset]);

  const onSubmit = async (values: ExchangeRateFormValues) => {
    await upsertMutation.mutateAsync(values);
  };

  const handleDelete = async () => {
    if (!rate?.id) return;
    if (rate.source !== 'manual') {
      toast.error('Cannot delete auto-synced rates');
      return;
    }
    await deleteMutation.mutateAsync({ id: rate.id });
  };

  const isPending = upsertMutation.isPending || deleteMutation.isPending;

  const allCurrencies = Object.keys(CURRENCIES) as CurrencyCode[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-5" />
            {isEdit ? 'Edit Exchange Rate' : 'Add Exchange Rate'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the exchange rate details below.'
              : 'Enter the exchange rate details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field orientation="vertical">
              <Label>From Currency *</Label>
              <Select
                value={watch('fromCurrency')}
                onValueChange={(v) =>
                  setValue('fromCurrency', v as CurrencyCode, { shouldValidate: true })
                }
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {allCurrencies.map((code) => (
                    <SelectItem key={code} value={code}>
                      {CURRENCIES[code].symbol} {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <Label>To Currency *</Label>
              <Select
                value={watch('toCurrency')}
                onValueChange={(v) =>
                  setValue('toCurrency', v as CurrencyCode, { shouldValidate: true })
                }
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {allCurrencies.map((code) => (
                    <SelectItem key={code} value={code}>
                      {CURRENCIES[code].symbol} {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field orientation="vertical">
            <Label>Rate *</Label>
            <Input
              type="number"
              step="0.00000001"
              min="0"
              {...register('rate', { valueAsNumber: true })}
              placeholder="e.g., 2.6525"
            />
          </Field>

          <Field orientation="vertical">
            <Label>Effective Date *</Label>
            <Input
              type="date"
              {...register('effectiveDate', { valueAsDate: true })}
            />
          </Field>

          {rate?.source && rate.source !== 'manual' && (
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              This rate was auto-synced from {rate.source}. Editing will convert it to a manual
              rate.
            </div>
          )}

          {Object.keys(errors).length > 0 && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {Object.values(errors).map((err, i) => (
                <p key={i}>{err?.message as string}</p>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2">
            {isEdit && rate?.source === 'manual' && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isPending}
                className="mr-auto"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaults(rate?: ExchangeRateDialogProps['rate']): Partial<ExchangeRateFormValues> {
  return {
    fromCurrency: rate?.fromCurrency ?? 'USD',
    toCurrency: rate?.toCurrency ?? 'EUR',
    rate: rate?.rate ?? 1,
    effectiveDate: rate?.effectiveDate ?? new Date(),
  };
}

// Context for imperative open/close
interface OpenOptions {
  onSuccess?: () => void;
}

interface RateData {
  id: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  effectiveDate: Date;
  source: string | null;
}

interface ExchangeRateFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (rate: RateData, options?: OpenOptions) => void;
}

const ExchangeRateFormContext = React.createContext<ExchangeRateFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  rate?: RateData;
  onSuccess?: () => void;
}

export function ExchangeRateFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, rate: undefined, onSuccess: options?.onSuccess });
  }, []);

  const openEdit = React.useCallback((rate: RateData, options?: OpenOptions) => {
    setState({ open: true, rate, onSuccess: options?.onSuccess });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <ExchangeRateFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <ExchangeRateDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        rate={state.rate}
        onSuccess={state.onSuccess}
      />
    </ExchangeRateFormContext.Provider>
  );
}

export function useExchangeRateForm(): ExchangeRateFormContextValue {
  const ctx = React.useContext(ExchangeRateFormContext);
  if (!ctx) throw new Error('useExchangeRateForm must be used inside <ExchangeRateFormProvider>');
  return ctx;
}
