"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, TriangleAlert, X } from "lucide-react";
import * as React from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";

const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "CARD",
  "CHEQUE",
  "ONLINE",
  "OTHER",
] as const;

const schema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  method: z.enum(PAYMENT_METHODS).default("CASH"),
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  categoryId: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof schema>;

export interface ExpenseFormRecord {
  id: string;
  description: string;
  amount: number | string;
  method: string;
  date: string | Date;
  reference?: string | null;
  notes?: string | null;
  categoryId?: string | null;
  purchaseOrderId?: string | null;
}

function toDateInputValue(date: Date): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaults(expense?: ExpenseFormRecord): ExpenseFormValues {
  return {
    description: expense?.description ?? "",
    amount: expense ? Number(expense.amount) : ("" as unknown as number),
    method: (expense?.method as (typeof PAYMENT_METHODS)[number]) ?? "CASH",
    date: expense?.date
      ? toDateInputValue(new Date(expense.date))
      : toDateInputValue(new Date()),
    reference: expense?.reference ?? undefined,
    notes: expense?.notes ?? undefined,
    categoryId: expense?.categoryId ?? "",
  };
}

interface ValidationAlertProps {
  errors: Partial<Record<keyof ExpenseFormValues, { message?: string }>>;
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

export interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: ExpenseFormRecord;
  /** Auto-populated by the procurement workflow (never a general selector). */
  defaults?: { purchaseOrderId?: string };
  onSuccess?: (expenseId: string) => void;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
  defaults: formDefaults,
  onSuccess,
}: ExpenseFormDialogProps) {
  const isEdit = Boolean(expense?.id);
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(expense),
  });

  const categoryId = watch("categoryId");

  React.useEffect(() => {
    if (open) reset(defaults(expense));
  }, [open, expense, reset]);

  const { data: categories } = trpc.expenses.categories.list.useQuery(
    undefined,
    { enabled: open },
  );
  const createMutation = trpc.expenses.create.useMutation({
    onSuccess(data) {
      utils.expenses.list.invalidate();
      toast.success("Expense recorded");
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error("Failed to record expense", { description: err.message });
    },
  });

  const updateMutation = trpc.expenses.update.useMutation({
    onSuccess(data) {
      utils.expenses.list.invalidate();
      utils.expenses.byId.invalidate({ id: data.id });
      toast.success("Expense updated");
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error("Failed to update expense", { description: err.message });
    },
  });

  // ── Inline category creation (there was no UI path before) ──────────────
  const [showCategoryForm, setShowCategoryForm] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState("");
  const [categoryAccountId, setCategoryAccountId] = React.useState("");
  const createCategoryMutation = trpc.expenses.categories.create.useMutation({
    onSuccess(cat) {
      utils.expenses.categories.list.invalidate();
      setValue("categoryId", cat.id);
      setShowCategoryForm(false);
      setCategoryName("");
      setCategoryAccountId("");
      toast.success("Category created");
    },
    onError(err) {
      toast.error("Failed to create category", { description: err.message });
    },
  });

  const { data: accounts } = trpc.settings.chartOfAccounts.list.useQuery(
    undefined,
    {
      enabled: showCategoryForm,
    },
  );
  const expenseAccounts = (accounts ?? []).filter((a) => a.type === "EXPENSE");

  const isPending =
    isSubmitting || createMutation.isPending || updateMutation.isPending;

  const onSubmit: SubmitHandler<ExpenseFormValues> = (values) => {
    const input = {
      description: values.description,
      amount: values.amount,
      method: values.method,
      date: new Date(values.date),
      reference: values.reference || undefined,
      notes: values.notes || undefined,
      categoryId: values.categoryId || undefined,
    };

    if (isEdit && expense?.id) {
      updateMutation.mutate({
        id: expense.id,
        ...input,
        purchaseOrderId: expense.purchaseOrderId ?? undefined,
      });
    } else {
      createMutation.mutate({
        ...input,
        purchaseOrderId: formDefaults?.purchaseOrderId,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit expense" : "Record expense"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details below. Accounting fields will re-post the journal entry."
              : "Fill in the details to record a new expense. A journal entry is posted automatically."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <ValidationAlert errors={errors} />

          <div className="space-y-4">
            <Field>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="e.g. Office supplies, utilities"
                aria-invalid={!!errors.description}
                {...register("description")}
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
                  {...register("amount")}
                />
              </Field>
              <Field>
                <Label htmlFor="method">Payment method</Label>
                <NativeSelect id="method" {...register("method")}>
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
                <Input
                  id="date"
                  type="date"
                  aria-invalid={!!errors.date}
                  {...register("date")}
                />
              </Field>
              <Field>
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  placeholder="e.g. INV-2024-001"
                  {...register("reference")}
                />
              </Field>
            </div>

            <Field>
              <Label htmlFor="categoryId">Category</Label>
              <div className="flex items-center gap-2">
                <NativeSelect
                  id="categoryId"
                  className="flex-1"
                  value={categoryId ?? ""}
                  onChange={(e) => setValue("categoryId", e.target.value)}
                >
                  <NativeSelectOption value="">No category</NativeSelectOption>
                  {(categories ?? []).map((c) => (
                    <NativeSelectOption key={c.id} value={c.id}>
                      {c.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {!showCategoryForm && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCategoryForm(true)}
                  >
                    <Plus className="size-4" />
                  </Button>
                )}
              </div>
              {showCategoryForm && (
                <div className="mt-2 space-y-2 rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="categoryName" className="sr-only">
                      Category name
                    </Label>
                    <Input
                      id="categoryName"
                      placeholder="Category name"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowCategoryForm(false)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <NativeSelect
                    value={categoryAccountId}
                    onChange={(e) => setCategoryAccountId(e.target.value)}
                  >
                    <NativeSelectOption value="">
                      No GL account
                    </NativeSelectOption>
                    {expenseAccounts.map((a) => (
                      <NativeSelectOption key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      !categoryName.trim() || createCategoryMutation.isPending
                    }
                    onClick={() =>
                      createCategoryMutation.mutate({
                        name: categoryName.trim(),
                        accountId: categoryAccountId || undefined,
                      })
                    }
                  >
                    {createCategoryMutation.isPending && (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    )}
                    Create
                  </Button>
                </div>
              )}
            </Field>

            <Field>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Internal notes..."
                className="resize-none"
                rows={3}
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
              {isEdit ? "Save changes" : "Record expense"}
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

interface ExpenseFormContextValue {
  openCreate: (
    options?: OpenOptions & { defaults?: { purchaseOrderId?: string } },
  ) => void;
  openEdit: (expense: ExpenseFormRecord, options?: OpenOptions) => void;
}

const ExpenseFormContext = React.createContext<ExpenseFormContextValue | null>(
  null,
);

interface DialogState {
  open: boolean;
  expense?: ExpenseFormRecord;
  defaults?: { purchaseOrderId?: string };
  onSuccess?: (id: string) => void;
}

export function ExpenseFormProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback(
    (options?: OpenOptions & { defaults?: { purchaseOrderId?: string } }) => {
      setState({
        open: true,
        expense: undefined,
        defaults: options?.defaults,
        onSuccess: options?.onSuccess,
      });
    },
    [],
  );

  const openEdit = React.useCallback(
    (expense: ExpenseFormRecord, options?: OpenOptions) => {
      setState({
        open: true,
        expense,
        defaults: undefined,
        onSuccess: options?.onSuccess,
      });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <ExpenseFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <ExpenseFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        expense={state.expense}
        defaults={state.defaults}
        onSuccess={state.onSuccess}
      />
    </ExpenseFormContext.Provider>
  );
}

export function useExpenseForm(): ExpenseFormContextValue {
  const ctx = React.useContext(ExpenseFormContext);
  if (!ctx)
    throw new Error("useExpenseForm must be used inside <ExpenseFormProvider>");
  return ctx;
}
