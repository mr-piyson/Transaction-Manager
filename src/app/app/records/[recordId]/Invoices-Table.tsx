"use client";

import { AgGridReact } from "ag-grid-react";
import { useMemo } from "react";

import { AllCommunityModule, ColDef, ModuleRegistry, RowSelectionOptions } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community"; // Import the missing module
import { useIsMobile } from "@/hooks/use-mobile";
import { useTableTheme } from "@/hooks/use-tableTheme";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import CreateInvoiceDialog from "./create-invoice-dialog";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import axios from "axios";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { Eye } from "lucide-react";

// Register the required modules
ModuleRegistry.registerModules([AllCommunityModule, ClientSideRowModelModule]);

export default function InvoicesTable(props: { editable?: boolean }) {
  const tableTheme = useTableTheme();
  const isMobile = useIsMobile();
  const { recordId } = useParams();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", recordId],
    queryFn: async () => (await axios.get(`/api/records/${recordId}/invoices`)).data,
  });

  console.log(invoices);

  const rowSelection = useMemo<RowSelectionOptions>(() => {
    return {
      mode: "multiRow",
    };
  }, []);

  // Column Definitions: Defines the columns to be displayed.
  const colDefs = useMemo<ColDef[]>(
    () => [
      {
        width: 64,
        field: "id",
        headerName: "",
        sortable: true,
        filter: false,
        // if props.editable is not defined then it will be editable
        cellRenderer: (data: any) => {
          return (
            <Link href={`/app/records/${recordId}/invoices/${data.value}`}>
              <Button variant={"ghost"}>
                <Eye />
              </Button>
            </Link>
          );
        },
      },
      {
        flex: isMobile ? 0 : 1,
        field: "id",
        headerName: "Code",
        sortable: true,
        filter: false,
        // if props.editable is not defined then it will be editable
        valueFormatter: value => `INV-`,
      },
      {
        flex: isMobile ? 0 : 2,
        field: "title",
        sortable: true,
        filter: false,
        editable: props?.editable,
      },
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

  if (isLoading) {
    <Empty className="w-full">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Spinner />
        </EmptyMedia>
        <EmptyTitle>Loading Invoices ...</EmptyTitle>
        <EmptyDescription>Please wait while we process your request. Do not refresh the page.</EmptyDescription>
      </EmptyHeader>
    </Empty>;
  }

  if (invoices && invoices.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <svg className="icon-[hugeicons--add-invoice]" />
          </EmptyMedia>
          <EmptyTitle>No Invoices</EmptyTitle>
          <EmptyDescription>You haven&apos;t created any invoices yet. Get started by creating your first invoice.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <CreateInvoiceDialog>
              <Button>Create Invoice</Button>
            </CreateInvoiceDialog>
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
    <div className="flex flex-col flex-1">
      <div className="flex gap-2 p-2">
        <Button>Add</Button>
        <Button variant={"secondary"} disabled>
          Edit
        </Button>
        <Button variant={"destructive"} disabled>
          Delete
        </Button>
      </div>
      <AgGridReact suppressMovableColumns className="flex-1" theme={tableTheme} rowData={invoices} columnDefs={colDefs} rowSelection="single" suppressCellFocus />
    </div>
  );
}
