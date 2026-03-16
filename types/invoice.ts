export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  unitPrice: number;
  unit: string;
  category: string;
  inStock: number;
}

export interface InvoiceLine {
  id: string;
  type: 'line';
  itemId: string;
  itemName: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
  groupId?: string;
}

export interface InvoiceGroup {
  id: string;
  type: 'group';
  name: string;
  description: string;
  lines: InvoiceLine[];
  subtotal: number;
  expanded?: boolean;
}

export type InvoiceRow = InvoiceLine | InvoiceGroup;

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    address: string;
  };
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue';
  items: InvoiceRow[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  notes: string;
}
