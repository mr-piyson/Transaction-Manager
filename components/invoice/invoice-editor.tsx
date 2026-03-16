'use client';

import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Save,
  Send,
  Download,
  FolderPlus,
  Package,
  ChevronDown,
  LayoutList,
} from 'lucide-react';
import { InvoiceHeader } from './invoice-header';
import { InvoiceGrid } from './invoice-grid';
import { InvoiceSummary } from './invoice-summary';
import { InventorySelector } from './inventory-selector';
import { AddGroupDialog } from './add-group-dialog';
import { useInvoiceStore } from '@/hooks/use-invoice-store';
import { invoiceApi } from '@/lib/api';
import { InventoryItem, InvoiceGroup } from '@/types/invoice';
import { toast } from 'sonner';

export function InvoiceEditor() {
  const [showInventorySelector, setShowInventorySelector] = useState(false);
  const [showAddGroupDialog, setShowAddGroupDialog] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);

  const {
    invoice,
    updateInvoice,
    addLine,
    addGroup,
    updateLine,
    removeLine,
    removeGroup,
    toggleGroupExpanded,
  } = useInvoiceStore();

  const groups = useMemo(() => {
    return invoice.items.filter((item): item is InvoiceGroup => item.type === 'group');
  }, [invoice.items]);

  const saveMutation = useMutation({
    mutationFn: () => invoiceApi.save(invoice),
    onSuccess: () => {
      toast.success('Invoice saved successfully');
    },
    onError: () => {
      toast.error('Failed to save invoice');
    },
  });

  const handleAddItem = (groupId?: string) => {
    setSelectedGroupId(groupId);
    setShowInventorySelector(true);
  };

  const handleSelectInventoryItem = (item: InventoryItem) => {
    addLine(item, selectedGroupId);
    toast.success(`Added ${item.name} to invoice`);
  };

  const handleAddGroup = (name: string) => {
    addGroup(name);
    toast.success(`Created group "${name}"`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                <LayoutList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Invoice Editor</h1>
                <p className="text-sm text-muted-foreground">{invoice.invoiceNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Draft
              </Button>
              <Button size="sm">
                <Send className="h-4 w-4 mr-2" />
                Send Invoice
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Invoice Header */}
          <InvoiceHeader invoice={invoice} onUpdate={updateInvoice} />

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Invoice Items
              </h2>

              <div className="flex items-center gap-2">
                {groups.length > 0 && (
                  <Select
                    value={selectedGroupId || 'none'}
                    onValueChange={(value) => setSelectedGroupId(value === 'none' ? undefined : value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Add to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Group</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAddItem(selectedGroupId)}>
                      <Package className="h-4 w-4 mr-2" />
                      Add Item
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowAddGroupDialog(true)}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Add Group
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* AG Grid */}
            <InvoiceGrid
              items={invoice.items}
              onUpdateLine={updateLine}
              onRemoveLine={removeLine}
              onRemoveGroup={removeGroup}
              onToggleGroupExpanded={toggleGroupExpanded}
              groups={groups}
            />
          </div>

          <Separator />

          {/* Summary Section */}
          <InvoiceSummary invoice={invoice} onUpdate={updateInvoice} />
        </div>
      </main>

      {/* Dialogs */}
      <InventorySelector
        open={showInventorySelector}
        onOpenChange={setShowInventorySelector}
        onSelect={handleSelectInventoryItem}
      />

      <AddGroupDialog
        open={showAddGroupDialog}
        onOpenChange={setShowAddGroupDialog}
        onAdd={handleAddGroup}
      />
    </div>
  );
}
