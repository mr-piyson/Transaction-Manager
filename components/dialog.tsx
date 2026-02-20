import React, { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type FieldType =
  | "text"
  | "number"
  | "email"
  | "password"
  | "select"
  | "date"
  | "image"
  | "file"
  | "textarea"
  | "custom";

export type FieldWidth = "full" | "half";

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
  type: "text" | "email" | "password" | "textarea";
  minLength?: number;
  maxLength?: number;
}

export interface NumberFieldSchema<T = any> extends BaseFieldSchema<T> {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectFieldSchema<T = any> extends BaseFieldSchema<T> {
  type: "select";
  options: SelectOption[];
}

export interface DateFieldSchema<T = any> extends BaseFieldSchema<T> {
  type: "date";
  minDate?: Date;
  maxDate?: Date;
}

export interface FileFieldSchema<T = any> extends BaseFieldSchema<T> {
  type: "image" | "file";
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
}

export interface CustomFieldSchema<T = any> extends BaseFieldSchema<T> {
  type: "custom";
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

export interface UniversalDialogProps<T = any> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldSchema<T>[];
  submitLabel?: string;
  cancelLabel?: string;
  /** Called with validated form data. Run your tRPC mutation here and return a promise. */
  onSubmit: (data: Partial<T>) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  transformData?: (data: Partial<T>) => any;
  children?: React.ReactNode;
}

// ============================================================================
// ZOD SCHEMA GENERATOR
// ============================================================================

const generateZodSchema = <T,>(fields: FieldSchema<T>[]) => {
  const schemaObject: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;
    const fieldName = String(field.name);

    switch (field.type) {
      case "text":
      case "email":
      case "password":
      case "textarea": {
        const textField = field as TextFieldSchema;
        fieldSchema = z.string();
        if (field.required)
          fieldSchema = (fieldSchema as z.ZodString).min(
            1,
            `${field.label} is required`,
          );
        if (field.type === "email")
          fieldSchema = (fieldSchema as z.ZodString).email(
            "Invalid email address",
          );
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
        if (!field.required)
          fieldSchema = fieldSchema.optional().or(z.literal(""));
        break;
      }

      case "number": {
        const numberField = field as NumberFieldSchema;
        fieldSchema = z.preprocess(
          (val) => {
            if (val === "" || val === undefined || val === null)
              return field.required ? undefined : null;
            const num = Number(val);
            return isNaN(num) ? val : num;
          },
          (() => {
            let numSchema = z.number().refine((val) => !isNaN(val), {
              message: `${field.label} must be a number`,
            });
            if (numberField.min !== undefined)
              numSchema = numSchema.min(
                numberField.min,
                `Min: ${numberField.min}`,
              );
            if (numberField.max !== undefined)
              numSchema = numSchema.max(
                numberField.max,
                `Max: ${numberField.max}`,
              );
            return field.required ? numSchema : numSchema.optional().nullable();
          })(),
        );
        break;
      }

      case "select":
        fieldSchema = field.required
          ? z.string().min(1, `${field.label} is required`)
          : z.string().optional().or(z.literal(""));
        break;

      case "date":
        fieldSchema = field.required
          ? z
              .date()
              .refine((val) => val instanceof Date && !isNaN(val.getTime()), {
                message: `${field.label} is required`,
              })
          : z.date().optional().nullable();
        break;

      case "image":
      case "file": {
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

      case "custom":
        fieldSchema = field.required ? z.any() : z.any().optional();
        break;

      default:
        fieldSchema = z.any();
    }

    schemaObject[fieldName] = fieldSchema;
  });

  return z.object(schemaObject);
};

// ============================================================================
// FIELD WRAPPER — replaces shadcn FormItem / FormLabel / FormMessage
// ============================================================================

const FieldWrapper: React.FC<{
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ label, required, description, error, className, children }) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    <label className="text-sm font-medium leading-none">
      {label}
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
    {children}
    {description && (
      <p className="text-sm text-muted-foreground">{description}</p>
    )}
    {error && <p className="text-sm text-destructive">{error}</p>}
  </div>
);

// ============================================================================
// FILE PREVIEW COMPONENT
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
          {isImage && file.type.startsWith("image/") ? (
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

const renderField = <T,>(
  field: FieldSchema<T>,
  form: any,
  isSubmitting: boolean,
) => {
  const fieldName = String(field.name);
  const error = form.formState.errors[fieldName]?.message as string | undefined;
  const wrapperClass = field.width === "half" ? "flex-1" : "w-full";

  switch (field.type) {
    case "text":
    case "email":
    case "password":
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

    case "textarea":
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

    case "number": {
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
                value={f.value ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
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

    case "select": {
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
              <Select
                onValueChange={f.onChange}
                defaultValue={f.value}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={field.placeholder || "Select an option"}
                  />
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

    case "date":
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
                        "w-full pl-3 text-left font-normal",
                        !f.value && "text-muted-foreground",
                      )}
                    >
                      {f.value ? (
                        format(f.value, "PPP")
                      ) : (
                        <span>{field.placeholder || "Pick a date"}</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  }
                ></PopoverTrigger>
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

    case "image":
    case "file": {
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
                    "flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors",
                    isSubmitting && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 mb-2 text-neutral-400" />
                    <p className="text-sm text-neutral-600">
                      {field.placeholder || "Click to upload"}
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
                          (file) =>
                            file.size > fileField.maxSize! * 1024 * 1024,
                        );
                        if (invalid.length > 0) {
                          toast.error(
                            `File size exceeds ${fileField.maxSize}MB limit`,
                          );
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
                      f.onChange(
                        f.value.filter((_: any, i: number) => i !== index),
                      );
                    } else {
                      f.onChange(null);
                    }
                  }}
                  isImage={field.type === "image"}
                />
              </div>
            )}
          />
        </FieldWrapper>
      );
    }

    case "custom": {
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
// MAIN COMPONENT
// ============================================================================

export const UniversalDialog = <T,>({
  open,
  onOpenChange,
  title,
  description,
  fields,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  onSubmit,
  onSuccess,
  onError,
  transformData,
  children,
}: UniversalDialogProps<T>) => {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const effectiveOpen = isControlled ? open : internalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const closeDialog = () => {
    form.reset();
    handleOpenChange(false);
  };

  const [zodSchema] = useState(() => generateZodSchema<T>(fields));

  const form = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: fields.reduce(
      (acc, field) => {
        const fieldName = String(field.name);
        if (field.defaultValue !== undefined) {
          acc[fieldName] = field.defaultValue;
        } else {
          switch (field.type) {
            case "text":
            case "email":
            case "password":
            case "textarea":
            case "select":
              acc[fieldName] = "";
              break;
            case "number":
            case "date":
              acc[fieldName] = undefined;
              break;
            case "image":
            case "file":
              acc[fieldName] = (field as FileFieldSchema<T>).multiple
                ? []
                : null;
              break;
            default:
              acc[fieldName] = "";
          }
        }
        return acc;
      },
      {} as Record<string, any>,
    ),
  });

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const payload = transformData ? transformData(data) : data;
      await onSubmit(payload);
      toast.success("Operation completed successfully!");
      closeDialog();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.message || "An error occurred");
      onError?.(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedFields = useMemo(() => {
    const rows: FieldSchema<T>[][] = [];
    let currentRow: FieldSchema<T>[] = [];

    fields.forEach((field) => {
      if (field.width === "full") {
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

  const trigger =
    !isControlled && children ? (
      <DialogTrigger render={<>{children}</>}></DialogTrigger>
    ) : !isControlled ? (
      <DialogTrigger render={<Button>{title}</Button>}></DialogTrigger>
    ) : null;

  return (
    <Dialog open={effectiveOpen} onOpenChange={handleOpenChange}>
      {trigger}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {groupedFields.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-4">
              {row.map((field) => (
                <React.Fragment key={String(field.name)}>
                  {renderField<T>(field, form, isSubmitting)}
                </React.Fragment>
              ))}
            </div>
          ))}
          <DialogFooter className="flex flex-row w-full pt-4">
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
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
