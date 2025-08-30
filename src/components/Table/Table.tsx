"use client";

import { AgGridReact } from "ag-grid-react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { ColDef, SelectionChangedEvent } from "ag-grid-community";
import { Table, Transaction } from "@prisma/client";
import {
  getTransactions,
  updateDesc,
  updatePrice,
  updateQuantity,
} from "./table.actions";
// import TableHeader from "./TableHeader";
// import TableFooter from "./TableFooter";

export default function TransactionTable({ table }: { table: Table }) {
  const [selected, setSelected] = useState<Transaction[]>([]);
  const [rowData, setRowData] = useState<Transaction[]>([]);
  const [isComplete, setIsComplete] = useState(table.isCompleted);
  const [updatedTransaction, setUpdatedTransaction] =
    useState<Transaction | null>(null);

  const fetchData = useCallback(async () => {
    const result = await getTransactions(table.id);
    setRowData(result.data);
  }, [table.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      flex: 1,
    }),
    []
  );

  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "description",
        filter: "agTextColumnFilter",
        editable: !isComplete,
        onCellValueChanged: async (params) => {
          if (params.oldValue !== params.newValue) {
            await updateDesc(params.data.id, params.newValue);
          }
        },
      },
      {
        field: "amount",
        filter: "agNumberColumnFilter",
        editable: !isComplete,
        cellEditor: "agNumberCellEditor",
        valueGetter: (params: { data: { amount: number } }) => {
          return params.data?.amount ? params.data.amount / 1000 : 0;
        },
        valueSetter: (params: {
          data: { amount: number };
          newValue: number;
        }) => {
          if (params.data) {
            params.data.amount = Number((params.newValue * 1000).toFixed(0));
            return true;
          }
          return false;
        },
        onCellValueChanged: async (params) => {
          if (params.data) {
            const res = await updatePrice(params.data.id, params.data.amount);
            if (res.status !== 200) {
              fetchData();
            }
            setUpdatedTransaction({
              ...params.data,
              amount: params.data.amount,
            });
          }
        },
        cellRenderer: (params: { value: number }) => {
          const amount = Number(params.value);
          if (amount === 0 || amount === null || amount === undefined)
            return "";
          return `${params.value.toFixed(3)} BD`;
        },
      },
      {
        field: "qty",
        filter: "agNumberColumnFilter",
        editable: !isComplete,
        cellEditor: "agNumberCellEditor",
        onCellValueChanged: async (params) => {
          if (params.data) {
            const res = await updateQuantity(params.data.id, params.newValue);
            if (res.status !== 200) {
              fetchData();
            }
            setUpdatedTransaction({ ...params.data, qty: params.newValue });
          }
        },
        cellRenderer: (params: { value: number }) => {
          const qty = Number(params.value);
          if (qty === 0 || qty === null || qty === undefined) return "";
          return params.value;
        },
      },
      {
        field: "total",
        valueGetter: (params: { data: { amount: number; qty: number } }) => {
          if (params.data?.amount && params.data?.qty) {
            return `${((params.data.amount / 1000) * params.data.qty).toFixed(
              3
            )} BD`;
          }
          return "0.000 BD";
        },
      },
    ],
    [isComplete]
  );
  const rowSelection = useMemo(() => {
    return {
      mode: "multiRow",
    };
  }, []);

  const handleSelectedRows = (event: SelectionChangedEvent) => {
    setSelected(event.api.getSelectedRows());
  };

  const gridRef = useRef<AgGridReact>(null);

  const onPrint = useCallback(() => {
    // Print selected transactions
    if (gridRef.current) {
      // const gridApi: GridApi = gridRef.current.api
      // const csv = gridApi.getDataAsCsv()
    }
  }, []);

  return (
    <div className="flex flex-col w-full h-full animate-show-down opacity-0 mb-9">
      <TableHeader
        table={table}
        onClick={fetchData}
        selected={selected}
        onPrint={onPrint}
        setIsComplete={setIsComplete}
      />
      <div className="table-container">
        <AgGridReact
          className="ag-theme-quartz-dark w-full"
          rowData={rowData}
          columnDefs={columnDefs}
          domLayout="autoHeight"
          defaultColDef={defaultColDef}
          overlayNoRowsTemplate="No Transactions Found"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          selection={!isComplete ? rowSelection : undefined}
          onSelectionChanged={handleSelectedRows}
          ref={gridRef}
        />
      </div>
      <TableFooter
        table={table}
        rowData={rowData}
        updatedTransaction={updatedTransaction}
        isComplete={isComplete}
      />
    </div>
  );
}
