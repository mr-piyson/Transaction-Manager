"use client";

import { useQuery } from "@tanstack/react-query";
import { Box, FileText } from "lucide-react";

import { ListView } from "@/components/list-view";
import { useI18n } from "@/hooks/use-i18n";

// Optional: If you want to drop axios entirely, use Eden for the mutation.
import axios from "axios";
import { Invoice } from "@prisma/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CreateInvoiceDialog } from "./create-invoice-dialog";
import { InvoiceCardRenderer, InvoiceWithRelations } from "./invoiceCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function invoicesPage() {
  const { t } = useI18n();

  const {
    data: invoices,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const data = (await axios.get("/api/invoices")).data;
      return data;
    },
  });

  return (
    <>
      <Header
        title={"Invoices"}
        icon={<FileText className="inline" />}
        rightContent={<CreateInvoiceDialog />}
      />
      <Tabs defaultValue="overview" className="w-full m-4">
        <TabsList className="w-full">
          <TabsTrigger value="overview">All</TabsTrigger>
          <TabsTrigger value="analytics">Pending</TabsTrigger>
          <TabsTrigger value="settings">PARTIAL</TabsTrigger>
          <TabsTrigger value="reports">Paid</TabsTrigger>
        </TabsList>
      </Tabs>

      <ListView<InvoiceWithRelations>
        emptyTitle={t("invoices.empty_title", "No invoices items Found")}
        emptyIcon={<Box className="size-16 text-muted-foreground" />}
        emptyDescription={
          t("invoices.empty_description") ||
          "Create a new invoices item to get started"
        }
        data={invoices}
        isLoading={isLoading}
        isError={isError}
        itemName="invoices items"
        useTheme={true}
        cardRenderer={(data) => <InvoiceCardRenderer data={data} />}
        rowHeight={65}
        searchFields={[]}
        onRefetch={refetch}
      />
    </>
  );
}
