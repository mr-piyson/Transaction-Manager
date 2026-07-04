'use client';

import { useCallback, useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { COLUMN_ALIASES } from './types';
import type { ParsedItem } from './types';

const TEMPLATE_COLUMNS = [
  'SKU', 'Name', 'Description', 'Sales Price', 'Purchase Price',
  'Unit', 'Category', 'Min Stock', 'Reorder Point', 'Reorder Qty', 'Barcode',
] as const;

const TEMPLATE_ROW = [
  'RAW-AL-001', 'Aluminum Sheet 2mm', '2mm thick aluminum sheet, 4x8 ft',
  '45.000', '28.500', 'sheet', 'Raw Materials', '20', '50', '100', '4901234567890',
];

function downloadCsvTemplate() {
  const csvContent = [
    TEMPLATE_COLUMNS.join(','),
    TEMPLATE_ROW.join(','),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'item-import-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface FileUploadStepProps {
  onParsed: (items: ParsedItem[]) => void;
  onClear: () => void;
  parsedItems: ParsedItem[];
}

export function FileUploadStep({ onParsed, onClear, parsedItems }: FileUploadStepProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (file: File) => {
    setError(null);

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Unsupported file format. Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setError('The workbook appears to be empty.');
        return;
      }

      const sheet = workbook.Sheets[sheetName];
      const jsonData: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (jsonData.length === 0) {
        setError('No data rows found in the file.');
        return;
      }

      const headers = Object.keys(jsonData[0]);
      const columnMap: Record<string, keyof ParsedItem> = {};

      for (const header of headers) {
        const lower = header.toLowerCase().trim();
        const mapped = COLUMN_ALIASES[lower];
        if (mapped) {
          columnMap[header] = mapped;
        }
      }

      const items: ParsedItem[] = [];
      const missingSkuRows: number[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const sku = String(row[Object.keys(columnMap).find((k) => columnMap[k] === 'sku') || ''] || '').trim();

        if (!sku) {
          missingSkuRows.push(i + 2);
          continue;
        }

        const item: ParsedItem = {
          sku,
          name: String(row[Object.keys(columnMap).find((k) => columnMap[k] === 'name') || ''] || '').trim() || sku,
          rowNumber: i + 2,
          hasImage: false,
        };

        for (const [header, field] of Object.entries(columnMap)) {
          if (field === 'sku' || field === 'name' || field === 'hasImage' || field === 'rowNumber') continue;
          const raw = String(row[header] || '').trim();
          if (!raw) continue;

          if (field === 'salesPrice' || field === 'purchasePrice') {
            (item as any)[field] = parseFloat(raw) || 0;
          } else if (field === 'minStock' || field === 'reorderPoint' || field === 'reorderQty') {
            (item as any)[field] = parseInt(raw, 10) || 0;
          } else {
            (item as any)[field] = raw;
          }
        }

        items.push(item);
      }

      if (items.length === 0) {
        setError('No valid items found. Check that your file has a "SKU" column.');
        return;
      }

      onParsed(items);

      if (missingSkuRows.length > 0) {
        setError(`Skipped ${missingSkuRows.length} row(s) with missing SKU (rows: ${missingSkuRows.slice(0, 5).join(', ')}${missingSkuRows.length > 5 ? '...' : ''})`);
      }
    } catch (e) {
      setError('Failed to parse file. Check that it is a valid Excel or CSV file.');
    }
  }, [onParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }, [parseFile]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium">Upload Data File</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload an Excel (.xlsx, .xls) or CSV file with item data
        </p>
        <Button variant="link" size="sm" onClick={downloadCsvTemplate} className="mt-1 text-xs">
          <Download className="size-3 mr-1" />
          Download template CSV
        </Button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Upload className="mx-auto size-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">
          Drop your file here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supports .xlsx, .xls, and .csv files
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {parsedItems.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-green-600" />
            <span className="font-medium">{parsedItems.length} item(s)</span>
            <span className="text-muted-foreground">parsed successfully</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="size-3.5 mr-1" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
