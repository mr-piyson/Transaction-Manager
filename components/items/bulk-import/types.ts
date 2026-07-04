export interface ParsedItem {
  sku: string;
  name: string;
  description?: string;
  salesPrice?: number;
  purchasePrice?: number;
  unit?: string;
  minStock?: number;
  reorderPoint?: number;
  reorderQty?: number;
  barcode?: string;
  categoryName?: string;
  taxRateId?: string;
  image?: string;
  rowNumber: number;
  hasImage: boolean;
}

export interface ImportImage {
  file: File;
  dataUrl: string;
  sku: string;
  fileId?: string;
  storagePath?: string;
  uploadState: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export type ImportStep = 'upload-file' | 'upload-images' | 'preview' | 'done';

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ sku: string; error: string }>;
}

export const COLUMN_ALIASES: Record<string, keyof ParsedItem> = {
  sku: 'sku',
  code: 'sku',
  'item code': 'sku',
  name: 'name',
  'item name': 'name',
  'product name': 'name',
  description: 'description',
  desc: 'description',
  'sales price': 'salesPrice',
  'selling price': 'salesPrice',
  price: 'salesPrice',
  'purchase price': 'purchasePrice',
  'cost price': 'purchasePrice',
  cost: 'purchasePrice',
  unit: 'unit',
  uom: 'unit',
  'measurement unit': 'unit',
  category: 'categoryName',
  'category name': 'categoryName',
  'min stock': 'minStock',
  'minimum stock': 'minStock',
  'min stock level': 'minStock',
  'reorder point': 'reorderPoint',
  'reorder at': 'reorderPoint',
  'reorder qty': 'reorderQty',
  'reorder quantity': 'reorderQty',
  barcode: 'barcode',
  upc: 'barcode',
  ean: 'barcode',
};
