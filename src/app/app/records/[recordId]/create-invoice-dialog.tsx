"use client";

import * as React from "react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useParams } from "next/navigation";
import axios from "axios";
import { queryClient } from "@/components/App/App";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";

/**
 * Dialog component for creating an Invoice
 * Matches the Prisma `Invoices` model
 */
export default function CreateInvoiceDialog(props: any) {
  const [open, setOpen] = React.useState(false);
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [date, setDate] = React.useState<Date>(new Date());
  const params = useParams();

  const [form, setForm] = React.useState({
    description: "",
    date: new Date(),
    recordId: params.recordId,
  });

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // Sync date state with form
  React.useEffect(() => {
    updateField("date", date);
  }, [date]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      // Create FormData object for multipart/form-data
      const formData = new FormData();
      formData.append("description", form.description);
      formData.append("date", date.toISOString());
      formData.append("recordId", params.recordId as string);

      const res = await axios.post(`/api/records/${params.recordId}`, formData);

      toast.success("Invoice created", {
        description: "Successfully created an invoice",
      });

      queryClient.refetchQueries({
        queryKey: ["records"],
      });

      queryClient.refetchQueries({
        queryKey: ["invoices", params.recordId],
      });

      // Reset form
      setForm({
        description: "",
        date: new Date(),
        recordId: params.id,
      });
      setDate(new Date());
      setOpen(false);
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to create invoice",
      });
      console.error("Invoice creation error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.children || <Button>Create Invoice</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" placeholder="Invoice description" value={form.description} onChange={e => updateField("description", e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline" id="date" className="w-full justify-start text-left font-normal" type="button">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? date.toLocaleDateString() : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  captionLayout="dropdown"
                  onSelect={selectedDate => {
                    if (selectedDate) {
                      setDate(selectedDate);
                      setShowCalendar(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-center gap-2 pt-4 w-full">
            <DialogClose asChild>
              <Button variant="outline" type="button" className="flex-1">
                Close
              </Button>
            </DialogClose>
            <Button className="flex-1" type="submit">
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
