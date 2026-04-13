'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Package,
  Save,
  Plus,
  User,
  Calendar,
  Warehouse as WarehouseIcon,
  Trash2,
  Minus,
} from 'lucide-react';
import { cn, formatAmount } from '@/lib/utils';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { SelectDialog } from '@/components/select-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CustomerCard } from '../../customers/customerCard';

export default function NewInvoicePage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [lines, setLines] = useState<any[]>([]);

  const { data: customers } = trpc.customers.getCustomers.useQuery();
  const { data: warehouses } = trpc.warehouses.getWarehouses.useQuery();
  const { data: items } = trpc.inventory.getInventory.useQuery();

  const createFullInvoice = trpc.invoices.createFullInvoice.useMutation({
    onSuccess: (data) => {
      toast.success('Invoice created successfully');
      utils.invoices.getInvoices.invalidate();
      router.push(`/app/invoices/${data.id}`);
    },
    onError: (error) => {
      toast.error('Failed to create invoice: ' + error.message);
    },
  });

  const handleAddItem = (item: any) => {
    // Check if item already exists in lines
    const existingIndex = lines.findIndex((l) => l.inventoryItemId === item.id);
    if (existingIndex > -1) {
      const newLines = [...lines];
      newLines[existingIndex].quantity += 1;
      newLines[existingIndex].total =
        newLines[existingIndex].quantity * newLines[existingIndex].salesPrice;
      setLines(newLines);
      toast.info(`Increased quantity of ${item.name}`);
      return;
    }

    // Determine prices
    const salesPrice = item.salesPrice || item.basePrice || 0;
    const purchasePrice = item.purchasePrice || item.basePrice || 0;

    setLines([
      ...lines,
      {
        inventoryItemId: item.id,
        itemId: item.ItemId,
        description: item.name,
        quantity: 1,
        salesPrice,
        purchasePrice,
        tax: 0,
        total: salesPrice,
      },
    ]);
    toast.success(`Added ${item.name}`);
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const newLines = [...lines];
    newLines[index].quantity = newQty;
    newLines[index].total = newQty * newLines[index].salesPrice;
    setLines(newLines);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return lines.reduce((acc, line) => acc + (line.total || 0), 0);
  };

  const handleSubmit = () => {
    if (!customerId) return toast.error('Please select a customer');
    if (lines.length === 0) return toast.error('Please add at least one item');

    createFullInvoice.mutate({
      customerId: Number(customerId),
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      date,
      lines: lines.map((l) => ({
        itemId: l.itemId,
        inventoryItemId: l.inventoryItemId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.salesPrice,
        purchasePrice: l.purchasePrice,
        tax: l.tax,
      })),
      isCompleted: false, // Default to draft for now
    });
  };

  const selectedCustomer = customers?.find((c) => c.id === customerId);

  return (
    <div className="flex flex-col min-h-screen bg-muted/20 pb-20">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-between p-4 px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => router.back()}
            >
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">New Invoice</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Create a professional invoice for your customer
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createFullInvoice.isPending}
              className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 px-6"
            >
              {createFullInvoice.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                  Creating...
                </span>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Invoice</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Section: Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Customer & Details */}
          <div className="md:col-span-8 space-y-6">
            <Card className="overflow-hidden border-none shadow-sm outline outline-1 outline-border/50">
              <CardContent className="p-0">
                <div className="p-6 pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <User size={16} className="text-primary" />
                      Customer Information
                    </h2>
                    <SelectDialog<any>
                      onSelect={(c) => setCustomerId(c.id)}
                      data={customers || []}
                      searchFields={['name', 'phone', 'email']}
                      cardRenderer={(c) => <CustomerCard data={c} />}
                      rowHeight={72}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-2 rounded-full border-primary/20 hover:border-primary/50 text-xs"
                      >
                        <Plus size={12} /> {selectedCustomer ? 'Switch' : 'Choose Customer'}
                      </Button>
                    </SelectDialog>
                  </div>
                  <Separator className="opacity-50" />
                </div>

                <div className="p-6">
                  {selectedCustomer ? (
                    <div className="flex items-start gap-5 p-5 rounded-2xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                        <User size={100} />
                      </div>
                      <Avatar className="h-16 w-16 border-4 border-white shadow-md">
                        <AvatarFallback className="bg-primary text-primary-foreground font-black text-xl">
                          {selectedCustomer.name.substring(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1 relative">
                        <h3 className="text-xl font-black text-foreground tracking-tight">
                          {selectedCustomer.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Package size={14} className="text-primary/60" />{' '}
                            {selectedCustomer.phone || 'No contact'}
                          </span>
                          <span className="flex items-center gap-1.5 font-medium border-l pl-4 border-border">
                            Total Invoices:{' '}
                            <Badge variant="secondary" className="h-5 text-[10px]">
                              12
                            </Badge>
                          </span>
                        </div>
                        {selectedCustomer.address && (
                          <p className="text-xs text-muted-foreground mt-2 opacity-80 italic">
                            {selectedCustomer.address}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-muted/10 transition-colors hover:bg-muted/20 group">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                        <User size={32} className="text-muted-foreground/30" />
                      </div>
                      <h4 className="font-bold text-foreground">Select a customer</h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                        Choose an existing customer or create a new one to continue.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section: Items Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Package size={16} className="text-primary" />
                  Line Items
                  {lines.length > 0 && (
                    <Badge
                      variant="default"
                      className="rounded-full bg-primary h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                    >
                      {lines.length}
                    </Badge>
                  )}
                </h2>
                <SelectDialog<any>
                  onSelect={handleAddItem}
                  data={items || []}
                  searchFields={['name', 'code', 'description']}
                  cardRenderer={(i) => (
                    <div className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer">
                      <Avatar className="size-10 rounded-lg shrink-0 border border-border/50 shadow-sm">
                        <AvatarImage src={i.image} alt={i.name} className="object-cover" />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          <Package size={18} />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold truncate text-foreground">{i.name}</p>
                          <p className="text-sm font-black text-primary tabular-nums">
                            {formatAmount(i.salesPrice || i.basePrice || 0)}
                          </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {i.description || 'No description available'}
                        </p>
                      </div>
                    </div>
                  )}
                >
                  <Button
                    size="sm"
                    className="h-9 gap-2 shadow-sm border-primary/20 bg-background text-foreground hover:bg-muted border"
                  >
                    <Plus size={16} className="text-primary" />
                    <span>Add Item or Service</span>
                  </Button>
                </SelectDialog>
              </div>

              {lines.length === 0 ? (
                <div className="border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center bg-muted/5">
                  <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4 animate-pulse">
                    <Plus size={32} className="text-muted-foreground/20" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Your invoice is empty</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 max-w-[220px]">
                    Click 'Add Item' to start building this invoice.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="group relative bg-background border border-border/50 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
                    >
                      <Avatar className="size-12 rounded-xl shrink-0 border border-border/50">
                        <AvatarImage src={line.image} />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          <Package size={24} />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        <h4 className="font-bold text-sm text-foreground truncate">
                          {line.description}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                            UNIT: {formatAmount(line.salesPrice)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/50">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md hover:bg-background"
                          onClick={() => handleUpdateQuantity(idx, line.quantity - 1)}
                        >
                          <Minus size={12} />
                        </Button>
                        <span className="w-8 text-center text-xs font-bold tabular-nums">
                          {line.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md hover:bg-background"
                          onClick={() => handleUpdateQuantity(idx, line.quantity + 1)}
                        >
                          <Plus size={12} />
                        </Button>
                      </div>

                      <div className="text-right sm:min-w-[100px] w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <p className="text-xs text-muted-foreground leading-none mb-1">
                          Line Total
                        </p>
                        <p className="font-black text-lg text-foreground tabular-nums">
                          {formatAmount(line.total)}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="sm:opacity-0 group-hover:opacity-100 h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 transition-opacity"
                        onClick={() => handleRemoveLine(idx)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Settings & Summary */}
          <div className="md:col-span-4 space-y-6">
            <Card className="border-none shadow-sm outline outline-1 outline-border/50 overflow-hidden">
              <div className="bg-primary/5 p-4 border-b border-primary/10">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Calendar size={14} className="text-primary" />
                  Document Settings
                </h3>
              </div>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    Date of Issue
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                      <Calendar size={14} />
                    </div>
                    <input
                      type="date"
                      className="w-full flex h-10 w-full rounded-xl border border-input bg-background/50 pl-10 pr-3 py-2 text-sm ring-offset-background transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 outline-none"
                      value={date.toISOString().split('T')[0]}
                      onChange={(e) => setDate(new Date(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    Storage Warehouse
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                      <WarehouseIcon size={14} />
                    </div>
                    <select
                      className="w-full flex h-10 w-full rounded-xl border border-input bg-background/50 pl-10 pr-3 py-2 text-sm ring-offset-background transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 outline-none appearance-none"
                      onChange={(e) =>
                        setWarehouseId(e.target.value ? Number(e.target.value) : null)
                      }
                      value={warehouseId || ''}
                    >
                      <option value="">Select Location</option>
                      {warehouses?.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/20 overflow-hidden relative">
              <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
                <Package size={200} />
              </div>
              <CardContent className="p-6 space-y-4 relative">
                <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">
                  Order Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center opacity-80">
                    <span className="text-xs font-medium">Subtotal</span>
                    <span className="text-sm font-bold tabular-nums">
                      {formatAmount(calculateTotal())}
                    </span>
                  </div>
                  <div className="flex justify-between items-center opacity-80">
                    <span className="text-xs font-medium">Estimated Tax (0%)</span>
                    <span className="text-sm font-bold tabular-nums">{formatAmount(0)}</span>
                  </div>
                  <Separator className="bg-white/20 my-2" />
                  <div className="flex justify-between items-end pt-2">
                    <span className="text-sm font-black uppercase tracking-tighter">
                      Total Amount
                    </span>
                    <div className="text-right">
                      <p className="text-3xl font-black leading-none tabular-nums tracking-tighter">
                        {formatAmount(calculateTotal())}
                      </p>
                      <p className="text-[10px] opacity-60 font-medium mt-1 uppercase">
                        Inclusive of all taxes
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="bg-black/10 p-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                <span>Draft Preview</span>
                <div className="flex gap-1">
                  <div className="size-1 rounded-full bg-white animate-bounce" />
                  <div className="size-1 rounded-full bg-white animate-bounce [animation-delay:0.2s]" />
                  <div className="size-1 rounded-full bg-white animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
