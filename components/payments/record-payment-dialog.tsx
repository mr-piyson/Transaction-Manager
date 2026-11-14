"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Banknote,
  Check,
  CreditCard,
  Landmark,
  Loader2,
  Receipt,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useForm } from "react-hook-form";
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
import { cn } from "@/lib/utils";
import { paymentMethodSchema } from "@/lib/validations";

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

/**
 * Default payment method for every payment dialog.
 * Change this single value to change the pre-selected method across the app.
 */
export const DEFAULT_PAYMENT_METHOD: PaymentMethod = "ONLINE";

const baseSchema = z.object({
  amount: z.coerce.number(),
  method: paymentMethodSchema,
  date: z.string(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentFormValues = z.infer<typeof baseSchema>;

interface PaymentMethodMeta {
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  primary: boolean;
}

const PAYMENT_METHOD_META: Record<PaymentMethod, PaymentMethodMeta> = {
  CASH: { icon: Wallet, labelKey: "cash", primary: true },
  ONLINE: { icon: Smartphone, labelKey: "online", primary: true },
  CARD: { icon: CreditCard, labelKey: "card", primary: true },
  BANK_TRANSFER: {
    icon: Landmark,
    labelKey: "bankTransfer",
    primary: false,
  },
  CHEQUE: { icon: Receipt, labelKey: "cheque", primary: false },
  CREDIT: { icon: Receipt, labelKey: "creditNote", primary: false },
  OTHER: { icon: Banknote, labelKey: "other", primary: false },
};

const PAYMENT_METHOD_ORDER: readonly PaymentMethod[] = [
  "CASH",
  "ONLINE",
  "CARD",
  "BANK_TRANSFER",
  "CHEQUE",
  "CREDIT",
  "OTHER",
];

export interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Outstanding balance; the payment cannot exceed this amount. */
  amountDue: number;
  currency?: string;
  /** Document serial shown in the dialog description. */
  serial?: string;
  /** Translated label for the outstanding balance, e.g. "Amount owed". */
  balanceLabel?: string;
  /** Pre-selected method. Defaults to DEFAULT_PAYMENT_METHOD. */
  defaultMethod?: PaymentMethod;
  /** Methods offered in the dialog. Defaults to all methods. */
  allowedMethods?: readonly PaymentMethod[];
  /** Translated overrides for specific method labels. */
  methodLabelOverrides?: Partial<Record<PaymentMethod, string>>;
  maxReferenceLength?: number;
  isPending?: boolean;
  onSubmit: (values: PaymentFormValues) => void;
}

/**
 * Canonical payment form used by both invoice receipts and purchase-order
 * supplier payments. Domain-specific mutation/invalidation lives in the
 * caller; this component owns layout, field state, and validation only.
 */
export function RecordPaymentDialog({
  open,
  onOpenChange,
  amountDue,
  currency = "",
  serial,
  balanceLabel,
  defaultMethod = DEFAULT_PAYMENT_METHOD,
  allowedMethods = PAYMENT_METHOD_ORDER,
  methodLabelOverrides,
  maxReferenceLength = 500,
  isPending = false,
  onSubmit,
}: RecordPaymentDialogProps) {
  const t = useTranslations();

  const maxAmount = Math.max(0, amountDue);

  const enabledMethods = React.useMemo(
    () => PAYMENT_METHOD_ORDER.filter((m) => allowedMethods.includes(m)),
    [allowedMethods],
  );
  const primaryMethods = enabledMethods.filter(
    (m) => PAYMENT_METHOD_META[m].primary,
  );
  const secondaryMethods = enabledMethods.filter(
    (m) => !PAYMENT_METHOD_META[m].primary,
  );

  const resolvedDefaultMethod = enabledMethods.includes(defaultMethod)
    ? defaultMethod
    : (primaryMethods[0] ?? enabledMethods[0] ?? "CASH");

  const schema = React.useMemo(
    () =>
      z.object({
        amount: z.coerce.number().positive(t("payments.amountRequired")),
        method: paymentMethodSchema,
        date: z.string().min(1, t("payments.dateRequired")),
        reference: z.string().max(maxReferenceLength).optional(),
        notes: z.string().max(2000).optional(),
      }),
    [t, maxReferenceLength],
  );

  const makeDefaults = React.useCallback(
    (): PaymentFormValues => ({
      amount: maxAmount > 0 ? maxAmount : 0,
      method: resolvedDefaultMethod,
      date: new Date().toISOString().slice(0, 10),
      reference: "",
      notes: "",
    }),
    [maxAmount, resolvedDefaultMethod],
  );

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
    defaultValues: makeDefaults(),
  });

  React.useEffect(() => {
    if (open) reset(makeDefaults());
  }, [open, makeDefaults, reset]);

  const amountValue = watch("amount");
  const amount = Number(amountValue);
  const method = watch("method");
  const isOtherMethod = secondaryMethods.includes(method);

  const exceedsLimit = Number.isFinite(amount) && amount > maxAmount + 0.0005;

  const amountError =
    errors.amount?.message ??
    (exceedsLimit
      ? t("payments.amountExceeds", {
          amount: maxAmount.toFixed(3),
          currency,
        })
      : undefined);

  const amountField = register("amount", { valueAsNumber: true });

  const submit = handleSubmit((values) => {
    if (values.amount > maxAmount + 0.0005) {
      setError("amount", {
        type: "max",
        message: t("payments.amountExceeds", {
          amount: maxAmount.toFixed(3),
          currency,
        }),
      });
      return;
    }
    onSubmit(values);
  });

  const referencePlaceholder = React.useMemo(() => {
    switch (method) {
      case "CHEQUE":
        return t("payments.referencePlaceholderCheque");
      case "BANK_TRANSFER":
        return t("payments.referencePlaceholderTransfer");
      case "CARD":
        return t("payments.referencePlaceholderCard");
      default:
        return t("payments.referencePlaceholder");
    }
  }, [method, t]);

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="size-5 text-primary" />
            {t("payments.recordPayment")}
          </DialogTitle>
          <DialogDescription>
            {serial ? (
              <>
                {serial} — {balanceLabel ?? t("payments.outstanding")}:{" "}
                <span className="font-semibold text-foreground">
                  {maxAmount.toFixed(3)} {currency}
                </span>
              </>
            ) : (
              t("payments.enterDetails")
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          {/* Amount (hero field) */}
          <div className="space-y-2">
            <Label htmlFor="record-payment-amount">
              {t("payments.amount")} *
            </Label>
            <div className="flex">
              {currency && (
                <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm font-medium text-muted-foreground">
                  {currency}
                </span>
              )}
              <Input
                id="record-payment-amount"
                type="number"
                inputMode="decimal"
                step="0.001"
                min="0"
                max={maxAmount}
                placeholder="0.000"
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                className={cn(
                  "h-10 text-right text-lg font-semibold tabular-nums md:text-lg",
                  currency && "rounded-l-none",
                )}
                aria-invalid={!!amountError}
                {...amountField}
              />
            </div>
            {amountError && (
              <p className="text-sm text-destructive">{amountError}</p>
            )}
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label>{t("payments.paymentMethod")} *</Label>

            {primaryMethods.length > 0 && (
              <div
                role="radiogroup"
                aria-label={t("payments.paymentMethod")}
                className="grid grid-cols-3 gap-2"
              >
                {primaryMethods.map((value) => {
                  const meta = PAYMENT_METHOD_META[value];
                  const Icon = meta.icon;
                  const selected = method === value;
                  const label =
                    methodLabelOverrides?.[value] ??
                    t(`common.paymentMethods.${meta.labelKey}`);

                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={isPending}
                      onClick={() =>
                        setValue("method", value, {
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
            )}

            {secondaryMethods.length > 0 && (
              <Select
                items={secondaryMethods.map((value) => ({
                  value,
                  label:
                    methodLabelOverrides?.[value] ??
                    t(
                      `common.paymentMethods.${PAYMENT_METHOD_META[value].labelKey}`,
                    ),
                }))}
                value={(isOtherMethod ? method : null) as any}
                onValueChange={(v) =>
                  v &&
                  setValue("method", v as PaymentMethod, {
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
                  <SelectValue placeholder={t("payments.otherMethods")} />
                </SelectTrigger>
                <SelectContent>
                  {secondaryMethods.map((value) => (
                    <SelectItem key={value} value={value}>
                      {methodLabelOverrides?.[value] ??
                        t(
                          `common.paymentMethods.${PAYMENT_METHOD_META[value].labelKey}`,
                        )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Date + reference */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field orientation="vertical">
              <Label>{t("payments.date")} *</Label>
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
              <Label htmlFor="record-payment-reference">
                {t("payments.reference")}
              </Label>
              <Input
                id="record-payment-reference"
                placeholder={referencePlaceholder}
                maxLength={maxReferenceLength}
                {...register("reference")}
              />
              {errors.reference && (
                <p className="text-sm text-destructive">
                  {errors.reference.message}
                </p>
              )}
            </Field>
          </div>

          <Field orientation="vertical">
            <Label htmlFor="record-payment-notes">{t("payments.notes")}</Label>
            <Textarea
              id="record-payment-notes"
              placeholder={t("payments.notesPlaceholder")}
              rows={2}
              maxLength={2000}
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </Field>

          <DialogFooter className="flex flex-row items-center justify-between">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="min-w-40">
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {amount > 0
                ? `${t("payments.record")} ${amount.toFixed(3)}${currency ? ` ${currency}` : ""}`
                : t("payments.recordPayment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
