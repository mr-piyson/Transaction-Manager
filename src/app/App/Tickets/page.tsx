"use client";

import { AgGridReact } from "ag-grid-react";
import { useMemo, useState } from "react";

import {
  AllCommunityModule,
  ClientSideRowModelModule,
  ColDef,
  ModuleRegistry,
  NumberFilterModule,
  RowSelectedEvent,
  RowSelectionOptions,
  ValidationModule,
} from "ag-grid-community";
import { useTableTheme } from "@/hooks/use-TableTheme";
import { Badge } from "@/components/ui/badge";
import { Edit, Ticket as IconTicket, Trash } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Account, Ticket } from "@prisma/client";
import useSWR from "swr";
import { TicketDialog } from "./Ticket-Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Register the required modules
ModuleRegistry.registerModules([
  AllCommunityModule,
  ClientSideRowModelModule,
  NumberFilterModule,
  ValidationModule /* Development Only */,
]);

export default function AccountTable() {
  const tableTheme = useTableTheme();

  const isMobile = useIsMobile();

  const [rowData, setRowData] = useState<Ticket[]>([]);

  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(
    undefined
  );

  function onRowSelected(event: RowSelectedEvent<any, any>) {
    const selectedRows = event.api.getSelectedRows() as Account[];
    if (selectedRows.length > 0) {
      setSelectedAccount(selectedRows[0]);
    } else {
      setSelectedAccount(undefined);
    }
  }

  const { data, error, mutate, isLoading } = useSWR("/api/Tickets", {
    fetcher: (url: string) => fetch(url).then((res) => res.json()),
  });

  useMemo(() => {
    if (data) {
      setRowData(data);
    }
  }, [data]);

  const colDefs: ColDef[] = [
    {
      field: "ticketNo",
      sortable: true,
      lockPosition: true,
      flex: isMobile ? 0 : 1,
      filter: true,
    },
    {
      field: "description",
      sortable: true,
      lockPosition: true,
      flex: isMobile ? 0 : 1,
      filter: true,
      editable: true,
    },
    {
      field: "ipAddress",
      sortable: true,
      lockPosition: true,
      flex: isMobile ? 0 : 1,
      filter: true,
    },
    {
      field: "status",
      sortable: true,
      lockPosition: true,
      flex: isMobile ? 0 : 1,
      filter: true,
      editable: true,
      cellRenderer: (params: { value: string }) => {
        return (
          <div className="flex w-full h-full items-center justify-center gap-2 flex-wrap max-sm:overflow-y-scroll max-sm:overflow-x-hidden ">
            <Badge
              key={params.value}
              variant={(() => {
                switch (params.value) {
                  case "Open":
                    return "default";
                  case "In Progress":
                    return "secondary";
                  case "Completed":
                    return "success";
                  case "Pending":
                    return "warning";
                  default:
                    return "outline";
                }
              })()}
            >
              {params.value}
            </Badge>
          </div>
        );
      },
      cellEditor: (props: any) => {
        // Custom select editor for status
        const statusOptions = ["Open", "In Progress", "Completed", "Pending"];
        return (
          <Select
            value={props.value}
            onValueChange={(value) => {
              setRowData((prevData) =>
                prevData.map((row) =>
                  row.ticketNo === props.data.ticketNo
                    ? { ...row, status: value }
                    : row
                )
              );
            }}
            open={props.editing}
            onOpenChange={(open) => {
              if (!open) props.stopEditing();
            }}
          >
            <SelectTrigger className="w-full h-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
      cellEditorPopup: true,
    },
  ];

  const rowSelection = useMemo<
    RowSelectionOptions | "single" | "multiple"
  >(() => {
    return {
      mode: "singleRow",
    };
  }, []);

  return (
    <div className=" flex flex-col w-full h-full">
      {/* Table Header */}
      <Card className="flex flex-row p-0 m-0 rounded-none">
        <CardContent className="w-full p-3 space-x-3">
          {/* Add Button */}
          <TicketDialog>
            <Button
              variant="default"
              className="border-2"
              aria-label="Add New Account"
            >
              <IconTicket />
              <span className="max-sm:hidden me-2">New Ticket</span>
            </Button>
          </TicketDialog>
          {/* Edit Button */}
          {selectedAccount && (
            <Button
              variant={"ghost"}
              className=" bg-transparent hover:bg-background  border-2 "
            >
              <Edit />
              <span className="max-sm:hidden me-2 ">Edit</span>
            </Button>
          )}
          {/* Delete Button */}
          {selectedAccount && (
            <Button
              variant={"destructive"}
              className=" bg-transparent hover:bg-background  border-2 "
            >
              <Trash />
              <span className="max-sm:hidden me-2 ">Delete</span>
            </Button>
          )}
        </CardContent>
      </Card>
      <AgGridReact
        theme={tableTheme}
        className=" h-full w-full "
        rowData={rowData}
        columnDefs={colDefs}
        // this will make the grid responsive
        rowHeight={60}
        // This will prevent the column from removed when dragged out
        suppressDragLeaveHidesColumns
        // this will allow us to select multiple rows
        rowSelection={rowSelection}
        onRowSelected={onRowSelected}
      />
    </div>
  );
}
