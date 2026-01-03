"use client";
import { useToolbar } from "@/hooks/use-toolbar";
import { use } from "react";
import InvoicesTable from "./Records-Table";

type CustomerPageProps = {
  children?: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default function RecordsPage(props: CustomerPageProps) {
  const { id } = use(props.params);
  const toolbar = useToolbar();

  return (
    <div className="flex flex-col w-full h-full">
      <InvoicesTable />
    </div>
  );
}
