'use client';

import { useState } from 'react';
import { Plus, UserPlus, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { trpc } from '@/lib/trpc/client';

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
}

export function CreateInvoiceDialog(props: { onSuccess?: (invoice: any) => void }) {
  const [open, setOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const utils = trpc.useUtils();
  const invoiceMutation = trpc.invoices.createInvoice.useMutation();

  // Fetch customers for the dropdown
  const { data: customers = [], refetch: refetchCustomers } =
    trpc.customers.getCustomers.useQuery();

  const handleCreateInvoice = async () => {
    if (!selectedCustomerId) return toast.error('Please select a customer');

    invoiceMutation.mutate(
      {
        customerId: selectedCustomerId,
      },
      {
        onSuccess: () => {
          utils.invoices.getInvoices.invalidate();
          resetForm();
          setOpen(false);
        },
        onError: () => {
          toast.error('Failed to create invoice');
        },
      },
    );
  };

  const resetForm = () => {
    setSelectedCustomerId(null);
    setDescription('');
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2">
            <Plus className="size-4" /> New
          </Button>
        }
      ></DialogTrigger>

      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Customer Selection Logic */}
          <div className="grid gap-2">
            <Label>Customer</Label>
            <div className="flex gap-2">
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger
                  render={
                    <Button variant="outline" role="combobox" className="flex-1 justify-between">
                      {selectedCustomer ? selectedCustomer.name : 'Select customer...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  }
                ></PopoverTrigger>
                <PopoverContent className="w-75 p-0">
                  <Command>
                    <CommandInput placeholder="Search customers..." />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            className="mb-1"
                            onSelect={() => {
                              setComboOpen(false);
                              setSelectedCustomerId(customer.id);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedCustomerId === customer.id ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{customer.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {customer.phone}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Your existing UniversalDialog for New Customer */}
              <Button variant="outline" size="icon" type="button" title="Add New Customer">
                <UserPlus className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateInvoice}
            disabled={invoiceMutation.isPending || !selectedCustomerId}
          >
            {invoiceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
