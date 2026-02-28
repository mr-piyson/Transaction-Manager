"use client";
import { ListView } from "@/components/list-view";
import { Button } from "@/components/ui/button";
import { useFab } from "@/hooks/use-fab";
import { useHeader } from "@/hooks/use-header";
import { useQuery } from "@tanstack/react-query";
import { Plus, PlusCircle, User2 } from "lucide-react";
import { useEffect } from "react";
import { UniversalDialog } from "@/components/dialog";
import { useI18n } from "@/hooks/use-i18n";
import { Customer } from "@prisma/client";
import { userCardRenderer } from "./customerCard";
import { useEden } from "@/lib/client";
import axios from "axios";

type CustomersPageProps = {
  children?: React.ReactNode;
};

export default function CustomersPage(props: CustomersPageProps) {
  const header = useHeader();
  const fab = useFab();
  const { t } = useI18n();
  const { api } = useEden();

  const { data, isLoading, isError, refetch } = useQuery(
    api.customers.get.queryOptions(),
  );

  useEffect(() => {
    header.configureHeader({
      leftContent: (
        <div className="flex h-full w-full items-center gap-4 print:hidden">
          <div className="bg-primary w-1 h-8"></div>
          <h1 className="text-2xl font-semibold pb-1 capitalize">
            {t("common.customers")}
          </h1>
        </div>
      ),
    });
    fab.setFabConfig({
      render: () => {
        return (
          <UniversalDialog<Partial<Customer>>
            title={"Create Record"}
            fields={[
              {
                name: "name",
                label: "Name",
                width: "full",
                type: "text",
                minLength: 3,
                required: false,
                description: "Enter the name of the customer",
              },
              {
                name: "phone",
                label: "Phone",
                width: "full",
                type: "text",
                required: false,
              },
            ]}
            onSubmit={async () => {}}
          >
            <Button
              variant="default"
              size="icon"
              className="absolute -top-6 left-1/2 -translate-x-1/2 size-14 rounded-full shadow-lg"
            >
              <Plus className="size-7 text-foreground" />
            </Button>
          </UniversalDialog>
        );
      },
    });
    return () => {
      header.resetHeader();
    };
  }, []);

  return (
    <div className="flex-1 h-full p-4">
      <div className="flex gap-2bg-red-500 w-full pb-4">
        <UniversalDialog<Customer>
          title={"Create new Customer"}
          fields={[
            {
              name: "name",
              label: "Name",
              required: true,
              type: "text",
            },
            {
              name: "phone",
              label: "Phone",
              required: true,
              type: "text",
            },
            {
              name: "address",
              label: "Address",
              required: true,
              type: "text",
            },
          ]}
          mutationFn={async () => {
            return await axios.get("/api/customers/asdas");
          }}
        >
          <Button>
            <Plus /> Create
          </Button>
        </UniversalDialog>
      </div>
      <ListView
        emptyTitle="No Customers Found"
        emptyIcon={<User2 className="size-16 text-muted-foreground" />}
        emptyDescription={"create new customer to get started"}
        data={data?.customers}
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
