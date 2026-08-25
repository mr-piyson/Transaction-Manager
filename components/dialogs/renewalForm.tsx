"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, RefreshCw } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { formatAmount } from "@/lib/utils";

const schema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().max(2000).optional(),
});

export type RenewalFormValues = z.infer<typeof schema>;

export interface RenewalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription?: {
    id: string;
    name?: string;
    amount?: number;
    currency?: string;
    nextRenewalDate?: string | Date | null;
  };
  onSuccess?: () => void;
}

export function RenewalFormDialog({
  open,
  onOpenChange,
  subscription,
  onSuccess,
}: RenewalFormDialogProps) {
  const utils = trpc.useUtils();

  const renewMutation = trpc.subscriptions.renew.useMutation({
    onSuccess: () => {
      utils.subscriptions.byId.invalidate({ id: subscription?.id });
      utils.subscriptions.list.invalidate();
      utils.notifications.list.invalidate();
      utils.notifications.getUnreadCount.invalidate();
      toast.success("Renewal recorded");
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
  } = useForm<RenewalFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(subscription),
  });

  React.useEffect(() => {
    if (open) reset(defaults(subscription));
  }, [open, subscription, reset]);

  const onSubmit = (values: RenewalFormValues) => {
    if (!subscription?.id) return;
    renewMutation.mutate({
      id: subscription.id,
      amount: values.amount,
      date: values.date ? new Date(values.date) : new Date(),
      notes: values.notes || undefined,
    });
  };

  const isPending = renewMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="size-5" />
            Record Renewal
          </DialogTitle>
          <DialogDescription>
            {subscription?.name
              ? `${subscription.name} — list price ${formatAmount(Number(subscription.amount ?? 0), subscription.currency)}`
              : "Enter renewal details below."}{" "}
            A matching expense will be posted to the general ledger.
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
                placeholder="0.000"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </Field>

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
          </div>

          <Field orientation="vertical">
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional notes..."
              {...register("notes")}
              rows={2}
            />
          </Field>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Record Renewal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaults(
  subscription?: RenewalFormDialogProps["subscription"],
): RenewalFormValues {
  return {
    amount: Number(subscription?.amount ?? 0),
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  };
}

// Context for imperative open/close
interface OpenOptions {
  onSuccess?: () => void;
}

interface SubscriptionData {
  id: string;
  name?: string;
  amount?: number;
  currency?: string;
  nextRenewalDate?: string | Date | null;
}

interface RenewalFormContextValue {
  openCreate: (subscription: SubscriptionData, options?: OpenOptions) => void;
}

const RenewalFormContext = React.createContext<RenewalFormContextValue | null>(
  null,
);

interface DialogState {
  open: boolean;
  subscription?: SubscriptionData;
  onSuccess?: () => void;
}

export function RenewalFormProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback(
    (subscription: SubscriptionData, options?: OpenOptions) => {
      setState({ open: true, subscription, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <RenewalFormContext.Provider value={{ openCreate }}>
      {children}
      <RenewalFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        subscription={state.subscription}
        onSuccess={state.onSuccess}
      />
    </RenewalFormContext.Provider>
  );
}

export function useRenewalForm(): RenewalFormContextValue {
  const ctx = React.useContext(RenewalFormContext);
  if (!ctx)
    throw new Error("useRenewalForm must be used inside <RenewalFormProvider>");
  return ctx;
}
