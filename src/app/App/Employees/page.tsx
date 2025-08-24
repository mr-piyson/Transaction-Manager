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

  const { data, error, mutate, isLoading } = useSWR("/api/Employees", {
    fetcher: (url: string) => fetch(url).then((res) => res.json()),
  });

  useMemo(() => {
    if (data) {
      setRowData(data);
    }
  }, [data]);

  const colDefs: ColDef[] = [
    {
      field: "emp_code",
      headerName: "Code",
      sortable: true,
      filter: true,
      flex: 1,
    },
    {
      field: "name",
      headerName: "Name",
      sortable: true,
      filter: true,
      flex: 4,
    },
    {
      field: "department",
      headerName: "Department",
      sortable: true,
      filter: true,
      flex: 2,
    },
    {
      field: "designation",
      headerName: "Designation",
      sortable: true,
      filter: true,
      flex: 2,
    },
    {
      field: "telephone",
      headerName: "Mobile",
      sortable: true,
      filter: true,
      flex: 1,
    },
    {
      field: "emp_location",
      headerName: "Location",
      sortable: true,
      filter: true,
      flex: 1,
    },
    {
      field: "access",
      headerName: "Status",
      sortable: true,
      filter: true,
      flex: 1,

      // cell renderer to show status as badge using switch case where if the left_date and deleted_at is null then status is active else inactive
      cellRenderer: (params: any) => {
        const leftDate = params.data.left_date;
        const deletedAt = params.data.deleted_at;

        let status = "Active";
        if (leftDate || deletedAt) {
          status = "Inactive";
        }

        return (
          <Badge variant={status === "Active" ? "success" : "destructive"}>
            {status}
          </Badge>
        );
      },
      valueGetter: (params: any) => {
        const leftDate = params.data.left_date;
        const deletedAt = params.data.deleted_at;

        return leftDate || deletedAt ? "Inactive" : "Active";
      },
    },
  ];

  return (
    <div className=" flex flex-col w-full h-full">
      {/* Table Header */}
      <Card className="flex flex-row p-0 m-0 rounded-none">
        <CardContent className="w-full p-3 space-x-3">
          {/* Add Button */}
          <Button
            variant="default"
            className="border-2"
            aria-label="Add New Account"
          >
            <IconTicket />
            <span className="max-sm:hidden me-2">New Ticket</span>
          </Button>
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
        onRowSelected={onRowSelected}
        pagination={true}
      />
    </div>
  );
}
