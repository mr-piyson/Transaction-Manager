'use client';

import { JSX, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  Search,
  Hash,
  Banknote,
  FileText,
  PackagePlus,
  Check,
  Loader2,
  Box,
  Wrench,
} from 'lucide-react';
import * as z from 'zod';

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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { trpc } from '@/lib/trpc/client';
import { CreateItemDialog } from '../../items/create-item-dialog';

// Schema aligned with Prisma InvoiceLine model
const invoiceLineSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unitSalePrice: z.coerce.number().min(0, 'Price cannot be negative'),
  itemId: z.string().optional(),
});

type InvoiceLineValues = z.infer<typeof invoiceLineSchema>;

interface CreateInvoiceLineDialogProps {
  onSuccess: (line: InvoiceLineValues & { lineTotal: number }) => void;
  children?: JSX.Element;
}

export function CreateInvoiceLineDialog({ onSuccess, children }: CreateInvoiceLineDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data Fetching for "Import from existing"
  const { data: items, isLoading: isLoadingItems } = trpc.items.getItems.useQuery();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InvoiceLineValues>({
    defaultValues: {
      description: '',
      quantity: 1,
      unitSalePrice: 0,
    },
  });

  const watchQuantity = watch('quantity');
  const watchPrice = watch('unitSalePrice');
  const lineTotal = useMemo(() => watchQuantity * watchPrice, [watchQuantity, watchPrice]);

  // Filter items for the search dropdown
  const filteredItems = useMemo(() => {
    if (!searchQuery) return [];
    return items
      ?.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .slice(0, 5);
  }, [items, searchQuery]);

  const handleSelectItem = (item: any) => {
    setValue('description', item.name);
    // Convert back from smallest unit (fils) for the UI input if needed,
    // assuming item.salesPrice is stored as BigInt/Integer
    setValue('unitSalePrice', Number(item.salesPrice) / 1000);
    setValue('itemId', item.id);
    setSearchQuery('');
  };

  const onSubmit = (values: InvoiceLineValues) => {
    onSuccess({
      ...values,
      lineTotal,
    });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          children ?? (
            <Button variant="outline" className="gap-2 border-dashed">
              <Plus className="size-4" />
              Add Line Item
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <FileText className="size-5" />
            Add Invoice Line
          </DialogTitle>
          <DialogDescription>
            Search existing master items or enter details manually.
          </DialogDescription>
        </DialogHeader>

        {/* Search / Import Section */}
        <div className="space-y-2 relative">
          <FieldLabel>Quick Import from Items</FieldLabel>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Button variant="outline" className="w-full justify-start text-left font-normal ">
                <Search className="mr-2 size-4 text-muted-foreground shrink-0" />
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="font-medium truncate">Select an item</span>
                </div>
              </Button>

              {filteredItems && filteredItems.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-1">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-sm flex justify-between items-center"
                    >
                      <span>
                        {item.name}{' '}
                        <span className="text-muted-foreground text-xs">({item.sku})</span>
                      </span>
                      <span className="font-mono text-xs">
                        {(Number(item.salesPrice) / 1000).toFixed(3)} BD
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Create Item if not exists */}
            <CreateItemDialog onSuccess={handleSelectItem}>
              <Button type="button" variant="secondary" size="icon" title="Create New Master Item">
                <PackagePlus className="size-4" />
              </Button>
            </CreateItemDialog>
          </div>
        </div>

        <hr className="my-2" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Description */}
          <Field data-invalid={!!errors.description}>
            <FieldLabel>Description</FieldLabel>
            <Input {...register('description')} placeholder="e.g. Labor charges or Product name" />
            <FieldError>{errors.description?.message}</FieldError>
          </Field>

          <FieldGroup className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <Field data-invalid={!!errors.quantity}>
              <FieldLabel>Quantity</FieldLabel>
              <InputGroup>
                <InputGroupInput type="number" step="1" {...register('quantity')} />
                <InputGroupAddon>
                  <Hash className="size-4" />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.quantity?.message}</FieldError>
            </Field>

            {/* Price */}
            <Field data-invalid={!!errors.unitSalePrice}>
              <FieldLabel>Unit Price</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  type="number"
                  step="0.001"
                  {...register('unitSalePrice')}
                  placeholder="0.000"
                />
                <InputGroupAddon>BHD</InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.unitSalePrice?.message}</FieldError>
            </Field>
          </FieldGroup>

          {/* Line Summary */}
          <div className="bg-muted/50 p-3 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium">Total for this line:</span>
            <span className="text-lg font-bold text-primary">
              {lineTotal.toFixed(3)} <small className="text-[10px]">BD</small>
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Check className="size-4" />
              Add to Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SelectionDialog, SelectionDialogProps } from '@/components/select-dialog-v2'; // Assuming the original file name
import { Badge } from '@/components/ui/badge';
import { Item } from '@prisma/client';

// Extending your existing T to include ItemType specifically for this context
interface ItemWithCategory extends Record<string, any> {
  type: 'PRODUCT' | 'SERVICE';
}

export function ItemSelectionDialog<T extends ItemWithCategory>({
  data = [],
  onSelect,
  ...props
}: Omit<SelectionDialogProps<T>, 'cardRenderer'>) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL');

  // Filter data based on active tab before passing to the base SelectionDialog
  const tabFilteredData = useMemo(() => {
    if (activeTab === 'ALL') return data;
    return data.filter((item) => item.type === activeTab);
  }, [data, activeTab]);

  return (
    <SelectionDialog
      {...props}
      data={tabFilteredData}
      onSelect={onSelect}
      itemName={activeTab === 'ALL' ? 'items' : activeTab.toLowerCase() + 's'}
      title="Select Item"
      description="Choose an existing product or service to add to your line."
      cardRenderer={(item, selected) => (
        <div className="p-4 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="mt-1 p-2 bg-muted rounded-md">
              {item.type === 'PRODUCT' ? (
                <Box className="size-4 text-blue-500" />
              ) : (
                <Wrench className="size-4 text-orange-500" />
              )}
            </div>
            <div>
              <div className="font-bold flex items-center gap-2">
                {item.name}
                <Badge variant="outline" className="text-[10px] uppercase font-bold">
                  {item.sku}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono font-bold text-primary">
              {(Number(item.salesPrice) / 1000).toFixed(3)} <small>BD</small>
            </div>
            {item.type === 'PRODUCT' && (
              <p className="text-[10px] text-muted-foreground uppercase">
                Stock: {item.stockQuantity?.toString() ?? '0'}
              </p>
            )}
          </div>
        </div>
      )}
    >
      {/* Injecting the Tabs UI into the SelectionDialog top area 
        Note: You may need to add a 'children' or 'headerActions' prop 
        to select-dialog-v2.tsx to render this cleanly above the search bar.
      */}
      <div className="px-4 pt-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ALL" className="gap-2">
              All
            </TabsTrigger>
            <TabsTrigger value="PRODUCT" className="gap-2">
              <Box className="size-3.5" /> Products
            </TabsTrigger>
            <TabsTrigger value="SERVICE" className="gap-2">
              <Wrench className="size-3.5" /> Services
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </SelectionDialog>
  );
}
