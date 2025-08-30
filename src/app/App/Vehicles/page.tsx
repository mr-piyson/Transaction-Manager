"use client";

import { AgGridReact } from "ag-grid-react";
import { useMemo, useState } from "react";

import {
  AllCommunityModule,
  ColDef,
  ModuleRegistry,
  RowSelectionOptions,
} from "ag-grid-community";
import { useTableTheme } from "@/hooks/use-TableTheme";
import { Edit, Plus, Trash, User2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Account } from "@prisma/client";
import useSWR from "swr";
import { Alert_Dialog } from "@/components/Alert_Dialog";
import { AddVehicle } from "./Vehicles-Dialog";

// Register the required modules
ModuleRegistry.registerModules([AllCommunityModule]);

export default function VehiclesTable() {
  const tableTheme = useTableTheme();

  const isMobile = useIsMobile();

  const [rowData, setRowData] = useState<Account[]>([]);

  const { data, error, mutate, isLoading } = useSWR("/api/vehicles", {
    fetcher: (url: string) => fetch(url).then((res) => res.json()),
  });

  useMemo(() => {
    if (data) {
      setRowData(data);
    }
  }, [data]);

  const colDefs: ColDef[] = [
    {
      field: "vehicleNo",
      headerName: "Vehicle No",
      sortable: true,
      lockPosition: true,
      filter: true,
      flex: isMobile ? 0 : 1,
    },
    {
      field: "type",
      headerName: "Type",
      sortable: true,
      lockPosition: true,
      filter: true,
      flex: isMobile ? 0 : 1,
    },
    {
      field: "driver",
      headerName: "Driver / Operator",
      sortable: true,
      lockPosition: true,
      filter: true,
      flex: isMobile ? 0 : 1,
    },
    {
      field: "mechanic",
      sortable: true,
      lockPosition: true,
      filter: true,
      flex: isMobile ? 0 : 1,
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
          <AddVehicle mutate={mutate}>
            <Button
              variant="ghost"
              className="bg-transparent hover:bg-background border"
              aria-label="Add New Account"
            >
              <Plus />
              <span className="max-sm:hidden me-2">New</span>
            </Button>
          </AddVehicle>
          <Button
            variant={"ghost"}
            className=" bg-transparent hover:bg-background  border "
          >
            <Edit />
            <span className="max-sm:hidden me-2 ">Edit</span>
          </Button>

          <Alert_Dialog
            title={"Are You Sure ?"}
            description={
              "This action will remove the user and cannot be undone. "
            }
            confirmText={"Delete"}
          >
            <Button
              variant={"destructive"}
              className=" bg-transparent hover:bg-background hover:text-destructive-foreground border"
            >
              <Trash />
              <span className=" max-sm:hidden me-2 ">Delete</span>
            </Button>
          </Alert_Dialog>
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
      />
    </div>
  );
}
