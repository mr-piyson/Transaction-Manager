"use client";

import { AgGridReact } from "ag-grid-react";
import { useState } from "react";

import { Account } from "@prisma/client";

import { AllCommunityModule, ColDef, ModuleRegistry } from "ag-grid-community";
import { ClientSideRowModelModule } from "ag-grid-community"; // Import the missing module
import Image from "next/image";
import { useTableTheme } from "@/hooks/use-TableTheme";

// Register the required modules
ModuleRegistry.registerModules([AllCommunityModule, ClientSideRowModelModule]);

export default function RecordTable({ account }: { account: Account }) {
  const tableTheme = useTableTheme();

  const [rowData, setRowData] = useState<Account[]>([
    {
      id: "1",
      name: "Tesla",
      email: "ex@gfdg.community",
      role: "Admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      image: "https://github.com/shadcn.png",
      password: "123456",
    },
    {
      id: "2",
      name: "Tesla",
      email: "ex@gfdg.community",
      role: "Admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      image: "https://github.com/shadcn.png",
      password: "123456",
    },
  ]);

  // Column Definitions: Defines the columns to be displayed.
  const [colDefs, setColDefs] = useState<ColDef[]>([
    {
      field: "image",

      cellRenderer: (params: { value: string }) => {
        return (
          <div className="flex items-center justify-center">
            <img
              className="w-[35px] h-[35px] rounded-full"
              src={params.value}
              alt="Image"
            />
          </div>
        );
      },
    },
    { field: "name", sortable: true, filter: true },
    { field: "email", sortable: true, filter: true },
    { field: "rules", sortable: true, filter: true },
    { field: "password", sortable: true, filter: true },
    {
      field: "createdAt",
      sortable: true,
      filter: true,
      valueFormatter: (params) => {
        return new Date(params.value).toLocaleDateString();
      },
    },
    {
      field: "updatedAt",
      sortable: true,
      filter: true,
      valueFormatter: (params) => {
        return new Date(params.value).toLocaleDateString();
      },
    },
  ]);

  return (
    <div className=" flex flex-col w-full h-full bg-popover">
      <AgGridReact
        theme={tableTheme}
        className="h-full w-full"
        rowData={rowData}
        columnDefs={colDefs}
      />
    </div>
  );
}
