"use client";

import { Banknote, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";
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

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer", key: "bankTransfer" },
  { value: "CASH", label: "Cash", key: "cash" },
  { value: "CARD", label: "Card", key: "card" },
  { value: "CHEQUE", label: "Cheque", key: "cheque" },
  { value: "ONLINE", label: "Online", key: "online" },
  { value: "OTHER", label: "Other", key: "other" },
] as const;

type PaymentMethodType = (typeof PAYMENT_METHODS)[number]["value"];

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

  const [amount, setAmount] = React.useState(String(amountDue));
  const [method, setMethod] =
    React.useState<PaymentMethodType>("BANK_TRANSFER");
  const [date, setDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setAmount(amountDue > 0 ? String(amountDue) : "");
      setMethod("BANK_TRANSFER");
      setDate(new Date().toISOString().slice(0, 10));
      setReference("");
      setNotes("");
    }
  }, [open, amountDue]);

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

  const parsedAmount = Number(amount);
  const isValidAmount =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= amountDue + 1e-6;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAmount || payMutation.isPending) return;

    payMutation.mutate({
      id: po.id,
      version: po.version ?? 0,
      amount: parsedAmount,
      method,
      date: new Date(date),
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !payMutation.isPending && onOpenChange(v)}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="size-5 text-primary" />
            {t("purchaseOrders.recordPayment")}
          </DialogTitle>
          <DialogDescription>
            {po.serial} · {t("purchaseOrders.amountOwed")}:{" "}
            <span className="font-semibold text-foreground">
              {amountDue.toFixed(3)} {currency}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="po-payment-amount">
                {t("invoices.paymentAmount")} ({currency}) *
              </Label>
              <Input
                id="po-payment-amount"
                type="number"
                min="0.001"
                max={amountDue}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.000"
                className="tabular-nums"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("invoices.paymentMethod")} *</Label>
              <Select
                value={method}
                onValueChange={(val) => {
                  if (val) setMethod(val as PaymentMethodType);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {t(`common.paymentMethods.${m.key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("common.date")} *</Label>
            <DatePicker value={date} onChange={(newDate) => setDate(newDate)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="po-payment-ref">{t("common.reference")}</Label>
            <Input
              id="po-payment-ref"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Transfer # / Cheque #"
              maxLength={500}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="po-payment-notes">{t("common.notes")}</Label>
            <Textarea
              id="po-payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional payment notes..."
              rows={2}
              maxLength={2000}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={payMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!isValidAmount || payMutation.isPending}
            >
              {payMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {t("purchaseOrders.recordPayment")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
