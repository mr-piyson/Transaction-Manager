'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { type ColDef, type CellValueChangedEvent, type ICellRendererParams, type GridApi, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Trash2, MoreHorizontal, ChevronDown, ChevronRight, FolderOpen, Package, Copy, MoveRight } from 'lucide-react';
import { InvoiceRow, InvoiceLine, InvoiceGroup } from '@/types/invoice';

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface InvoiceGridProps {
  items: InvoiceRow[];
  onUpdateLine: (lineId: string, updates: Partial<InvoiceLine>, groupId?: string) => void;
  onRemoveLine: (lineId: string, groupId?: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onToggleGroupExpanded: (groupId: string) => void;
  groups: InvoiceGroup[];
}

// Flatten items for grid display
interface FlatRow {
  id: string;
  type: 'line' | 'group' | 'group-line';
  groupId?: string;
  groupName?: string;
  expanded?: boolean;
  lineCount?: number;
  itemName?: string;
  sku?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  tax?: number;
  total?: number;
  subtotal?: number;
}

function flattenItems(items: InvoiceRow[]): FlatRow[] {
  const rows: FlatRow[] = [];

  items.forEach((item) => {
    if (item.type === 'line') {
      rows.push({
        id: item.id,
        type: 'line',
        itemName: item.itemName,
        sku: item.sku,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        tax: item.tax,
        total: item.total,
      });
    } else if (item.type === 'group') {
      rows.push({
        id: item.id,
        type: 'group',
        groupName: item.name,
        expanded: item.expanded,
        lineCount: item.lines.length,
        subtotal: item.subtotal,
      });

      if (item.expanded) {
        item.lines.forEach((line) => {
          rows.push({
            id: line.id,
            type: 'group-line',
            groupId: item.id,
            itemName: line.itemName,
            sku: line.sku,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount,
            tax: line.tax,
            total: line.total,
          });
        });
      }
    }
  });

  return rows;
}

// Custom Cell Renderers
function TypeCellRenderer(props: ICellRendererParams<FlatRow>) {
  const { data, context } = props;
  if (!data) return null;

  if (data.type === 'group') {
    return (
      <div className="flex items-center gap-2 cursor-pointer h-full" onClick={() => context.onToggleGroupExpanded(data.id)}>
        {data.expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <FolderOpen className="h-4 w-4 text-primary" />
        <span className="font-medium">{data.groupName}</span>
        <Badge variant="secondary" className="ml-1 text-xs">
          {data.lineCount} items
        </Badge>
      </div>
    );
  }

  if (data.type === 'group-line') {
    return (
      <div className="flex items-center gap-2 pl-8 h-full">
        <Package className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm">{data.itemName}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 h-full">
      <Package className="h-4 w-4 text-primary" />
      <span>{data.itemName}</span>
    </div>
  );
}

function CurrencyCellRenderer(props: ICellRendererParams<FlatRow>) {
  const value = props.value;
  if (value === undefined || value === null) return null;

  return (
    <span className="font-mono">
      {new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value)}
    </span>
  );
}

function PercentCellRenderer(props: ICellRendererParams<FlatRow>) {
  const value = props.value;
  if (value === undefined || value === null) return null;
  return <span className="font-mono">{value}%</span>;
}

function ActionsCellRenderer(props: ICellRendererParams<FlatRow>) {
  const { data, context } = props;
  if (!data) return null;

  if (data.type === 'group') {
    return (
      <div className="flex items-center gap-1 h-full justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          ></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => context.onToggleGroupExpanded(data.id)}>{data.expanded ? 'Collapse Group' : 'Expand Group'}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => context.onRemoveGroup(data.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  const groupId = data.type === 'group-line' ? data.groupId : undefined;

  return (
    <div className="flex items-center gap-1 h-full justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          }
        ></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          {context.groups.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {groupId ? (
                <DropdownMenuItem onClick={() => context.onMoveToGroup(data.id, groupId, undefined)}>
                  <MoveRight className="h-4 w-4 mr-2" />
                  Move out of group
                </DropdownMenuItem>
              ) : (
                context.groups.map((group: InvoiceGroup) => (
                  <DropdownMenuItem key={group.id} onClick={() => context.onMoveToGroup(data.id, undefined, group.id)}>
                    <MoveRight className="h-4 w-4 mr-2" />
                    Move to {group.name}
                  </DropdownMenuItem>
                ))
              )}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => context.onRemoveLine(data.id, groupId)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function InvoiceGrid({ items, onUpdateLine, onRemoveLine, onRemoveGroup, onToggleGroupExpanded, groups }: InvoiceGridProps) {
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  const rowData = useMemo(() => flattenItems(items), [items]);

  const columnDefs = useMemo<ColDef<FlatRow>[]>(
    () => [
      {
        field: 'itemName',
        headerName: 'Item',
        flex: 2,
        minWidth: 200,
        cellRenderer: TypeCellRenderer,
        editable: false,
      },
      {
        field: 'sku',
        headerName: 'SKU',
        width: 100,
        editable: false,
        cellClass: 'text-muted-foreground text-sm',
        valueFormatter: (params) => {
          if (params.data?.type === 'group') return '';
          return params.value || '';
        },
      },
      {
        field: 'quantity',
        headerName: 'Qty',
        width: 80,
        editable: (params) => params.data?.type !== 'group',
        type: 'numericColumn',
        cellClass: 'font-mono',
        valueFormatter: (params) => {
          if (params.data?.type === 'group') return '';
          return params.value?.toString() || '';
        },
      },
      {
        field: 'unitPrice',
        headerName: 'Unit Price',
        width: 110,
        editable: (params) => params.data?.type !== 'group',
        type: 'numericColumn',
        cellRenderer: CurrencyCellRenderer,
        valueFormatter: (params) => {
          if (params.data?.type === 'group') return '';
          return params.value;
        },
      },
      {
        field: 'discount',
        headerName: 'Discount',
        width: 90,
        editable: (params) => params.data?.type !== 'group',
        type: 'numericColumn',
        cellRenderer: PercentCellRenderer,
        valueFormatter: (params) => {
          if (params.data?.type === 'group') return '';
          return params.value;
        },
      },
      {
        field: 'tax',
        headerName: 'Tax',
        width: 80,
        editable: (params) => params.data?.type !== 'group',
        type: 'numericColumn',
        cellRenderer: PercentCellRenderer,
        valueFormatter: (params) => {
          if (params.data?.type === 'group') return '';
          return params.value;
        },
      },
      {
        field: 'total',
        headerName: 'Total',
        width: 120,
        editable: false,
        type: 'numericColumn',
        cellRenderer: CurrencyCellRenderer,
        cellClass: 'font-semibold',
        valueGetter: (params) => {
          if (params.data?.type === 'group') return params.data.subtotal;
          return params.data?.total;
        },
      },
      {
        field: 'actions',
        headerName: '',
        width: 60,
        editable: false,
        sortable: false,
        filter: false,
        cellRenderer: ActionsCellRenderer,
        cellClass: 'flex items-center justify-end',
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: false,
      filter: false,
    }),
    [],
  );

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<FlatRow>) => {
      const { data, colDef, newValue } = event;
      if (!data || !colDef.field) return;

      const field = colDef.field as keyof InvoiceLine;
      const groupId = data.type === 'group-line' ? data.groupId : undefined;

      onUpdateLine(data.id, { [field]: newValue }, groupId);
    },
    [onUpdateLine],
  );

  const onGridReady = useCallback((params: { api: GridApi }) => {
    setGridApi(params.api);
  }, []);

  const getRowClass = useCallback((params: { data?: FlatRow }) => {
    if (params.data?.type === 'group') {
      return 'bg-muted/50 font-medium';
    }
    if (params.data?.type === 'group-line') {
      return 'bg-muted/20';
    }
    return '';
  }, []);

  const getRowId = useCallback((params: { data: FlatRow }) => params.data.id, []);

  const context = useMemo(
    () => ({
      onRemoveLine,
      onRemoveGroup,
      onToggleGroupExpanded,
      groups,
      onMoveToGroup: (lineId: string, fromGroupId: string | undefined, toGroupId: string | undefined) => {
        // This would need to be passed from parent
      },
    }),
    [onRemoveLine, onRemoveGroup, onToggleGroupExpanded, groups],
  );

  if (rowData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] border rounded-lg bg-muted/20">
        <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No items added yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Click {'"Add Item"'} to get started</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] border rounded-lg overflow-hidden">
      <AgGridReact ref={gridRef} rowData={rowData} columnDefs={columnDefs} defaultColDef={defaultColDef} onCellValueChanged={onCellValueChanged} onGridReady={onGridReady} getRowClass={getRowClass} getRowId={getRowId} context={context} rowHeight={48} headerHeight={44} animateRows={true} suppressRowClickSelection={true} />
    </div>
  );
}
