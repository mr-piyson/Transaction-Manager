"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, Loader2, TriangleAlert } from "lucide-react";
import * as React from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DateInputField } from "@/components/ui/date-picker";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/hooks/use-currency";
import { trpc } from "@/lib/trpc/client";
import { CURRENCIES } from "@/lib/utils";
import { currencyCodeSchema, paymentMethodSchema } from "@/lib/validations";

const BILLING_CYCLES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "SEMI_ANNUAL", label: "Semi-annual" },
  { value: "ANNUAL", label: "Annual" },
  { value: "CUSTOM", label: "Custom" },
] as const;

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online" },
  { value: "CREDIT", label: "Credit Note" },
  { value: "OTHER", label: "Other" },
] as const;

const schema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    vendor: z.string().max(200).optional(),
    url: z
      .string()
      .url("Must be a valid URL")
      .max(500)
      .or(z.literal(""))
      .optional(),
    description: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
    billingCycle: z
      .enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "CUSTOM"])
      .default("ANNUAL"),
    customCycleDays: z.coerce.number().int().positive().optional(),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    currency: currencyCodeSchema,
    method: paymentMethodSchema.default("CARD"),
    autoRenew: z.boolean().default(true),
    startDate: z.string().min(1, "Start date is required"),
    nextRenewalDate: z.string().min(1, "Next renewal date is required"),
    alertDaysBefore: z.coerce.number().int().min(0).max(365).default(7),
    categoryId: z.string().optional(),
    departmentId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.billingCycle === "CUSTOM" && !data.customCycleDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customCycleDays"],
        message: "customCycleDays is required for custom billing cycles",
      });
    }
  });

export type SubscriptionFormValues = z.infer<typeof schema>;

interface ValidationAlertProps {
  errors: Partial<Record<keyof SubscriptionFormValues, { message?: string }>>;
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

export interface SubscriptionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription?: { id: string } & Partial<SubscriptionFormValues>;
  onSuccess?: (subscriptionId: string) => void;
}

export function SubscriptionFormDialog({
  open,
  onOpenChange,
  subscription,
  onSuccess,
}: SubscriptionFormDialogProps) {
  const isEdit = Boolean(subscription?.id);
  const utils = trpc.useUtils();
  const { currency: orgCurrency } = useCurrency();
  const { data: categoriesData } = trpc.expenses.categories.list.useQuery();
  const { data: departmentsData } =
    trpc.subscriptions.departments.list.useQuery();
  const { data: subDefaults } = trpc.subscriptions.defaults.useQuery();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(subscription, orgCurrency, subDefaults),
  });

  React.useEffect(() => {
    if (open) reset(defaults(subscription, orgCurrency, subDefaults));
  }, [open, subscription, orgCurrency, subDefaults, reset]);

  const watchBillingCycle = watch("billingCycle");
  const watchAutoRenew = watch("autoRenew");

  const createMutation = trpc.subscriptions.create.useMutation({
    onSuccess(data) {
      utils.subscriptions.list.invalidate();
      toast.success("Subscription created", { description: data.name });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error("Failed to create subscription", {
        description: err.message,
      });
    },
  });

  const updateMutation = trpc.subscriptions.update.useMutation({
    onSuccess(data) {
      utils.subscriptions.list.invalidate();
      utils.subscriptions.byId.invalidate({ id: data.id });
      toast.success("Subscription updated", { description: data.name });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error("Failed to update subscription", {
        description: err.message,
      });
    },
  });

  const isPending =
    isSubmitting || createMutation.isPending || updateMutation.isPending;

  const onSubmit: SubmitHandler<SubscriptionFormValues> = (values) => {
    const payload = {
      ...values,
      url: values.url || undefined,
      startDate: new Date(values.startDate),
      nextRenewalDate: new Date(values.nextRenewalDate),
    };
    if (isEdit && subscription?.id) {
      updateMutation.mutate({ id: subscription.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const categories = categoriesData ?? [];
  const departments = departmentsData ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-160">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-5" />
            {isEdit ? "Edit subscription" : "New subscription"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details below and save."
              : "Track a recurring commitment — domain renewals, SaaS seats, licences."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <ValidationAlert errors={errors} />

          <div className="space-y-4 max-h-100 overflow-y-auto pr-2">
            <Field>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Company Domain Renewal"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  placeholder="e.g. GoDaddy"
                  {...register("vendor")}
                />
              </Field>
              <Field>
                <Label htmlFor="url">Billing portal URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://..."
                  {...register("url")}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  step="0.001"
                  aria-invalid={!!errors.amount}
                  {...register("amount")}
                />
              </Field>
              <Field>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={watch("currency")}
                  onValueChange={(v) => setValue("currency", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(CURRENCIES).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label>Billing cycle</Label>
                <Select
                  value={watchBillingCycle}
                  onValueChange={(v) =>
                    setValue("billingCycle", v as any, { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <Label>Payment method</Label>
                <Select
                  value={watch("method")}
                  onValueChange={(v) => setValue("method", v as any)}
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

            {watchBillingCycle === "CUSTOM" && (
              <Field>
                <Label htmlFor="customCycleDays">Cycle length (days) *</Label>
                <Input
                  id="customCycleDays"
                  type="number"
                  min={1}
                  placeholder="30"
                  aria-invalid={!!errors.customCycleDays}
                  {...register("customCycleDays")}
                />
                {errors.customCycleDays && (
                  <p className="text-sm text-destructive">
                    {errors.customCycleDays.message}
                  </p>
                )}
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="startDate">Start date *</Label>
                <DateInputField
                  control={control}
                  name="startDate"
                  rules={{ required: "Start date is required" }}
                  required
                  showTodayButton
                />
              </Field>
              <Field>
                <Label htmlFor="nextRenewalDate">Next renewal date *</Label>
                <DateInputField
                  control={control}
                  name="nextRenewalDate"
                  rules={{ required: "Next renewal date is required" }}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <Field>
                <Label htmlFor="alertDaysBefore">Alert before (days)</Label>
                <Input
                  id="alertDaysBefore"
                  type="number"
                  min={0}
                  max={365}
                  {...register("alertDaysBefore")}
                />
              </Field>
              <Field>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoRenew">Vendor auto-renews</Label>
                    <p className="text-xs text-muted-foreground">
                      Informational only
                    </p>
                  </div>
                  <Switch
                    id="autoRenew"
                    checked={!!watchAutoRenew}
                    onCheckedChange={(v) => setValue("autoRenew", v)}
                  />
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label>Category</Label>
                <Select
                  value={watch("categoryId") ?? ""}
                  onValueChange={(v) => setValue("categoryId", v || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <Label>Department</Label>
                <Select
                  value={watch("departmentId") ?? ""}
                  onValueChange={(v) =>
                    setValue("departmentId", v || undefined)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                className="resize-none"
                rows={2}
                {...register("description")}
              />
            </Field>

            <Field>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                className="resize-none"
                rows={2}
                {...register("notes")}
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
              {isEdit ? "Save changes" : "Create subscription"}
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

interface SubscriptionFormContextValue {
  openCreate: (options?: OpenOptions) => void;
  openEdit: (
    subscription: { id: string } & Partial<SubscriptionFormValues>,
    options?: OpenOptions,
  ) => void;
}

const SubscriptionFormContext =
  React.createContext<SubscriptionFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  subscription?: { id: string } & Partial<SubscriptionFormValues>;
  onSuccess?: (id: string) => void;
}

export function SubscriptionFormProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({
      open: true,
      subscription: undefined,
      onSuccess: options?.onSuccess,
    });
  }, []);

  const openEdit = React.useCallback(
    (
      subscription: { id: string } & Partial<SubscriptionFormValues>,
      options?: OpenOptions,
    ) => {
      setState({ open: true, subscription, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <SubscriptionFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <SubscriptionFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        subscription={state.subscription}
        onSuccess={state.onSuccess}
      />
    </SubscriptionFormContext.Provider>
  );
}

export function useSubscriptionForm(): SubscriptionFormContextValue {
  const ctx = React.useContext(SubscriptionFormContext);
  if (!ctx)
    throw new Error(
      "useSubscriptionForm must be used inside <SubscriptionFormProvider>",
    );
  return ctx;
}
function defaults(
  subscription?: { id: string } & Partial<SubscriptionFormValues>,
  orgCurrency?: string,
  subDefaults?: { defaultAlertDaysBefore?: number },
): SubscriptionFormValues {
  return {
    name: subscription?.name ?? "",
    vendor: subscription?.vendor ?? undefined,
    url: subscription?.url ?? "",
    description: subscription?.description ?? undefined,
    notes: subscription?.notes ?? undefined,
    billingCycle: subscription?.billingCycle ?? "ANNUAL",
    customCycleDays: subscription?.customCycleDays,
    amount: typeof subscription?.amount === "number" ? subscription.amount : 0,
    currency: (subscription?.currency ?? orgCurrency ?? "BHD") as any,
    method: (subscription?.method ?? "CARD") as any,
    autoRenew: subscription?.autoRenew ?? true,
    startDate: subscription?.startDate ?? "",
    nextRenewalDate: subscription?.nextRenewalDate ?? "",
    alertDaysBefore:
      typeof subscription?.alertDaysBefore === "number"
        ? subscription.alertDaysBefore
        : (subDefaults?.defaultAlertDaysBefore ?? 7),
    categoryId: subscription?.categoryId ?? undefined,
    departmentId: subscription?.departmentId ?? undefined,
  };
}
