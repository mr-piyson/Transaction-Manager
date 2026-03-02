"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Plus, User2 } from "lucide-react";
import { Customer, InventoryItem } from "@prisma/client";

import { ListView } from "@/components/list-view";
import { Button } from "@/components/ui/button";
import { UniversalDialog } from "@/components/dialog";
import { useI18n } from "@/hooks/use-i18n";

// Optional: If you want to drop axios entirely, use Eden for the mutation.
import axios from "axios";
import { Header } from "@/components/Header";

export default function InventoryPage() {
  const { t } = useI18n();

  const {
    data: inventory,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const data = (await axios.get("/api/inventory")).data;
      console.log(data);
      return data;
    },
  });

  // 2. Memoize the header component so we don't trigger unnecessary layout repaints
  const headerLeftContent = useMemo(
    () => (
      <div className="flex h-full w-full items-center gap-4 print:hidden justify-between">
        <div className="flex flex-row gap-4">
          <div className="bg-primary w-1 h-8 rounded-sm" />
          <h1 className="text-2xl font-semibold pb-1 capitalize">
            {t("common.inventory")}
          </h1>
        </div>
        <UniversalDialog<InventoryItem>
          title={t("inventory.new", "Create new Inventory Item")}
          fields={[
            {
              label: "Name",
              name: "name",
              type: "text",
              required: true,
              maxLength: 100,
              width: "full",
            },
            {
              label: "Description",
              name: "description",
              type: "text",
              required: true,
              maxLength: 100,
              width: "full",
            },
            {
              label: "Purchase Price",
              name: "purchasePrice",
              type: "number",
              required: true,
            },
            {
              label: "Sales Price",
              name: "salesPrice",
              type: "text",
              required: true,
              maxLength: 100,
            },
            {
              label: "Bar/QR Code",
              name: "code",
              type: "text",
              maxLength: 100,
            },
          ]}
          mutationFn={async (payload) =>
            // Tip: Consider using `eden.api.customers.post(payload)` here if your Eden client supports it!
            await axios.post("/api/inventory", payload)
          }
          onSuccess={() => refetch()}
        >
          <Button>
            <Plus className="mr-2 size-4" />
            {t("common.create", "Create")}
          </Button>
        </UniversalDialog>
      </div>
    ),
    [t, refetch],
  );

  return (
    <div className="h-full ">
      <Header showBorder={true} title="Customer" />
      <ListView<Customer>
        emptyTitle={t("inventory.empty_title", "No inventory items Found")}
        emptyIcon={<Box className="size-16 text-muted-foreground" />}
        emptyDescription={
          t("inventory.empty_description") ||
          "Create a new inventory item to get started"
        }
        data={inventory}
        isLoading={isLoading}
        isError={isError}
        itemName="inventory items"
        useTheme={true}
        cardRenderer={() => <></>}
        rowHeight={65}
        searchFields={[]}
        onRefetch={refetch}
      />
    </div>
  );
}
