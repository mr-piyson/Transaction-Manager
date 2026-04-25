'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Plus, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client'; // Adjust path to your trpc client

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateCustomerDialog } from '../customers/customer-form-dialog';
import { SelectionDialog } from '@/components/select-dialog-v2';
import { SelectDialog } from '@/components/select-dialog';
import { Customer_List_Item } from '../customers/customer-item-list';
import { Customer } from '@prisma/client';

// Schema matching your jobs.ts jobInputSchema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).default('NOT_STARTED'),
  customerId: z.string().min(1, 'Please select a customer'),
});

export function CreateJobDialog() {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  // 1. Fetch Customers for the dropdown
  const { data: customers, isLoading: loadingCustomers } = trpc.customers.getCustomers.useQuery();

  // 2. Create Job Mutation
  const createJob = trpc.jobs.createJob.useMutation({
    onSuccess: () => {
      utils.jobs.getJobs.invalidate();
      setOpen(false);
      form.reset();
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      title: '',
      description: '',
      status: 'NOT_STARTED',
      customerId: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createJob.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="secondary" className={'w-full'}>
            <Plus className="mr-2 h-4 w-4" /> New Job
          </Button>
        }
      ></DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Kitchen Remodel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SelectDialog<Customer>
              onSelect={function (item: Customer): void {
                form.setValue('customerId', item.id);
              }}
              data={customers || []}
              searchFields={['name', 'phone', 'address']}
              cardRenderer={function ({ data }) {
                return <Customer_List_Item data={data} />;
              }}
              rowHeight={72}
            />
            <DialogFooter>
              <Button type="submit" disabled={createJob.isPending}>
                {createJob.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Job
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
