"use client";

import { SelectDialog } from "@/components/select-dialog";
import { Customer } from "@prisma/client";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { CustomerCardRenderer } from "./customers/customerCard";
import { Button } from "@/components/button";

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
        cardRenderer={CustomerCardRenderer}
        rowHeight={75}
      >
        <Button variant={"destructive"}>Hello world</Button>
      </SelectDialog>
    </div>
  );
}
