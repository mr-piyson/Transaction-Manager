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
import { Edit, File, FileText, Menu, Plus, Trash } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { JobCard } from "@prisma/client";
import useSWR, { mutate } from "swr";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { deleteJobCard } from "./Jobcard.actions";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Alert_Dialog } from "@/components/Alert_Dialog";

// Register the required modules
ModuleRegistry.registerModules([AllCommunityModule]);

export default function JobCardsTable(props: any) {
  const tableTheme = useTableTheme();

  const isMobile = useIsMobile();

  // const [selectedRow, setSelectedRow] = useState<JobCard | null>(null);

  const router = useRouter();

  // const onRowSelected = (event: any) => {
  //   setSelectedRow(event.data);
  // };
  const [rowData, setRowData] = useState<JobCard[]>([]);

  const { data, mutate, isLoading } = useSWR("/api/jobCards", {
    fetcher: (url: string) => fetch(url).then((res) => res.json()),
  });

  const { data: session } = useSWR("/api/session", {
    fetcher: (url: string) => fetch(url).then((res) => res.json()),
  });

  useMemo(() => {
    if (data) {
      setRowData(data);
    }
  }, [data]);

  const colDefs: ColDef[] = [
    {
      field: "id",
      headerName: "Card No",
      sortable: true,
      lockPosition: true,
      filter: true,
      flex: isMobile ? 0 : undefined,
      width: !isMobile ? 105 : undefined,
    },
    {
      field: "date",
      headerName: "Date",
      filter: "agDateColumnFilter",
      sortable: true,
      resizable: false,
      lockPosition: true,
      flex: isMobile ? 0 : 1,
      valueFormatter: (params: any) => {
        // Format the date to dd/mm/yyyy
        const date = new Date(params.value);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      },
      valueGetter: (params: any) => {
        // Return the date as a Date object for proper filtering
        return new Date(params.data.date);
      },
      filterParams: {
        comparator: (filterLocalDateAtMidnight: Date, cellValue: string) => {
          const cellDate = new Date(cellValue).setHours(0, 0, 0, 0);
          const filterDate = filterLocalDateAtMidnight.getTime();
          return cellDate === filterDate ? 0 : cellDate < filterDate ? -1 : 1;
        },
      },
    },
    {
      field: "operator",
      headerName: "Driver Name",
      sortable: true,
      filter: true,
      lockPosition: true,
      flex: isMobile ? 0 : 1,
    },
    {
      field: "department",
      headerName: "Site/Department",
      sortable: true,
      filter: true,
      lockPosition: true,
      flex: isMobile ? 0 : 1,
    },
    {
      field: "mechanic",
      sortable: true,
      filter: true,
      lockPosition: true,
      flex: isMobile ? 0 : 1,
    },
    {
      field: "type",
      headerName: "Vehicle Type",
      filter: true,
      resizable: false,
      lockPosition: true,
      flex: isMobile ? 0 : 1,
    },
    {
      field: "totalAmount",
      headerName: "Total Amount",
      resizable: false,
      filter: true,
      lockPosition: true,
      flex: isMobile ? 0 : 1,
      cellRenderer: (params: any) => {
        return (
          <div className="flex flex-row items-center justify-center w-full h-full space-x-2">
            <span>{Number(params.value).toFixed(3) + " BD"}</span>
          </div>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 100,
      cellRenderer: (params: any) => {
        return (
          <div className="flex flex-row items-center justify-center w-full h-full space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-0">
                  <Menu size={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => router.push(`/App/JobCards/${params.data.id}`)}
                >
                  <FileText size={20} className="mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/App/JobCards/${params.data.id}/Invoice`)
                  }
                >
                  <File size={20} className="mr-2" />
                  Invoice
                </DropdownMenuItem>
                {session?.account?.role === "Admin" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        toast.info("Still in Development", {
                          description: "This feature is not available yet.",
                        });
                        // router.push(`/App/JobCards/${params.data.id}/edit`);
                      }}
                    >
                      <Edit size={20} className="mr-2" />
                      Edit
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={async () => {
                        await deleteJobCard(params.data.id);
                        mutate();
                      }}
                      className="text-destructive-foreground hover:!bg-destructive  hover:!text-destructive-foreground"
                    >
                      <Trash
                        size={20}
                        className="mr-2 text-destructive-foreground hover:!bg-destructive  hover:text-destructive-foreground"
                      />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
      <Card className="flex flex-row p-0 m-0 rounded-none">
        <CardContent className="w-full p-3 space-x-3">
          <Button
            variant={"default"}
            onClick={() => router.push("/App/JobCards/New")}
          >
            <Plus />
            New Job Card
          </Button>
          {/* <Button
            variant={"ghost"}
            className=" bg-transparent hover:bg-background  border "
          >
            <Edit />
            <span className="max-sm:hidden me-2 ">Edit</span>
          </Button> */}

          {/* <Button
            variant={"destructive"}
            className=" bg-transparent hover:bg-background hover:text-destructive-foreground border"
          >
            <Trash />
            <span className="max-sm:hidden me-2 ">Delete</span>
          </Button> */}
        </CardContent>
      </Card>
      <AgGridReact
        theme={tableTheme}
        className="h-full w-full"
        rowData={rowData}
        columnDefs={colDefs}
        // this will make the grid responsive
        rowHeight={60}
        // This will prevent the column from removed when dragged out
        suppressDragLeaveHidesColumns
        // this will allow us to select multiple rows
        // rowSelection={rowSelection}
        // onRowSelected={onRowSelected}
        loading={isLoading}
      />
    </div>
  );
}
