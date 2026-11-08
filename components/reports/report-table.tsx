"use client";

import {
  AllCommunityModule,
  type ColDef,
  type GetRowIdParams,
  type GridApi,
  ModuleRegistry,
  type RowClassParams,
  type RowClickedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import type { RefObject } from "react";
import { useTableTheme } from "@/hooks/use-table-theme";
import { cn } from "@/lib/utils";

ModuleRegistry.registerModules([AllCommunityModule]);

const DEFAULT_COL_DEF: ColDef = {
  resizable: true,
  sortable: true,
  filter: true,
};

interface ReportTableProps {
  rowData: unknown[];
  columnDefs: ColDef[];
  gridApiRef?: RefObject<GridApi | null>;
  getRowId?: (params: GetRowIdParams) => string;
  onRowClicked?: (event: RowClickedEvent) => void;
  getRowClass?: (params: RowClassParams) => string;
  className?: string;
}

/**
 * AG Grid wrapper with the same density, behaviour and height on every report.
 */
export function ReportTable({
  rowData,
  columnDefs,
  gridApiRef,
  getRowId,
  onRowClicked,
  getRowClass,
  className,
}: ReportTableProps) {
  const theme = useTableTheme();

  return (
    <div className={cn("h-[min(65vh,600px)] w-full", className)}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={DEFAULT_COL_DEF}
        theme={theme}
        rowHeight={44}
        headerHeight={40}
        animateRows
        domLayout="normal"
        suppressScrollOnNewData
        enableCellTextSelection
        ensureDomOrder
        getRowId={getRowId}
        getRowClass={getRowClass}
        onRowClicked={onRowClicked}
        onGridReady={(params) => {
          if (gridApiRef) gridApiRef.current = params.api;
        }}
      />
    </div>
  );
}
