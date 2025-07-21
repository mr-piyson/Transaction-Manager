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
import { Edit, Plus, Trash, User2 } from "lucide-react";
import { AvatarImage } from "@radix-ui/react-avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { AddAccount, DeleteAccount } from "./Account-Dialog";
import { Account } from "@prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

  const [rowData, setRowData] = useState<Account[]>([]);

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

  const { data, error, mutate, isLoading } = useSWR("/api/accounts", {
    fetcher: (url: string) => fetch(url).then((res) => res.json()),
  });

  useMemo(() => {
    if (data) {
      setRowData(data);
    }
  }, [data]);

  const colDefs: ColDef[] = [
    {
      field: "image",
      headerName: "",
      width: 80,
      resizable: false,
      cellClass: "w-full h-full",
      filter: false,
      sortable: true,
      lockPosition: true,
      cellRenderer: (params: { value: string; data: Account }) => {
        return (
          <div className="flex items-center justify-center w-full h-full">
            <Avatar className="size-10">
              <AvatarImage
                className="size-10 shrink-0 rounded-full object-cover"
                src={params.value}
                alt="Image"
              />
              <AvatarFallback>{params.data.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        );
      },
    },
    {
      field: "name",
      sortable: true,
      lockPosition: true,
      flex: isMobile ? 0 : 1,
      filter: true,
    },
    {
      field: "email",
      sortable: true,
      lockPosition: true,
      flex: isMobile ? 0 : 1,
      filter: true,
    },
    {
      field: "role",
      sortable: true,
      lockPosition: true,
      flex: isMobile ? 0 : 1,
      filter: true,
      cellRenderer: (params: { value: string }) => {
        return (
          <div className="flex w-full h-full items-center justify-center gap-2 flex-wrap max-sm:overflow-y-scroll max-sm:overflow-x-hidden ">
            <Badge
              key={params.value}
              variant={params.value === "Admin" ? "destructive" : "default"}
            >
              <User2 className="mr-2 h-4 w-4 " />
              {params.value}
            </Badge>
          </div>
        );
      },
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
          <AddAccount mutate={mutate}>
            <Button
              variant="ghost"
              className="border-2"
              aria-label="Add New Account"
            >
              <Plus />
              <span className="max-sm:hidden me-2">New</span>
            </Button>
          </AddAccount>
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
            <DeleteAccount mutate={mutate} selectedAccount={selectedAccount} />
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
