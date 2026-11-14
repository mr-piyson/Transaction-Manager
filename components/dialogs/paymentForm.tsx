"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";
import {
  type PaymentFormValues,
  RecordPaymentDialog,
} from "@/components/payments/record-payment-dialog";
import { trpc } from "@/lib/trpc/client";

export type { PaymentFormValues };

const INVOICE_METHODS = [
  "CASH",
  "ONLINE",
  "CARD",
  "BANK_TRANSFER",
  "CHEQUE",
  "CREDIT",
  "OTHER",
] as const;

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
  const t = useTranslations();
  const utils = trpc.useUtils();

  const addPaymentMutation = trpc.invoices.addPayment.useMutation({
    onSuccess: () => {
      utils.invoices.byId.invalidate({ id: invoice?.id });
      utils.invoices.list.invalidate();
      toast.success(t("invoices.paymentRecorded"));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <RecordPaymentDialog
      open={open}
      onOpenChange={onOpenChange}
      amountDue={Number(invoice?.amountDue ?? 0)}
      currency={invoice?.currency ?? ""}
      serial={invoice?.serial}
      balanceLabel={t("invoices.outstanding")}
      allowedMethods={INVOICE_METHODS}
      methodLabelOverrides={{
        ONLINE: t("common.paymentMethods.benefitPay"),
      }}
      maxReferenceLength={255}
      isPending={addPaymentMutation.isPending}
      onSubmit={(values: PaymentFormValues) => {
        if (!invoice?.id) return;
        addPaymentMutation.mutate({
          invoiceId: invoice.id,
          amount: values.amount,
          method: values.method,
          date: values.date ? new Date(values.date) : new Date(),
          reference: values.reference || undefined,
          notes: values.notes || undefined,
        });
      }}
    />
  );
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
