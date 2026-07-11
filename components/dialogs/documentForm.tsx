'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Loader2 } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePickerField } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc/client';

const schema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  fileUrl: z.string().min(1, 'File URL is required'),
  mimeType: z.string().optional(),
  sizeBytes: z.coerce.number().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
});

export type DocumentFormValues = z.infer<typeof schema>;

export interface DocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (id: string) => void;
}

export function DocumentFormDialog({ open, onOpenChange, onSuccess }: DocumentFormDialogProps) {
  const utils = trpc.useUtils();

  const { data: employeesData } = trpc.hr.employees.list.useQuery({ limit: 500 });

  const createMutation = trpc.hr.documents.create.useMutation({
    onSuccess: (res) => {
      utils.hr.documents.list.invalidate();
      toast.success('Document created successfully');
      onOpenChange(false);
      onSuccess?.(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: defaults() as any,
  });

  React.useEffect(() => {
    reset(defaults());
  }, [reset]);

  const onSubmit: React.EventHandler<any> = async (values: any) => {
    await createMutation.mutateAsync(values);
  };

  const isPending = createMutation.isPending;

  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Upload Document
          </DialogTitle>
          <DialogDescription>
            Fill in the details to upload a new document.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field orientation="vertical">
              <Label htmlFor="employeeId">Employee *</Label>
              <Select
                value={watch('employeeId')}
                onValueChange={(v) => setValue('employeeId', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.user?.name ?? e.employeeCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="type">Type *</Label>
              <Input id="type" placeholder="e.g. CONTRACT, ID, CERTIFICATE" {...register('type')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="fileUrl">File URL *</Label>
              <Input id="fileUrl" {...register('fileUrl')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="mimeType">MIME Type</Label>
              <Input id="mimeType" {...register('mimeType')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="sizeBytes">Size (bytes)</Label>
              <Input id="sizeBytes" type="number" {...register('sizeBytes')} />
            </Field>

            <Field orientation="vertical">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <DatePickerField id="expiryDate" {...register('expiryDate')} />
            </Field>

            <Field orientation="vertical" className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" {...register('notes')} />
            </Field>
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {Object.values(errors).map((err, i) => (
                <p key={i}>{err?.message as string}</p>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface OpenOptions {
  onSuccess?: (id: string) => void;
}

interface DocumentFormContextValue {
  openCreate: (options?: OpenOptions) => void;
}

const DocumentFormContext = React.createContext<DocumentFormContextValue | null>(null);

interface DialogState {
  open: boolean;
  onSuccess?: (id: string) => void;
}

export function DocumentFormProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<DialogState>({ open: false });

  const openCreate = React.useCallback((options?: OpenOptions) => {
    setState({ open: true, onSuccess: options?.onSuccess });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return (
    <DocumentFormContext.Provider value={{ openCreate }}>
      {children}
      <DocumentFormDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        onSuccess={state.onSuccess}
      />
    </DocumentFormContext.Provider>
  );
}

export function useDocumentForm(): DocumentFormContextValue {
  const ctx = React.useContext(DocumentFormContext);
  if (!ctx) throw new Error('useDocumentForm must be used inside <DocumentFormProvider>');
  return ctx;
}

function defaults(): DocumentFormValues {
  return {
    employeeId: '',
    name: '',
    type: '',
    fileUrl: '',
    mimeType: undefined,
    sizeBytes: undefined,
    expiryDate: undefined,
    notes: undefined,
  };
}
