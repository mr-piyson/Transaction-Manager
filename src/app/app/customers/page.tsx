"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, User2 } from "lucide-react";
import { Customer } from "@prisma/client";

import { ListView } from "@/components/list-view";
import { Button } from "@/components/ui/button";
import { UniversalDialog } from "@/components/dialog";
import { useHeader } from "@/hooks/use-header";
import { useI18n } from "@/hooks/use-i18n";
import { useEden } from "@/lib/client";
import { userCardRenderer } from "./customerCard";

// Optional: If you want to drop axios entirely, use Eden for the mutation.
import axios from "axios";

export default function CustomersPage() {
  const header = useHeader();
  const { t } = useI18n();
  const eden = useEden();

  const { data, isLoading, isError, refetch } = useQuery(
    eden.api.customers.get.queryOptions(),
  );

  // 2. Memoize the header component so we don't trigger unnecessary layout repaints
  const headerLeftContent = useMemo(
    () => (
      <div className="flex h-full w-full items-center gap-4 print:hidden justify-between">
        <div className="flex flex-row gap-4">
          <div className="bg-primary w-1 h-8 rounded-sm" />
          <h1 className="text-2xl font-semibold pb-1 capitalize">
            {t("common.customers")}
          </h1>
        </div>
        <UniversalDialog<Customer>
          title={t("customers.new", "Create new Customer")}
          fields={[
            { name: "name", label: "Name", required: true, type: "text" },
            { name: "phone", label: "Phone", required: true, type: "text" },
            { name: "address", label: "Address", required: true, type: "text" },
          ]}
          mutationFn={async (payload) =>
            // Tip: Consider using `eden.api.customers.post(payload)` here if your Eden client supports it!
            await axios.post("/api/customers", payload)
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

  // 3. Fix useEffect dependencies
  useEffect(() => {
    header.configureHeader({
      leftContent: headerLeftContent,
    });

    return () => {
      header.resetHeader();
    };
  }, []);

  return (
    <div className="h-full py-4">
      <ListView
        emptyTitle={t("customers.empty_title", "No Customers Found")}
        emptyIcon={<User2 className="size-16 text-muted-foreground" />}
        emptyDescription={
          t("customers.empty_description") ||
          "Create a new customer to get started"
        }
        data={data?.customers || []}
        isLoading={isLoading}
        isError={isError}
        itemName="customers"
        useTheme={true}
        cardRenderer={userCardRenderer}
        rowHeight={65}
        searchFields={["name", "phone"]}
        onRefetch={refetch}
      />
    </div>
  );
}
