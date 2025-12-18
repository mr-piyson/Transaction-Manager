"use client";

import { AgGridReact } from "ag-grid-react";
import { useMemo, useState } from "react";

import { AllCommunityModule, ColDef, ModuleRegistry, RowSelectionOptions } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community"; // Import the missing module
import { useIsMobile } from "@/hooks/use-mobile";
import { useTableTheme } from "@/hooks/use-tableTheme";

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

  function onCellValueChanged(params: any) {
    // check if the cell value is changed and the row is empty and not the last row then remove the row
    if (params.data.quantity === 0 && params.data.rate === 0 && params.data.description === null && params.data.partCode === null) {
      const updatedRowData = [...parts];
      const index = updatedRowData.findIndex(row => row === params.data);
      parts.forEach(part => {
        const updatedAmount = part.rate && part.quantity ? (part.rate / 1000) * part.quantity : 0;
        part.amount = updatedAmount;
      });
      if (index > -1) {
        updatedRowData.splice(index, 1);
        setParts(updatedRowData);
      }
    }

    //  get last element of the row data
    const lastElement = parts[parts.length - 1];
    // check if the last all fields are filled
    if (lastElement.partCode && lastElement.rate && lastElement.description && lastElement.quantity) {
      // add new empty row data
      setParts(prev => [...prev, row]);
    }
  }

  // Column Definitions: Defines the columns to be displayed.
  const colDefs = useMemo<ColDef[]>(
    () => [
      {
        flex: isMobile ? 0 : 1,
        field: "partCode",
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
      // Quantity column
      {
        flex: isMobile ? 0 : 1,
        field: "quantity",
        headerName: "Total",
        editable: props?.editable !== undefined ? props.editable : true,
        sortable: true,
        filter: false,

        valueGetter: (params: { data: { quantity: number } }) => {
          return params.data?.quantity ? params.data.quantity : undefined;
        },
        valueSetter: (params: { data: { quantity: number }; newValue: number }) => {
          if (params.data) {
            params.data.quantity = Number(params.newValue);
            return true;
          }
          return false;
        },
      },
      // Rate column
      {
        flex: isMobile ? 0 : 1,
        field: "Statues",
        sortable: true,
        filter: false,
        editable: props?.editable !== undefined ? props.editable : true,
        valueGetter: (params: { data: { rate: number } }) => {
          return params.data?.rate ? params.data.rate / 1000 : undefined;
        },
        valueSetter: (params: { data: { rate: number }; newValue: number }) => {
          if (params.data) {
            params.data.rate = Number((params.newValue * 1000).toFixed(0));
            return true;
          }
          return false;
        },
      },
      // amount column
      {
        flex: isMobile ? 0 : 1,
        filter: false,
        field: "Total",
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
    <div className="flex flex-col flex-1">
      <div className="grid grid-cols-5 bg-card p-3 border ">
        <div className="col-span-3"></div>
        <div className="col-span-3"></div>
        <div className="font-semibold text-right">Total Amount:</div>
        <div className="text-right font-medium"> BD</div>
      </div>
      <AgGridReact theme={tableTheme} rowData={parts} columnDefs={colDefs} onCellValueChanged={onCellValueChanged} />
    </div>
  );
}
