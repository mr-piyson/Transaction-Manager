"use client";

import { useState } from "react";
import { Plus, UserPlus, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { UniversalDialog } from "@/components/dialog";
import { Invoice } from "@prisma/client";
import { queryClient } from "../layout";

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
}

export function CreateInvoiceDialog(props: {
  onSuccess?: (invoice: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null,
  );
  const [description, setDescription] = useState("");
  const [comboOpen, setComboOpen] = useState(false);

  // Fetch customers for the dropdown
  const { data: customers = [], refetch: refetchCustomers } = useQuery<
    Customer[]
  >({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await axios.get("/api/customers");
      return res.data;
    },
  });

  const handleCreateInvoice = async () => {
    if (!selectedCustomerId) return toast.error("Please select a customer");

    setLoading(true);
    try {
      const res = await axios.post<Invoice>("/api/invoices", {
        customerId: selectedCustomerId,
        description,
        date: new Date(),
      });

      toast.success("Invoice created successfully");
      queryClient.refetchQueries({ queryKey: ["invoices"] });
      setOpen(false);
      props.onSuccess?.({ invoice: res.data });
      resetForm();
    } catch (error) {
      toast.error("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomerId(null);
    setDescription("");
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2">
            <Plus className="size-4" /> New Invoice
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
                    <Button
                      variant="outline"
                      role="combobox"
                      className="flex-1 justify-between"
                    >
                      {selectedCustomer
                        ? selectedCustomer.name
                        : "Select customer..."}
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
                                "mr-2 h-4 w-4",
                                selectedCustomerId === customer.id
                                  ? "opacity-100"
                                  : "opacity-0",
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
              <UniversalDialog<Customer>
                title="Create new Customer"
                fields={[
                  { name: "name", label: "Name", required: true, type: "text" },
                  {
                    name: "phone",
                    label: "Phone",
                    required: true,
                    type: "text",
                  },
                  {
                    name: "address",
                    label: "Address",
                    required: true,
                    type: "text",
                  },
                ]}
                mutationFn={async (payload) =>
                  (await axios.post("/api/customers", payload)).data
                }
                onSuccess={(newCustomer) => {
                  refetchCustomers();
                  // Automatically select the newly created customer
                  if (newCustomer?.id) {
                    setSelectedCustomerId(newCustomer.id);
                  }
                }}
              >
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  title="Add New Customer"
                >
                  <UserPlus className="size-4" />
                </Button>
              </UniversalDialog>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Notes for this invoice..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateInvoice}
            disabled={loading || !selectedCustomerId}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
