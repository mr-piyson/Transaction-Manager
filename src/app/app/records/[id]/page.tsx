"use client";
import { useToolbar } from "@/hooks/use-toolbar";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { use } from "react";
import RecordTable from "./Records-Table";
import { Records } from "@/types/prisma/client";

type CustomerPageProps = {
  children?: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default function CustomerPage(props: CustomerPageProps) {
  const { id } = use(props.params);
  const toolbar = useToolbar();

  const {
    data: customer,
    isLoading,
    error,
  } = useQuery<Records>({
    queryKey: ["customer", id],
    queryFn: async () => (await axios.get(`/api/records/${id}`)).data,
  });

  return (
    <div className="flex flex-col w-full h-full">
      <RecordTable />
    </div>
  );
}
