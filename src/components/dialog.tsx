import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type FieldType = "text" | "number" | "email" | "password" | "select" | "date" | "image" | "file" | "textarea" | "custom";

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
  maxSize?: number; // in MB
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

export type FieldSchema<T = any> = TextFieldSchema<T> | NumberFieldSchema<T> | SelectFieldSchema<T> | DateFieldSchema<T> | FileFieldSchema<T> | CustomFieldSchema<T>;

export interface UniversalDialogProps<T = any> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldSchema<T>[];
  submitLabel?: string;
  cancelLabel?: string;
  apiEndpoint: string;
  apiMethod?: "POST" | "PUT" | "PATCH";
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  transformData?: (data: Partial<T>) => any;
  children?: React.ReactNode;
}

// ============================================================================
// ZOD SCHEMA GENERATOR
// ============================================================================

const generateZodSchema = <T,>(fields: FieldSchema<T>[]) => {
  const schemaObject: Record<string, z.ZodTypeAny> = {};

  fields.forEach(field => {
    let fieldSchema: z.ZodTypeAny;
    const fieldName = String(field.name);

    switch (field.type) {
      case "text":
      case "email":
      case "password":
      case "textarea": {
        const textField = field as TextFieldSchema;
        fieldSchema = z.string();

        // Handle required validation - reject empty strings
        if (field.required) {
          fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} is required`);
        }

        if (field.type === "email") {
          fieldSchema = (fieldSchema as z.ZodString).email("Invalid email address");
        }

        if (textField.minLength) {
          fieldSchema = (fieldSchema as z.ZodString).min(textField.minLength, `Minimum ${textField.minLength} characters required`);
        }

        if (textField.maxLength) {
          fieldSchema = (fieldSchema as z.ZodString).max(textField.maxLength, `Maximum ${textField.maxLength} characters allowed`);
        }

        if (!field.required) {
          fieldSchema = fieldSchema.optional().or(z.literal(""));
        }
        break;
      }

      case "number": {
        const numberField = field as NumberFieldSchema;

        // Create base schema with preprocessing to handle string to number conversion
        let baseSchema = z.preprocess(
          val => {
            if (val === undefined || val === null || val === "") {
              return field.required ? undefined : null;
            }
            const num = Number(val);
            return isNaN(num) ? undefined : num;
          },
          field.required
            ? z.number({
                required_error: `${field.label} is required`,
                invalid_type_error: `${field.label} must be a number`,
              })
            : z.number().optional().nullable(),
        );

        fieldSchema = baseSchema;

        // Apply min/max constraints after preprocessing
        if (numberField.min !== undefined || numberField.max !== undefined) {
          fieldSchema = z.preprocess(
            val => {
              if (val === undefined || val === null || val === "") {
                return field.required ? undefined : null;
              }
              const num = Number(val);
              return isNaN(num) ? undefined : num;
            },
            (() => {
              let numSchema = field.required
                ? z.number({
                    required_error: `${field.label} is required`,
                    invalid_type_error: `${field.label} must be a number`,
                  })
                : z.number().optional().nullable();

              if (numberField.min !== undefined) {
                numSchema = (numSchema as z.ZodNumber).min(numberField.min, `Minimum value is ${numberField.min}`);
              }

              if (numberField.max !== undefined) {
                numSchema = (numSchema as z.ZodNumber).max(numberField.max, `Maximum value is ${numberField.max}`);
              }

              return numSchema;
            })(),
          );
        }
        break;
      }

      case "select":
        if (field.required) {
          fieldSchema = z.string().min(1, `${field.label} is required`);
        } else {
          fieldSchema = z.string().optional().or(z.literal(""));
        }
        break;

      case "date":
        if (field.required) {
          fieldSchema = z.date({
            required_error: `${field.label} is required`,
            invalid_type_error: `${field.label} must be a valid date`,
          });
        } else {
          fieldSchema = z.date().optional().nullable();
        }
        break;

      case "image":
      case "file": {
        const fileField = field as FileFieldSchema;

        if (fileField.multiple) {
          if (field.required) {
            fieldSchema = z.array(z.instanceof(File)).min(1, `At least one ${field.label.toLowerCase()} is required`);
          } else {
            fieldSchema = z.array(z.instanceof(File)).optional();
          }
        } else {
          if (field.required) {
            fieldSchema = z.instanceof(File, { message: `${field.label} is required` });
          } else {
            fieldSchema = z.instanceof(File).optional().nullable();
          }
        }
        break;
      }

      case "custom":
        fieldSchema = z.any();
        if (!field.required) {
          fieldSchema = fieldSchema.optional();
        }
        break;

      default:
        fieldSchema = z.any();
    }

    schemaObject[fieldName] = fieldSchema;
  });

  return z.object(schemaObject);
};

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
        <div key={index} className="relative group rounded-lg border border-neutral-200 overflow-hidden">
          {isImage && file.type.startsWith("image/") ? (
            <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-24 object-cover" />
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

  switch (field.type) {
    case "text":
    case "email":
    case "password":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem className={field.width === "half" ? "flex-1" : "w-full"}>
              <FormLabel>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
              <FormControl>
                <Input type={field.type} placeholder={field.placeholder} disabled={isSubmitting} {...formField} value={formField.value || ""} />
              </FormControl>
              {field.description && <FormDescription>{field.description}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "textarea":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem className={field.width === "half" ? "flex-1" : "w-full"}>
              <FormLabel>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
              <FormControl>
                <textarea
                  placeholder={field.placeholder}
                  disabled={isSubmitting}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...formField}
                  value={formField.value || ""}
                />
              </FormControl>
              {field.description && <FormDescription>{field.description}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "number": {
      const numberField = field as NumberFieldSchema<T>;
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem className={field.width === "half" ? "flex-1" : "w-full"}>
              <FormLabel>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={field.placeholder}
                  disabled={isSubmitting}
                  min={numberField.min}
                  max={numberField.max}
                  step={numberField.step}
                  value={formField.value ?? ""}
                  onChange={e => {
                    const value = e.target.value;
                    if (value === "") {
                      formField.onChange(field.required ? undefined : null);
                    } else {
                      const numValue = Number(value);
                      formField.onChange(isNaN(numValue) ? undefined : numValue);
                    }
                  }}
                  onBlur={formField.onBlur}
                  name={formField.name}
                  ref={formField.ref}
                />
              </FormControl>
              {field.description && <FormDescription>{field.description}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    case "select": {
      const selectField = field as SelectFieldSchema<T>;
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem className={field.width === "half" ? "flex-1" : "w-full"}>
              <FormLabel>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
              <Select onValueChange={formField.onChange} defaultValue={formField.value} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder || "Select an option"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {selectField.options.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.description && <FormDescription>{field.description}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    case "date":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem className={field.width === "half" ? "flex-1" : "w-full"}>
              <FormLabel>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" disabled={isSubmitting} className={cn("w-full pl-3 text-left font-normal", !formField.value && "text-muted-foreground")}>
                      {formField.value ? format(formField.value, "PPP") : <span>{field.placeholder || "Pick a date"}</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formField.value} onSelect={formField.onChange} disabled={isSubmitting} initialFocus />
                </PopoverContent>
              </Popover>
              {field.description && <FormDescription>{field.description}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "image":
    case "file": {
      const fileField = field as FileFieldSchema<T>;
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field: formField }) => (
            <FormItem className={field.width === "half" ? "flex-1" : "w-full"}>
              <FormLabel>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
              <FormControl>
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
                      <p className="text-sm text-neutral-600">{field.placeholder || "Click to upload"}</p>
                      {fileField.maxSize && <p className="text-xs text-neutral-400 mt-1">Max size: {fileField.maxSize}MB</p>}
                    </div>
                    <input
                      id={fieldName}
                      type="file"
                      accept={fileField.accept}
                      multiple={fileField.multiple}
                      disabled={isSubmitting}
                      className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files || []);

                        // Validate file size
                        if (fileField.maxSize) {
                          const invalidFiles = files.filter(file => file.size > fileField.maxSize! * 1024 * 1024);
                          if (invalidFiles.length > 0) {
                            toast.error(`File size exceeds ${fileField.maxSize}MB limit`);
                            return;
                          }
                        }

                        if (fileField.multiple) {
                          formField.onChange(files);
                        } else {
                          formField.onChange(files[0] || null);
                        }
                      }}
                    />
                  </label>
                  <FilePreview
                    files={formField.value}
                    onRemove={index => {
                      if (fileField.multiple && Array.isArray(formField.value)) {
                        const newFiles = formField.value.filter((_: any, i: number) => i !== index);
                        formField.onChange(newFiles);
                      } else {
                        formField.onChange(null);
                      }
                    }}
                    isImage={field.type === "image"}
                  />
                </div>
              </FormControl>
              {field.description && <FormDescription>{field.description}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    case "custom": {
      const customField = field as CustomFieldSchema<T>;
      const CustomComponent = customField.component;
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field: formField, fieldState }) => (
            <FormItem className={field.width === "half" ? "flex-1" : "w-full"}>
              <FormLabel>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </FormLabel>
              <FormControl>
                <CustomComponent value={formField.value} onChange={formField.onChange} error={fieldState.error?.message} />
              </FormControl>
              {field.description && <FormDescription>{field.description}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
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
  apiEndpoint,
  apiMethod = "POST",
  onSuccess,
  onError,
  transformData,
  children,
}: UniversalDialogProps<T>) => {
  const [zodSchema] = useState(() => generateZodSchema<T>(fields));

  const form = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: fields.reduce(
      (acc, field) => {
        const fieldName = String(field.name);
        // Ensure default values are never undefined to prevent controlled/uncontrolled warnings
        if (field.defaultValue !== undefined) {
          acc[fieldName] = field.defaultValue;
        } else {
          // Set appropriate default based on field type
          switch (field.type) {
            case "text":
            case "email":
            case "password":
            case "textarea":
            case "select":
              acc[fieldName] = "";
              break;
            case "number":
              acc[fieldName] = undefined;
              break;
            case "date":
              acc[fieldName] = undefined;
              break;
            case "image":
            case "file":
              acc[fieldName] = (field as FileFieldSchema<T>).multiple ? [] : null;
              break;
            case "custom":
              acc[fieldName] = "";
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

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = transformData ? transformData(data) : data;

      // Check if we need to use FormData (for file uploads)
      const hasFiles = fields.some(field => field.type === "image" || field.type === "file");

      let body: any = formData;
      let headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (hasFiles) {
        const fd = new FormData();
        Object.keys(formData).forEach(key => {
          const value = formData[key];
          if (value instanceof File) {
            fd.append(key, value);
          } else if (Array.isArray(value) && value[0] instanceof File) {
            value.forEach(file => fd.append(key, file));
          } else {
            fd.append(key, JSON.stringify(value));
          }
        });
        body = fd;
        headers = {}; // Let browser set Content-Type with boundary
      } else {
        body = JSON.stringify(formData);
      }

      const response = await fetch(apiEndpoint, {
        method: apiMethod,
        headers,
        body: hasFiles ? body : body,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: data => {
      toast.success("Operation completed successfully!");
      form.reset();
      onOpenChange?.(false);
      onSuccess?.(data);
    },
    onError: (error: any) => {
      toast.error(error.message || "An error occurred");
      onError?.(error);
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  // Group fields by rows based on width
  const groupedFields: FieldSchema<T>[][] = [];
  let currentRow: FieldSchema<T>[] = [];

  fields.forEach(field => {
    if (field.width === "full") {
      if (currentRow.length > 0) {
        groupedFields.push(currentRow);
        currentRow = [];
      }
      groupedFields.push([field]);
    } else {
      currentRow.push(field);
      if (currentRow.length === 2) {
        groupedFields.push(currentRow);
        currentRow = [];
      }
    }
  });

  if (currentRow.length > 0) {
    groupedFields.push(currentRow);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children ?? <Button>{title}</Button>}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {groupedFields.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-4">
                {row.map(field => (
                  <React.Fragment key={String(field.name)}>{renderField<T>(field, form, mutation.isPending)}</React.Fragment>
                ))}
              </div>
            ))}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)} disabled={mutation.isPending}>
                {cancelLabel}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
