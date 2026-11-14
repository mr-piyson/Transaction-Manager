"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  type PaymentMethod,
  RecordPaymentDialog,
} from "@/components/payments/record-payment-dialog";
import { trpc } from "@/lib/trpc/client";

type PurchaseOrderPaymentMethod = Exclude<PaymentMethod, "CREDIT">;

const PO_METHODS: readonly PaymentMethod[] = [
  "BANK_TRANSFER",
  "CASH",
  "CARD",
  "CHEQUE",
  "ONLINE",
  "OTHER",
];

interface POPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: {
    id: string;
    serial: string;
    version?: number;
    amountOwed?: any;
    currency?: string;
  };
  onSuccess?: () => void;
}

export function POPaymentDialog({
  open,
  onOpenChange,
  po,
  onSuccess,
}: POPaymentDialogProps) {
  const t = useTranslations();
  const utils = trpc.useUtils();

  const amountDue = Math.max(0, Number(po.amountOwed ?? 0));
  const currency = po.currency ?? "BHD";

  const payMutation = trpc.purchaseOrders.pay.useMutation({
    onSuccess: () => {
      utils.purchaseOrders.byId.invalidate({ id: po.id });
      utils.purchaseOrders.list.invalidate();
      utils.reports.apAging.invalidate();
      utils.reports.apAgingDetailed.invalidate();
      toast.success(t("purchaseOrders.paymentRecorded"));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <RecordPaymentDialog
      open={open}
      onOpenChange={onOpenChange}
      amountDue={amountDue}
      currency={currency}
      serial={po.serial}
      balanceLabel={t("purchaseOrders.amountOwed")}
      allowedMethods={PO_METHODS}
      methodLabelOverrides={{
        ONLINE: t("common.paymentMethods.benefitPay"),
      }}
      maxReferenceLength={500}
      isPending={payMutation.isPending}
      onSubmit={(values) => {
        payMutation.mutate({
          id: po.id,
          version: po.version ?? 0,
          amount: values.amount,
          method: values.method as PurchaseOrderPaymentMethod,
          date: values.date ? new Date(values.date) : new Date(),
          reference: values.reference?.trim() || undefined,
          notes: values.notes?.trim() || undefined,
        });
      }}
    />
  );
}
