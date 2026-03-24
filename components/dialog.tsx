import React, { JSXElementConstructor, ReactElement, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, AlertCircle, Loader2, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'select'
  | 'date'
  | 'image'
  | 'file'
  | 'textarea'
  | 'custom';

export type FieldWidth = 'full' | 'half';

export interface SelectOption {
  label: string;
  value: string;
}

export interface BaseFieldSchema<T = any> {
  name: keyof T;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  width?: FieldWidth;
  defaultValue?: any;
}

export interface TextFieldSchema<T = any> extends BaseFieldSchema<T> {
  type: 'text' | 'email' | 'password' | 'textarea';
  minLength?: number;
  maxLength?: number;
}

export interface NumberFieldSchema<T = any> extends BaseFieldSchema<T> {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectFieldSchema<T = any> extends BaseFieldSchema<T> {
  type: 'select';
  options: SelectOption[];
}

export interface DateFieldSchema<T = any> extends BaseFieldSchema<T> {
  type: 'date';
  minDate?: Date;
  maxDate?: Date;
}

export interface FileFieldSchema<T = any> extends BaseFieldSchema<T> {
  type: 'image' | 'file';
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
}

export interface CustomFieldSchema<T = any> extends BaseFieldSchema<T> {
  type: 'custom';
  component: React.ComponentType<{
    value: any;
    onChange: (value: any) => void;
    error?: string;
  }>;
}

export type FieldSchema<T = any> =
  | TextFieldSchema<T>
  | NumberFieldSchema<T>
  | SelectFieldSchema<T>
  | DateFieldSchema<T>
  | FileFieldSchema<T>
  | CustomFieldSchema<T>;

// ============================================================================
// TOAST CONFIG
// ============================================================================

export interface ToastConfig {
  enabled?: boolean;
  successMessage?: string | ((data: any) => string);
  errorMessage?: string | ((error: any) => string);
}

// ============================================================================
// UNIVERSAL DIALOG PROPS
// ============================================================================

export interface UniversalDialogProps<TData = any, TVariables = Partial<TData>, TError = Error> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldSchema<TData>[];
  submitLabel?: string;
  cancelLabel?: string;

  /**
   * The async function that performs the mutation (API call).
   * Works with tRPC, fetch, axios — anything that returns a Promise.
   */
  mutationFn: (variables: TVariables) => Promise<TData>;

  /**
   * Called with the mutation result after a successful submission.
   * The dialog will already be closed when this fires.
   */
  onSuccess?: (data: TData, variables: TVariables) => void;

  /**
   * Called with the error after a failed submission.
   * Use this for side-effects (e.g. logging); the inline error banner
   * is shown automatically when `closeOnError` is true.
   */
  onError?: (error: TError, variables: TVariables) => void;

  /**
   * Transform form data before it is passed to mutationFn.
   */
  transformData?: (data: Partial<TData>) => TVariables;

  /**
   * Control toast notifications. Pass `false` to disable all toasts,
   * or an object to customise the messages.
   */
  toasts?: false | ToastConfig;

  /**
   * When true (default), the dialog stays open and shows an inline error
   * banner on failure so the user can correct and retry.
   * Set to false to close immediately regardless of outcome.
   */
  closeOnError?: boolean;

  children: ReactElement<unknown, string | JSXElementConstructor<any>>;
}

// ============================================================================
// ZOD SCHEMA GENERATOR
// ============================================================================

const generateZodSchema = <T,>(fields: FieldSchema<T>[]) => {
  const schemaObject: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'textarea': {
        const textField = field as TextFieldSchema;
        fieldSchema = z.string();
        if (field.required)
          fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} is required`);
        if (field.type === 'email')
          fieldSchema = (fieldSchema as z.ZodString).email('Invalid email address');
        if (textField.minLength)
          fieldSchema = (fieldSchema as z.ZodString).min(
            textField.minLength,
            `Minimum ${textField.minLength} characters required`,
          );
        if (textField.maxLength)
          fieldSchema = (fieldSchema as z.ZodString).max(
            textField.maxLength,
            `Maximum ${textField.maxLength} characters allowed`,
          );
        if (!field.required) fieldSchema = fieldSchema.optional().or(z.literal(''));
        break;
      }

      case 'number': {
        const numberField = field as NumberFieldSchema;
        fieldSchema = z.preprocess(
          (val) => {
            if (val === '' || val === undefined || val === null)
              return field.required ? undefined : null;
            const num = Number(val);
            return isNaN(num) ? val : num;
          },
          (() => {
            let numSchema = z.number().refine((val) => !isNaN(val), {
              message: `${field.label} must be a number`,
            });
            if (numberField.min !== undefined)
              numSchema = numSchema.min(numberField.min, `Min: ${numberField.min}`);
            if (numberField.max !== undefined)
              numSchema = numSchema.max(numberField.max, `Max: ${numberField.max}`);
            return field.required ? numSchema : numSchema.optional().nullable();
          })(),
        );
        break;
      }

      case 'select':
        fieldSchema = field.required
          ? z.string().min(1, `${field.label} is required`)
          : z.string().optional().or(z.literal(''));
        break;

      case 'date':
        fieldSchema = field.required
          ? z.date().refine((val) => val instanceof Date && !isNaN(val.getTime()), {
              message: `${field.label} is required`,
            })
          : z.date().optional().nullable();
        break;

      case 'image':
      case 'file': {
        const fileField = field as FileFieldSchema;
        if (fileField.multiple) {
          fieldSchema = field.required
            ? z
                .array(z.instanceof(File))
                .min(1, `At least one ${field.label.toLowerCase()} is required`)
            : z.array(z.instanceof(File)).optional();
        } else {
          fieldSchema = field.required
            ? z.instanceof(File, { message: `${field.label} is required` })
            : z.instanceof(File).optional().nullable();
        }
        break;
      }

      case 'custom':
        fieldSchema = field.required ? z.any() : z.any().optional();
        break;

      default:
        fieldSchema = z.any();
    }

    schemaObject[String(field.name)] = fieldSchema;
  });

  return z.object(schemaObject);
};

// ============================================================================
// FIELD WRAPPER
// ============================================================================

const FieldWrapper: React.FC<{
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, required, description, error, className, children }) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    <label className="text-sm font-medium leading-none">
      {label}
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
    {children}
    {description && <p className="text-sm text-muted-foreground">{description}</p>}
    {error && <p className="text-sm text-destructive">{error}</p>}
  </div>
);

// ============================================================================
// FILE PREVIEW
// ============================================================================

const FilePreview: React.FC<{
  files: File[] | File | null;
  onRemove: (index?: number) => void;
  isImage?: boolean;
}> = ({ files, onRemove, isImage }) => {
  const fileArray = Array.isArray(files) ? files : files ? [files] : [];
  if (fileArray.length === 0) return null;

  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      {fileArray.map((file, index) => (
        <div
          key={index}
          className="relative group rounded-lg border border-neutral-200 overflow-hidden"
        >
          {isImage && file.type.startsWith('image/') ? (
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              className="w-full h-24 object-cover"
            />
          ) : (
            <div className="w-full h-24 flex items-center justify-center bg-neutral-50 p-2">
              <p className="text-xs text-neutral-600 truncate">{file.name}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(Array.isArray(files) ? index : undefined)}
            className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// FIELD RENDERER
// ============================================================================

const renderField = <T,>(field: FieldSchema<T>, form: any, isSubmitting: boolean) => {
  const fieldName = String(field.name);
  const error = form.formState.errors[fieldName]?.message as string | undefined;
  const wrapperClass = field.width === 'half' ? 'flex-1' : 'w-full';

  switch (field.type) {
    case 'text':
    case 'email':
    case 'password':
      return (
        <FieldWrapper
          label={field.label}
          required={field.required}
          description={field.description}
          error={error}
          className={wrapperClass}
        >
          <Input
            type={field.type}
            placeholder={field.placeholder}
            disabled={isSubmitting}
            {...form.register(fieldName)}
          />
        </FieldWrapper>
      );

    case 'textarea':
      return (
        <FieldWrapper
          label={field.label}
          required={field.required}
          description={field.description}
          error={error}
          className={wrapperClass}
        >
          <textarea
            placeholder={field.placeholder}
            disabled={isSubmitting}
            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            {...form.register(fieldName)}
          />
        </FieldWrapper>
      );

    case 'number': {
      const numberField = field as NumberFieldSchema<T>;
      return (
        <FieldWrapper
          label={field.label}
          required={field.required}
          description={field.description}
          error={error}
          className={wrapperClass}
        >
          <Controller
            control={form.control}
            name={fieldName}
            render={({ field: f }) => (
              <Input
                type="number"
                placeholder={field.placeholder}
                disabled={isSubmitting}
                min={numberField.min}
                max={numberField.max}
                step={numberField.step}
                value={f.value ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    f.onChange(field.required ? undefined : null);
                  } else {
                    const num = Number(val);
                    f.onChange(isNaN(num) ? undefined : num);
                  }
                }}
                onBlur={f.onBlur}
                name={f.name}
                ref={f.ref}
              />
            )}
          />
        </FieldWrapper>
      );
    }

    case 'select': {
      const selectField = field as SelectFieldSchema<T>;
      return (
        <FieldWrapper
          label={field.label}
          required={field.required}
          description={field.description}
          error={error}
          className={wrapperClass}
        >
          <Controller
            control={form.control}
            name={fieldName}
            render={({ field: f }) => (
              <Select onValueChange={f.onChange} defaultValue={f.value} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder={field.placeholder || 'Select an option'} />
                </SelectTrigger>
                <SelectContent>
                  {selectField.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FieldWrapper>
      );
    }

    case 'date':
      return (
        <FieldWrapper
          label={field.label}
          required={field.required}
          description={field.description}
          error={error}
          className={wrapperClass}
        >
          <Controller
            control={form.control}
            name={fieldName}
            render={({ field: f }) => (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      disabled={isSubmitting}
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !f.value && 'text-muted-foreground',
                      )}
                    >
                      {f.value ? (
                        format(f.value, 'PPP')
                      ) : (
                        <span>{field.placeholder || 'Pick a date'}</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={f.value}
                    onSelect={f.onChange}
                    disabled={isSubmitting}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
        </FieldWrapper>
      );

    case 'image':
    case 'file': {
      const fileField = field as FileFieldSchema<T>;
      return (
        <FieldWrapper
          label={field.label}
          required={field.required}
          description={field.description}
          error={error}
          className={wrapperClass}
        >
          <Controller
            control={form.control}
            name={fieldName}
            render={({ field: f }) => (
              <div>
                <label
                  htmlFor={fieldName}
                  className={cn(
                    'flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-card transition-colors',
                    isSubmitting && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 mb-2 text-neutral-400" />
                    <p className="text-sm text-neutral-600">
                      {field.placeholder || 'Click to upload'}
                    </p>
                    {fileField.maxSize && (
                      <p className="text-xs text-neutral-400 mt-1">
                        Max size: {fileField.maxSize}MB
                      </p>
                    )}
                  </div>
                  <input
                    id={fieldName}
                    type="file"
                    accept={fileField.accept}
                    multiple={fileField.multiple}
                    disabled={isSubmitting}
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (fileField.maxSize) {
                        const invalid = files.filter(
                          (file) => file.size > fileField.maxSize! * 1024 * 1024,
                        );
                        if (invalid.length > 0) {
                          toast.error(`File size exceeds ${fileField.maxSize}MB limit`);
                          return;
                        }
                      }
                      f.onChange(fileField.multiple ? files : files[0] || null);
                    }}
                  />
                </label>
                <FilePreview
                  files={f.value}
                  onRemove={(index) => {
                    if (fileField.multiple && Array.isArray(f.value)) {
                      f.onChange(f.value.filter((_: any, i: number) => i !== index));
                    } else {
                      f.onChange(null);
                    }
                  }}
                  isImage={field.type === 'image'}
                />
              </div>
            )}
          />
        </FieldWrapper>
      );
    }

    case 'custom': {
      const customField = field as CustomFieldSchema<T>;
      const CustomComponent = customField.component;
      return (
        <FieldWrapper
          label={field.label}
          required={field.required}
          description={field.description}
          error={error}
          className={wrapperClass}
        >
          <Controller
            control={form.control}
            name={fieldName}
            render={({ field: f, fieldState }) => (
              <CustomComponent
                value={f.value}
                onChange={f.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        </FieldWrapper>
      );
    }

    default:
      return null;
  }
};

// ============================================================================
// HELPERS
// ============================================================================

const resolveMessage = <T,>(
  msg: string | ((val: T) => string) | undefined,
  val: T,
  fallback: string,
) => (typeof msg === 'function' ? msg(val) : (msg ?? fallback));

const extractErrorMessage = (error: unknown): string => {
  if (!error) return 'An unexpected error occurred';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const e = error as any;
    return e.message ?? e.error?.message ?? e.data?.message ?? 'An unexpected error occurred';
  }
  return 'An unexpected error occurred';
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const UniversalDialog = <TData = any, TVariables = Partial<TData>, TError = Error>({
  open,
  onOpenChange,
  title,
  description,
  fields,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  mutationFn,
  onSuccess,
  onError,
  transformData,
  toasts,
  closeOnError = true,
  children,
}: UniversalDialogProps<TData, TVariables, TError>) => {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const effectiveOpen = isControlled ? open : internalOpen;

  const toastConfig: ToastConfig | false = toasts === false ? false : { enabled: true, ...toasts };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const closeDialog = () => {
    form.reset();
    handleOpenChange(false);
  };

  const [zodSchema] = useState(() => generateZodSchema<TData>(fields));

  const form = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: fields.reduce(
      (acc, field) => {
        const fieldName = String(field.name);
        if (field.defaultValue !== undefined) {
          acc[fieldName] = field.defaultValue;
        } else {
          switch (field.type) {
            case 'text':
            case 'email':
            case 'password':
            case 'textarea':
            case 'select':
              acc[fieldName] = '';
              break;
            case 'number':
            case 'date':
              acc[fieldName] = undefined;
              break;
            case 'image':
            case 'file':
              acc[fieldName] = (field as FileFieldSchema<TData>).multiple ? [] : null;
              break;
            default:
              acc[fieldName] = '';
          }
        }
        return acc;
      },
      {} as Record<string, any>,
    ),
  });

  const mutation = useMutation<TData, TError, TVariables>({
    mutationFn,

    onSuccess: (data, variables) => {
      if (toastConfig !== false && toastConfig.enabled !== false) {
        toast.success(
          resolveMessage(toastConfig.successMessage, data, 'Operation completed successfully!'),
        );
      }
      closeDialog();
      onSuccess?.(data, variables);
    },

    onError: (error, variables) => {
      if (toastConfig !== false && toastConfig.enabled !== false) {
        toast.error(resolveMessage(toastConfig.errorMessage, error, extractErrorMessage(error)));
      }
      if (!closeOnError) closeDialog();
      onError?.(error, variables);
    },
  });

  const handleSubmit = (data: any) => {
    mutation.reset();
    const payload = transformData ? transformData(data as Partial<TData>) : (data as TVariables);
    mutation.mutate(payload);
  };

  const groupedFields = useMemo(() => {
    const rows: FieldSchema<TData>[][] = [];
    let currentRow: FieldSchema<TData>[] = [];

    fields.forEach((field) => {
      if (field.width === 'full') {
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
        }
        rows.push([field]);
      } else {
        currentRow.push(field);
        if (currentRow.length === 2) {
          rows.push(currentRow);
          currentRow = [];
        }
      }
    });

    if (currentRow.length > 0) rows.push(currentRow);
    return rows;
  }, [fields]);

  const isSubmitting = mutation.isPending;
  const mutationError =
    mutation.isError && closeOnError ? extractErrorMessage(mutation.error) : null;

  return (
    <Dialog open={effectiveOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={children} />
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-2">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="p-4">
            <DialogHeader className="pb-4">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>

            {mutationError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{mutationError}</AlertDescription>
              </Alert>
            )}

            {groupedFields.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-4 mb-4">
                {row.map((field) => (
                  <React.Fragment key={String(field.name)}>
                    {renderField<TData>(field, form, isSubmitting)}
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>

          <DialogFooter className="flex flex-row w-full p-5 m-0">
            <Button
              type="button"
              className="flex-1"
              variant="outline"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
