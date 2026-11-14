"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Banknote,
  Check,
  CreditCard,
  Loader2,
  Smartphone,
  Wallet,
} from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { paymentMethodSchema } from "@/lib/validations";

/** Primary methods shown as big selectable cards with fixed sizing. */
const PRIMARY_METHODS: ReadonlyArray<{
  value: "CASH" | "ONLINE" | "CARD";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "CASH", label: "Cash", icon: Wallet },
  // BenefitPay is stored as ONLINE (no dedicated enum value yet).
  { value: "ONLINE", label: "BenefitPay", icon: Smartphone },
  { value: "CARD", label: "Card", icon: CreditCard },
];

/** Secondary methods tucked into a select. */
const OTHER_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CREDIT", label: "Credit Note" },
  { value: "OTHER", label: "Other" },
] as const;

const PRIMARY_VALUES: ReadonlyArray<string> = PRIMARY_METHODS.map(
  (m) => m.value,
);

const schema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: paymentMethodSchema.default("CASH"),
  date: z.string().min(1, "Date is required"),
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
      toast.success("Payment recorded");
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
    setError,
    watch,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(invoice),
  });

  React.useEffect(() => {
    if (open) reset(defaults(invoice));
  }, [open, invoice, reset]);

  const isPending = addPaymentMutation.isPending;
  const maxPayable = invoice?.amountDue ?? 0;
  const currency = invoice?.currency ?? "";

  const method = watch("method");
  const amount = Number(watch("amount")) || 0;
  const isOtherMethod = !PRIMARY_VALUES.includes(method);

  const onSubmit = (values: PaymentFormValues) => {
    if (!invoice?.id) return;
    if (maxPayable > 0 && values.amount > maxPayable + 0.0005) {
      setError("amount", {
        message: `Cannot exceed outstanding amount (${maxPayable.toFixed(3)})`,
      });
      return;
    }
    addPaymentMutation.mutate({
      invoiceId: invoice.id,
      amount: values.amount,
      method: values.method,
      date: values.date ? new Date(values.date) : new Date(),
      reference: values.reference || undefined,
      notes: values.notes || undefined,
    });
  };

  const amountField = register("amount", { valueAsNumber: true });

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="size-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            {invoice?.serial
              ? `${invoice.serial} — Outstanding: ${maxPayable.toFixed(3)} ${currency}`
              : "Enter payment details below."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* ───────── Amount (hero) ───────── */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount *</Label>
            <div className="flex">
              {currency && (
                <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm font-medium text-muted-foreground">
                  {currency}
                </span>
              )}
              <Input
                id="payment-amount"
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0"
                max={maxPayable || undefined}
                placeholder="0.000"
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                className={cn(
                  "h-10 text-right text-lg font-semibold tabular-nums md:text-lg",
                  currency && "rounded-l-none",
                )}
                aria-invalid={!!errors.amount}
                {...amountField}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* ───────── Payment method ───────── */}
          <div className="space-y-2">
            <Label>Payment method *</Label>

            <div
              role="radiogroup"
              aria-label="Payment method"
              className="grid grid-cols-3 gap-2"
            >
              {PRIMARY_METHODS.map(({ value, label, icon: Icon }) => {
                const selected = method === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() =>
                      setValue("method", value as any, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    className={cn(
                      "relative flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 px-2 py-3 text-sm font-medium transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      selected
                        ? "border-primary bg-primary/15 text-primary shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    {selected && (
                      <span className="absolute right-1.5 top-1.5 flex size-3 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" />
                      </span>
                    )}
                    <Icon className="size-7" />
                    <span className="text-center leading-tight">{label}</span>
                  </button>
                );
              })}
            </div>

            <Select
              items={OTHER_METHODS.map((m) => ({
                value: m.value,
                label: m.label,
              }))}
              value={(isOtherMethod ? method : null) as any}
              onValueChange={(v) =>
                v &&
                setValue("method", v as any, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger
                className={cn(
                  "w-full",
                  isOtherMethod && "border-primary ring-1 ring-primary/30",
                )}
              >
                <SelectValue placeholder="Other methods " />
              </SelectTrigger>
              <SelectContent>
                {OTHER_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ───────── Details ───────── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field orientation="vertical">
              <Label>Date *</Label>
              <DatePicker
                value={watch("date")}
                onChange={(v) => setValue("date", v, { shouldValidate: true })}
              />
              {errors.date && (
                <p className="text-sm text-destructive">
                  {errors.date.message}
                </p>
              )}
            </Field>

            <Field orientation="vertical">
              <Label>Reference</Label>
              <Input
                placeholder={
                  method === "CHEQUE"
                    ? "Cheque #"
                    : method === "BANK_TRANSFER"
                      ? "Transfer ref / IBAN"
                      : method === "CARD"
                        ? "Last 4 digits / auth code"
                        : "Transaction ID, etc."
                }
                {...register("reference")}
              />
            </Field>
          </div>

          <Field orientation="vertical">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional notes..."
              {...register("notes")}
              rows={2}
            />
          </Field>

          <DialogFooter className="flex flex-row items-center justify-between">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="min-w-40">
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Record{" "}
              {amount > 0 ? `${amount.toFixed(3)} ${currency}` : "Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaults(
  invoice?: PaymentFormDialogProps["invoice"],
): PaymentFormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    amount: invoice?.amountDue ?? 0,
    method: "CASH",
    date: today,
    reference: "",
    notes: "",
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

const PaymentFormContext = React.createContext<PaymentFormContextValue | null>(
  null,
);

interface DialogState {
  open: boolean;
  invoice?: InvoiceData;
  onSuccess?: () => void;
}

export function PaymentFormProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback(
    (invoice: InvoiceData, options?: OpenOptions) => {
      setState({ open: true, invoice, onSuccess: options?.onSuccess });
    },
    [],
  );

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
  if (!ctx)
    throw new Error("usePaymentForm must be used inside <PaymentFormProvider>");
  return ctx;
}
