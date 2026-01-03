"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

interface Transaction {
  id?: string;
  type: "expense" | "income";
  amount: number;
  qty: number;
  date: Date;
  description?: string;
}

interface TransactionDialogProps {
  transaction?: Transaction;
  onSuccess?: (data: Transaction) => void;
  children?: React.ReactNode;
}

const initialFormState = {
  amount: "",
  qty: "1",
  description: "",
};

export default function TransactionDialog({ transaction, onSuccess, children }: TransactionDialogProps) {
  const params = useParams();
  const isEditMode = !!transaction;

  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [date, setDate] = useState(new Date());
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Detect mobile viewport
  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const handler = () => setIsMobile(media.matches);
    handler();
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  // Initialize form with transaction data in edit mode
  useEffect(() => {
    if (open && transaction) {
      setType(transaction.type);
      setDate(new Date(transaction.date));
      setFormData({
        amount: transaction.amount.toString(),
        qty: transaction.qty.toString(),
        description: transaction.description || "",
      });
    }
  }, [open, transaction]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setType("expense");
    setDate(new Date());
    setErrors({});
    setError("");
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    }

    if (!formData.qty || parseInt(formData.qty, 10) < 1) {
      newErrors.qty = "Quantity must be at least 1";
    }

    if (!date) {
      newErrors.date = "Date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setError("");

    if (!validateForm()) return;

    const payload = {
      type,
      amount: parseFloat(formData.amount),
      qty: parseInt(formData.qty, 10),
      date: date.toISOString(),
      description: formData.description || undefined,
    };

    setLoading(true);

    try {
      const url = `/api/records/${params.recordId}/invoices/${params.invoiceId}${isEditMode && transaction?.id ? `/${transaction.id}` : ""}`;

      const response = await fetch(url, {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }

      const data = await response.json();

      resetForm();
      setOpen(false);
      onSuccess?.(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children || <Button>{isEditMode ? "Edit Transaction" : "Add Transaction"}</Button>}</DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Transaction" : "New Transaction"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label>Type</Label>
            <Tabs value={type} onValueChange={v => setType(v as "expense" | "income")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger className="data-[state=active]:bg-red-100 data-[state=active]:text-red-900" value="expense">
                  Expense
                </TabsTrigger>
                <TabsTrigger className="data-[state=active]:bg-green-100 data-[state=active]:text-green-900" value="income">
                  Income
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {errors.type && <p className="text-sm text-red-600">{errors.type}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" value={formData.amount} onChange={handleInputChange} className={errors.amount ? "border-red-500" : ""} />
            {errors.amount && <p className="text-sm text-red-600">{errors.amount}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="qty">Quantity</Label>
            <Input id="qty" name="qty" type="number" min="1" value={formData.qty} onChange={handleInputChange} className={errors.qty ? "border-red-500" : ""} />
            {errors.qty && <p className="text-sm text-red-600">{errors.qty}</p>}
          </div>

          <div className="grid gap-2">
            <Label>Date</Label>
            {isMobile ? (
              <Input type="date" value={date.toISOString().split("T")[0]} onChange={e => setDate(new Date(e.target.value))} className={errors.date ? "border-red-500" : ""} />
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={`justify-start text-left font-normal ${errors.date ? "border-red-500" : ""}`}>
                    {date.toDateString()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={d => d && setDate(d)} initialFocus />
                </PopoverContent>
              </Popover>
            )}
            {errors.date && <p className="text-sm text-red-600">{errors.date}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Add notes about this transaction"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Spinner className="size-4" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : isEditMode ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
