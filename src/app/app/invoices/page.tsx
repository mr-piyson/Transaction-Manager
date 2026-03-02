"use client";

import { useQuery } from "@tanstack/react-query";
import { Box } from "lucide-react";

import { ListView } from "@/components/list-view";
import { useI18n } from "@/hooks/use-i18n";

// Optional: If you want to drop axios entirely, use Eden for the mutation.
import axios from "axios";
import { Invoice } from "@prisma/client";

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
      console.log(data);
      return data;
    },
  });

  return (
    <div className="h-full ">
      <ListView<Invoice>
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
        cardRenderer={() => <></>}
        rowHeight={65}
        searchFields={[]}
        onRefetch={refetch}
      />
    </div>
  );
}
