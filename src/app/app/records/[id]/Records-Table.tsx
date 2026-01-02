"use client";

import { AgGridReact } from "ag-grid-react";
import { useMemo, useState } from "react";

import { AllCommunityModule, ColDef, ModuleRegistry, RowSelectionOptions } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community"; // Import the missing module
import { useIsMobile } from "@/hooks/use-mobile";
import { useTableTheme } from "@/hooks/use-tableTheme";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

// Register the required modules
ModuleRegistry.registerModules([AllCommunityModule, ClientSideRowModelModule]);

export default function RecordTable(props: { editable?: boolean }) {
  const [invoices, setInvoices] = useState([]);
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

  if (invoices.length === 0) {
    return (
      <Empty >
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <svg className="icon-[hugeicons--add-invoice]" />
          </EmptyMedia>
          <EmptyTitle>No Invoices</EmptyTitle>
          <EmptyDescription>You haven&apos;t created any invoices yet. Get started by creating your first invoice.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Button>Create Invoice</Button>
            <Button variant="outline">Import Invoice</Button>
          </div>
        </EmptyContent>
        <Button variant="link" asChild className="text-muted-foreground" size="sm">
          <a href="#">
            Learn More <svg className="icon-[solar--link-bold-duotone]" />
          </a>
        </Button>
      </Empty>
    );
  }

  return (
    <div className="flex-1">
      <div className="flex gap-2 p-2">
        <Button>Add</Button>
        <Button variant={"secondary"} disabled>
          Edit
        </Button>
        <Button variant={"destructive"} disabled>
          Delete
        </Button>
      </div>
      <AgGridReact className="h-full" theme={tableTheme} rowData={invoices} columnDefs={colDefs} />
    </div>
  );
}
