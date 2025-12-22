"use client";

import { AgGridReact } from "ag-grid-react";
import { useMemo, useState } from "react";

import { AllCommunityModule, ColDef, ModuleRegistry, RowSelectionOptions } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community"; // Import the missing module
import { useIsMobile } from "@/hooks/use-mobile";
import { useTableTheme } from "@/hooks/use-tableTheme";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// Register the required modules
ModuleRegistry.registerModules([AllCommunityModule, ClientSideRowModelModule]);

export default function RecordTable(props: { editable?: boolean }) {
  const [parts, setParts] = useState([]);
  const tableTheme = useTableTheme();
  const isMobile = useIsMobile();

  const row = {
    partCode: "",
    description: "",
    quantity: 0,
    rate: 0,
    amount: 0,
  };

  const rowSelection = useMemo<RowSelectionOptions>(() => {
    return {
      mode: "multiRow",
    };
  }, []);

  // Column Definitions: Defines the columns to be displayed.
  const colDefs = useMemo<ColDef[]>(
    () => [
      {
        flex: isMobile ? 0 : 1,
        field: "code",
        headerName: "Code",
        sortable: true,
        filter: false,
        // if props.editable is not defined then it will be editable
        editable: props?.editable !== undefined ? props.editable : true,
      },

      {
        flex: isMobile ? 0 : 3,
        field: "description",
        sortable: true,
        filter: false,
        editable: props?.editable,
      },
      // amount column
      {
        flex: isMobile ? 0 : 1,
        filter: false,
        field: "total",
        valueGetter: (params: { data: { rate: number; quantity: number } }) => {
          if (params.data?.rate && params.data?.quantity) {
            return `${((params.data.rate / 1000) * params.data.quantity).toFixed(3)} BD`;
          }
          return "0.000 BD";
        },
        valueSetter: (params: { data: { rate: number; quantity: number; amount: number }; newValue: number }) => {
          if (params.data) {
            params.data.amount = Number((params.data.rate / 1000) * params.data.quantity);
            return true;
          }
          return false;
        },
      },
    ],
    [props.editable]
  );

  return (
    <div className={cn(isMobile ? "" : "flex flex-col flex-1")}>
      <div className="grid grid-cols-5 bg-card p-3 border ">
        <div>
          <Button>
            <Plus />
            Add new Record
          </Button>
        </div>
        <div></div>
        <div className="font-semibold text-right">Total Amount:</div>
        <div className="text-right font-medium"> BD</div>
      </div>
      <AgGridReact theme={tableTheme} rowData={parts} columnDefs={colDefs} />
      <div className="p-2">Hello world</div>
    </div>
  );
}
