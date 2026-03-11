"use client";

import { SelectDialog } from "@/components/select-dialog";
import { Customer } from "@prisma/client";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { CustomerCardRenderer } from "./customers/customerCard";
import { Button } from "@/components/button";
import { UniversalContextMenu } from "@/components/context-menu";

export default function App_Page(props: any) {
  const {
    data: customers,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => (await axios.get<Customer[]>("/api/customers")).data,
  });

  return (
    <div className="p-4 space-y-4">
      <SelectDialog<Customer>
        onSelect={function (item: Record<string, any>) {
          console.log(item);
        }}
        data={customers}
        searchFields={["name", "phone"]}
        cardRenderer={(data) => {
          <>
            <UniversalContextMenu
              items={[
                {
                  id: "delete",
                  label: "Delete",
                  onClick: async () =>
                    await axios.delete(`/api/customers/${data.id}`),
                },
              ]}
            >
              <CustomerCardRenderer itemList={false} data={data} />
            </UniversalContextMenu>
          </>;
        }}
        rowHeight={75}
      >
        <Button variant={"destructive"}>Hello world</Button>
      </SelectDialog>
    </div>
  );
}
