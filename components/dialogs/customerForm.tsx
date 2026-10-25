"use client";

/**
 * customer-form.tsx
 * ─────────────────
 * Self-contained customer create/edit dialog.
 *
 * Exports
 * ───────
 *   <CustomerFormProvider />   — mount once in your root layout
 *   useCustomerForm()          — imperative hook: openCreate() / openEdit()
 *   <CustomerFormDialog />     — controlled dialog if you prefer local state
 *
 * Requirements
 * ────────────
 *   shadcn/ui v4  (Field, Input, Label, Button, Dialog, Alert)
 *   react-hook-form, @hookform/resolvers/zod, zod
 *   @trpc/react-query  (api.customer.create / update)
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, TriangleAlert } from "lucide-react";
import * as React from "react";
import { Controller, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
// shadcn v4 primitives ── no <Form> wrapper component
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field"; // shadcn v4
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BAHRAIN_CITIES,
  type BahrainCity,
  findBahrainCityByQuery,
  matchesBahrainCity,
  normalizeCitySearch,
} from "@/lib/bahrain-cities";
import { trpc } from "@/lib/trpc/client";
import { Label } from "../ui/label";

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.email("Invalid email address").or(z.literal("")).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
  creditLimit: z.coerce
    .number()
    .int("Must be a whole number")
    .min(0, "Must be 0 or more"),
});

export type CustomerFormValues = z.infer<typeof schema>;

// ─────────────────────────────────────────────────────────────────────────────
// Validation alert — all errors in one place, above the form
// ─────────────────────────────────────────────────────────────────────────────

interface ValidationAlertProps {
  errors: Partial<Record<keyof CustomerFormValues, { message?: string }>>;
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

// ─────────────────────────────────────────────────────────────────────────────
// CityCombobox  (Bahrain list + free-text "create")
// ─────────────────────────────────────────────────────────────────────────────

interface CityComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}

/** Canonical English name for known cities, otherwise the value as typed. */
function cityLabel(value: string): string {
  return findBahrainCityByQuery(value)?.en ?? value;
}

/**
 * City picker that searches the hard-coded Bahrain list in English or Arabic
 * and also accepts a city that isn't in the list. Typed text is offered as the
 * last option ("Add new"); confirming it saves the text verbatim. Arabic or
 * accent variants of a known city are normalised to its English name.
 */
function CityCombobox({ id, value, onChange, invalid }: CityComboboxProps) {
  const [customCities, setCustomCities] = React.useState<BahrainCity[]>([]);
  const [typed, setTyped] = React.useState(() => cityLabel(value));
  const typedRef = React.useRef(typed);
  const valueRef = React.useRef(value);
  // While the popup is closing, Base UI resets the input to the selected value.
  // Ignore those resets so a freshly typed (or committed) city is not clobbered.
  const suppressInputResetRef = React.useRef(false);

  const updateTyped = React.useCallback((next: string) => {
    typedRef.current = next;
    setTyped(next);
  }, []);

  // Re-sync the input when the form loads or resets another customer.
  React.useEffect(() => {
    if (valueRef.current !== value) {
      valueRef.current = value;
      updateTyped(cityLabel(value));
    }
  }, [value, updateTyped]);

  const cities = React.useMemo(() => {
    const list: BahrainCity[] = [...BAHRAIN_CITIES];
    for (const city of customCities) {
      if (!list.some((item) => item.en === city.en)) list.push(city);
    }
    // A saved custom city must be an option, otherwise the combobox cannot
    // display it (and would drop it) as the selected value.
    if (value && !list.some((item) => item.en === value)) {
      list.push({ en: value, ar: "" });
    }
    return list;
  }, [customCities, value]);

  const query = typed.trim();

  const typedCity = React.useMemo<BahrainCity | null>(() => {
    if (!query) return null;
    const q = normalizeCitySearch(query);
    const known = cities.some(
      (city) =>
        normalizeCitySearch(city.en) === q ||
        normalizeCitySearch(city.ar) === q,
    );
    return known ? null : { en: query, ar: "" };
  }, [cities, query]);

  // Typed city goes last so a real match is highlighted first.
  const options = typedCity ? [...cities, typedCity] : cities;
  const selected =
    findBahrainCityByQuery(value) ??
    options.find((city) => city.en === value) ??
    null;

  function commit(raw: string) {
    const known = findBahrainCityByQuery(raw);
    const next = known?.en ?? raw.trim();

    if (next && !known) {
      setCustomCities((prev) =>
        prev.some(
          (city) => normalizeCitySearch(city.en) === normalizeCitySearch(next),
        )
          ? prev
          : [...prev, { en: next, ar: "" }],
      );
    }

    updateTyped(next);
    if (valueRef.current !== next) {
      valueRef.current = next;
      onChange(next);
    }
  }

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(city) => commit(city?.en ?? "")}
      inputValue={typed}
      onInputValueChange={(next) => {
        if (suppressInputResetRef.current) return;
        updateTyped(next);
      }}
      onOpenChange={(open) => {
        if (!open) commit(typedRef.current);
      }}
      onOpenChangeComplete={(open) => {
        if (open) return;
        suppressInputResetRef.current = true;
        commit(typedRef.current);
        window.setTimeout(() => {
          suppressInputResetRef.current = false;
        }, 0);
      }}
      itemToStringLabel={(city) => city.en}
      isItemEqualToValue={(item, city) => item.en === city.en}
      filter={(city, search) => matchesBahrainCity(city, search)}
    >
      <ComboboxInput
        id={id}
        placeholder="Search or type a city"
        showClear
        className="w-full"
        aria-invalid={invalid}
      />
      <ComboboxContent>
        <ComboboxEmpty>No city found — press Enter to add it.</ComboboxEmpty>
        <ComboboxList>
          {(city: BahrainCity) => (
            <ComboboxItem key={city.en} value={city}>
              <span>{city.en}</span>
              {city === typedCity ? (
                <span className="ms-auto text-xs text-muted-foreground">
                  Add new
                </span>
              ) : city.ar ? (
                <span
                  dir="rtl"
                  className="ms-auto text-xs text-muted-foreground"
                >
                  {city.ar}
                </span>
              ) : null}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomerFormDialog  (controlled, composable)
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Provide id + values to enter edit mode; omit for create mode. */
  customer?: { id: string } & Partial<CustomerFormValues>;
  /** Receives the id of the created / updated customer. */
  onSuccess?: (customerId: string) => void;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: CustomerFormDialogProps) {
  const isEdit = Boolean(customer?.id);
  const utils = trpc.useUtils();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults(customer),
  });

  // Callers often only pass the fields they already have (e.g. the list passes
  // name/phone/email). Fetch the full record so untouched fields — especially
  // creditLimit — aren't reset to their defaults when saving.
  const { data: fullCustomer } = trpc.customers.byId.useQuery(
    { id: customer?.id ?? "" },
    { enabled: open && isEdit },
  );
  const source = isEdit ? (fullCustomer ?? customer) : undefined;

  // Re-populate whenever the dialog (re)opens with new data
  React.useEffect(() => {
    if (open) reset(defaults(source));
  }, [open, source, reset]);

  // ── mutations ──────────────────────────────────────────────────────────────

  const createMutation = trpc.customers.create.useMutation({
    onSuccess(data) {
      utils.customers.list.invalidate();
      utils.customers.byId.invalidate({ id: data.id });
      toast.success("Customer created", { description: data.name });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error("Failed to create customer", { description: err.message });
    },
  });

  const updateMutation = trpc.customers.update.useMutation({
    onSuccess(data) {
      utils.customers.list.invalidate();
      utils.customers.byId.invalidate({ id: data.id });
      toast.success("Customer updated", { description: data.name });
      onSuccess?.(data.id);
      onOpenChange(false);
    },
    onError(err) {
      toast.error("Failed to update customer", { description: err.message });
    },
  });

  const isPending =
    isSubmitting || createMutation.isPending || updateMutation.isPending;

  const onSubmit: SubmitHandler<CustomerFormValues> = (values) => {
    if (isEdit && customer?.id) {
      updateMutation.mutate({ id: customer.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit customer" : "New customer"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details below and save."
              : "Fill in the details to create a new customer."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* ── Validation alert box ─────────────────────────────────────── */}
          <ValidationAlert errors={errors} />

          <div className="space-y-4">
            {/* Name */}
            <Field>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Acme Corp"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
            </Field>

            {/* Phone + Email */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+973 1234 5678"
                  aria-invalid={!!errors.phone}
                  {...register("phone")}
                />
              </Field>
              <Field>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="billing@acme.com"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
              </Field>
            </div>

            {/* Address + City */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Building 1, Road 2, Block 3"
                  {...register("address")}
                />
              </Field>
              <Field>
                <Label htmlFor="city">City</Label>
                <Controller
                  control={control}
                  name="city"
                  render={({ field }) => (
                    <CityCombobox
                      id="city"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Field>
            </div>

            {/* Tax ID + Credit limit */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <Label htmlFor="taxId">Tax ID</Label>
                <Input
                  id="taxId"
                  placeholder="VAT-000001"
                  {...register("taxId")}
                />
              </Field>
              <Field>
                <Label htmlFor="creditLimit">Credit limit (fils)</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  aria-invalid={!!errors.creditLimit}
                  {...register("creditLimit")}
                />
              </Field>
            </div>

            {/* Notes */}
            <Field>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any internal notes…"
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
              {isEdit ? "Save changes" : "Create customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider + useCustomerForm hook  (toast-style imperative API)
// ─────────────────────────────────────────────────────────────────────────────

interface OpenOptions {
  onSuccess?: (id: string) => void;
}

interface CustomerFormContextValue {
  /** Open in create mode */
  openCreate: (options?: OpenOptions) => void;
  /** Open in edit mode — pass any existing field values you have */
  openEdit: (
    customer: { id: string } & Partial<CustomerFormValues>,
    options?: OpenOptions,
  ) => void;
}

const CustomerFormContext =
  React.createContext<CustomerFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  customer?: { id: string } & Partial<CustomerFormValues>;
  onSuccess?: (id: string) => void;
}

/**
 * Mount once near the top of your tree (e.g. root layout / providers.tsx).
 * The dialog portal renders here; children are optional.
 */
export function CustomerFormProvider({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({
      open: true,
      customer: undefined,
      onSuccess: options?.onSuccess,
    });
  }, []);

  const openEdit = React.useCallback(
    (
      customer: { id: string } & Partial<CustomerFormValues>,
      options?: OpenOptions,
    ) => {
      setState({ open: true, customer, onSuccess: options?.onSuccess });
    },
    [],
  );

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <CustomerFormContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <CustomerFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        customer={state.customer}
        onSuccess={state.onSuccess}
      />
    </CustomerFormContext.Provider>
  );
}

/**
 * useCustomerForm()
 *
 * Call openCreate() or openEdit() from any component, hook, or event handler.
 * Must be used inside <CustomerFormProvider>.
 *
 * @example
 *   const { openCreate, openEdit } = useCustomerForm();
 *   openCreate({ onSuccess: (id) => router.push(`/customers/${id}`) });
 *   openEdit({ id: c.id, name: c.name, creditLimit: Number(c.creditLimit) });
 */
export function useCustomerForm(): CustomerFormContextValue {
  const ctx = React.useContext(CustomerFormContext);
  if (!ctx)
    throw new Error(
      "useCustomerForm must be used inside <CustomerFormProvider>",
    );
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** The server serialises Prisma Decimals as strings, so accept both shapes. */
type CustomerDefaultsSource = { id: string } & Partial<
  Record<keyof CustomerFormValues, unknown>
>;

function asText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return String(value);
}

function defaults(customer?: CustomerDefaultsSource): CustomerFormValues {
  const creditLimit = Number(customer?.creditLimit);
  return {
    name: asText(customer?.name) ?? "",
    phone: asText(customer?.phone),
    email: asText(customer?.email),
    address: asText(customer?.address),
    city: asText(customer?.city),
    taxId: asText(customer?.taxId),
    notes: asText(customer?.notes),
    creditLimit: Number.isFinite(creditLimit) ? creditLimit : 0,
  };
}
