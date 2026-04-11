'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useForm, type ReactFormExtendedApi, type AnyFieldApi } from '@tanstack/react-form';
import { z } from 'zod';

import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

// ---------------------------------------------------------------------------
// 1. Inferred form value type helper
// ---------------------------------------------------------------------------
type InferFormValues<T extends z.ZodObject<z.ZodRawShape>> = z.infer<T>;

// ---------------------------------------------------------------------------
// 2. Form Context
//    Typed with the concrete form API so consumers never get `any`.
// ---------------------------------------------------------------------------
// @ts-ignore
type AppFormInstance<T extends z.ZodObject<z.ZodRawShape>> = ReactFormExtendedApi<
  InferFormValues<T>,
  undefined
>;

// We use `unknown` as the context value type and cast on read so that the
// context itself stays generic-free (React context cannot hold a generic type).
const FormContext = createContext<unknown>(null);

export function useAppFormContext<T extends z.ZodObject<z.ZodRawShape>>(): AppFormInstance<T> {
  const context = useContext(FormContext);
  if (!context) throw new Error('Form components must be used within <AppForm>');
  return context as AppFormInstance<T>;
}

// ---------------------------------------------------------------------------
// 3. AppForm — the main wrapper
// ---------------------------------------------------------------------------
interface AppFormProps<T extends z.ZodObject<z.ZodRawShape>> {
  schema: T;
  defaultValues: InferFormValues<T>;
  onSubmit: (values: InferFormValues<T>) => void;
  /**
   * Render-prop receives the typed form instance so callers can access
   * `form.Subscribe`, `form.Field`, etc. with full type inference.
   */
  children: (form: AppFormInstance<T>) => ReactNode;
  className?: string;
}

export function AppForm<T extends z.ZodObject<z.ZodRawShape>>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
}: AppFormProps<T>) {
  // @ts-ignore
  const form = useForm<InferFormValues<T>>({
    defaultValues,
    validators: {
      // TanStack Form v1 supports Standard Schema (Zod v3/v4) natively —
      // no validatorAdapter needed at the form level.
      onChange: schema,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value);
    },
  }) as AppFormInstance<T>;

  return (
    <FormContext.Provider value={form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className={className}
      >
        {children(form)}
      </form>
    </FormContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// 4. FormInput — a smart standard text/email/password input
// ---------------------------------------------------------------------------
interface FormInputProps {
  name: string;
  label: string;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  icon?: ReactNode;
  description?: string;
  options?: { label: string; value: string }[];
}

export function FormInput({
  name,
  label,
  placeholder,
  type = 'text',
  icon,
  description,
  options,
}: FormInputProps) {
  // `useAppFormContext` is called without a schema generic here because we
  // only need the field API — the concrete generic is resolved at the call site.
  const form = useAppFormContext();

  return (
    <form.Field
      name={name}
      // eslint-disable-next-line react/no-children-prop
      children={(field: AnyFieldApi) => {
        // Only flag invalid once the user has interacted with the field.
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

        if (type === 'select') {
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
              <Select
                value={field.state.value?.toString()}
                onValueChange={(val) => field.handleChange(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{field.state.meta.errors[0]}</FieldError>
            </Field>
          );
        }

        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id={field.name}
                name={field.name}
                value={field.state.value as string}
                onBlur={field.handleBlur}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  if (type === 'number') {
                    field.handleChange(val === '' ? undefined : Number(val) as any);
                  } else {
                    field.handleChange(val as any);
                  }
                }}
                type={type}
                placeholder={placeholder}
                aria-invalid={isInvalid}
              />
              {icon && <InputGroupAddon>{icon}</InputGroupAddon>}
            </InputGroup>
            {description && <FieldDescription>{description}</FieldDescription>}
            {/* FieldError accepts an errors array — never a plain string child */}
            {isInvalid && <FieldError errors={field.state.meta.errors} />}
          </Field>
        );
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// 5. FormCustomField — wraps any custom control (date pickers, selects, etc.)
// ---------------------------------------------------------------------------
interface FormCustomFieldRenderProps<V> {
  value: V;
  onChange: (val: V) => void;
  /** `true` when the field has been touched and contains a validation error */
  isInvalid: boolean;
}

interface FormCustomFieldProps<V = unknown> {
  name: string;
  label: string;
  description?: string;
  render: (props: FormCustomFieldRenderProps<V>) => ReactNode;
}

export function FormCustomField<V = unknown>({
  name,
  label,
  description,
  render,
}: FormCustomFieldProps<V>) {
  const form = useAppFormContext();

  return (
    <form.Field
      name={name}
      // eslint-disable-next-line react/no-children-prop
      children={(field: AnyFieldApi) => {
        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel>{label}</FieldLabel>
            {render({
              value: field.state.value as V,
              onChange: (val: V) => field.handleChange(val),
              isInvalid,
            })}
            {description && <FieldDescription>{description}</FieldDescription>}
            {isInvalid && <FieldError errors={field.state.meta.errors} />}
          </Field>
        );
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// 6. FormGroup — responsive grid layout helper
// ---------------------------------------------------------------------------
type GridColumns = 1 | 2 | 3 | 4;

interface FormGroupProps {
  children: ReactNode;
  columns?: GridColumns;
  className?: string;
}

const columnVariants: Record<GridColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export function FormGroup({ children, columns = 2, className }: FormGroupProps) {
  return <div className={cn('grid gap-4', columnVariants[columns], className)}>{children}</div>;
}
