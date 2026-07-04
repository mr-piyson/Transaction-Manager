'use client';

import { useMemo, useState, useCallback } from 'react';
import { Download, ImageIcon, Trash2, Sparkles } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { Button } from '@/components/ui/button';
import type { ParsedItem } from './types';
import { useTableTheme } from '@/hooks/use-table-theme';
import { generateSampleData } from './sample-data';

ModuleRegistry.registerModules([AllCommunityModule]);

interface PreviewStepProps {
  items: ParsedItem[];
  onItemsChange: (items: ParsedItem[]) => void;
  onClear: () => void;
  onImport: () => void;
  isImporting: boolean;
}

function ImageCellRenderer(params: ICellRendererParams<ParsedItem>) {
  if (!params.data?.image) {
    return (
      <div className="flex items-center justify-center size-10 rounded border bg-muted">
        <ImageIcon className="size-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="size-10 rounded border overflow-hidden">
      <img src={params.data.image} alt="" className="size-full object-cover" />
    </div>
  );
}

function PriceCellRenderer(params: ICellRendererParams<ParsedItem>) {
  const val = params.value;
  if (val == null || val === 0) return <span className="text-muted-foreground">—</span>;
  return <span>{Number(val).toFixed(3)}</span>;
}

function BadgeCellRenderer(params: ICellRendererParams<ParsedItem>) {
  const val = params.value as string;
  if (!val) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
      {val}
    </span>
  );
}

export function PreviewStep({ items, onItemsChange, onClear, onImport, isImporting }: PreviewStepProps) {
  const tableTheme = useTableTheme();
  const [tab, setTab] = useState<'grid' | 'cards'>('grid');
  const itemsWithImages = items.filter((i) => i.hasImage).length;

  const handleLoadSample = useCallback(() => {
    onItemsChange(generateSampleData());
  }, [onItemsChange]);

  const handleGenerateImages = useCallback(() => {
    const updated = items.map((item, i) => {
      const hue = (i * 30) % 360;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
        <rect width="120" height="120" fill="hsl(${hue}, 60%, 85%)" rx="8"/>
        <text x="60" y="60" text-anchor="middle" dominant-baseline="central"
              font-family="monospace" font-size="10" fill="hsl(${hue}, 40%, 30%)">
          ${item.sku}
        </text>
      </svg>`;
      return {
        ...item,
        image: `data:image/svg+xml;base64,${btoa(svg)}`,
        hasImage: true,
      };
    });
    onItemsChange(updated);
  }, [items, onItemsChange]);

  const colDefs = useMemo<ColDef<ParsedItem>[]>(() => [
    {
      headerName: '',
      field: 'image',
      width: 60,
      cellRenderer: ImageCellRenderer,
      sortable: false,
      filter: false,
    },
    { headerName: 'SKU', field: 'sku', width: 130, pinned: 'left' as const },
    { headerName: 'Name', field: 'name', width: 200, flex: 1 },
    { headerName: 'Description', field: 'description', width: 200 },
    { headerName: 'Sales Price', field: 'salesPrice', width: 110, cellRenderer: PriceCellRenderer },
    { headerName: 'Purchase Price', field: 'purchasePrice', width: 120, cellRenderer: PriceCellRenderer },
    { headerName: 'Unit', field: 'unit', width: 80, cellRenderer: BadgeCellRenderer },
    { headerName: 'Category', field: 'categoryName', width: 120 },
    { headerName: 'Min Stock', field: 'minStock', width: 90 },
    { headerName: 'Reorder', field: 'reorderPoint', width: 90 },
    { headerName: 'Reorder Qty', field: 'reorderQty', width: 100 },
    { headerName: 'Barcode', field: 'barcode', width: 130 },
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-medium">
            Preview ({items.length} item{items.length !== 1 ? 's' : ''})
          </h3>
          <p className="text-sm text-muted-foreground">
            {itemsWithImages} with images &middot; {items.length - itemsWithImages} without images
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleLoadSample}>
            <Sparkles className="size-3.5 mr-1" />
            Load Sample
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerateImages}>
            <ImageIcon className="size-3.5 mr-1" />
            Sample Images
          </Button>
          <Button variant="outline" size="sm" onClick={onClear}>
            <Trash2 className="size-3.5 mr-1" />
            Clear
          </Button>
          <Button size="sm" onClick={onImport} disabled={isImporting || items.length === 0}>
            <Download className="size-3.5 mr-1" />
            {isImporting ? 'Importing...' : 'Import All Items'}
          </Button>
        </div>
      </div>

      <div className="h-[500px] border rounded-md">
        <AgGridReact
          rowData={items}
          columnDefs={colDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
            cellClass: 'text-sm',
            suppressMovable: true,
            minWidth: 60,
          }}
          theme={tableTheme}
          animateRows
          headerHeight={36}
          rowHeight={44}
          suppressCellFocus
          pagination
          paginationPageSize={100}
        />
      </div>
    </div>
  );
}
