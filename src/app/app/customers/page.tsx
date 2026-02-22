"use client";
import { ListView } from "@/components/list-view";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFab } from "@/hooks/use-fab";
import { useHeader } from "@/hooks/use-header";
import { useQuery } from "@tanstack/react-query";
import { Plus, User2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UniversalDialog } from "@/components/dialog";
import { useI18n } from "@/hooks/use-i18n";
import { Customer } from "@prisma/client";
import { userCardRenderer } from "./customerCard";

type CustomersPageProps = {
  children?: React.ReactNode;
};

export default function CustomersPage(props: CustomersPageProps) {
  const header = useHeader();
  const fab = useFab();
  const { t } = useI18n();

  const {
    data: customers,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {},
  });

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
            onSuccess={() => {}}
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
  }, [fab, header, t]);
  return (
    <div className="flex-1 h-full">
      <ListView<Customer>
        emptyTitle="No Customers Found"
        emptyIcon={<User2 className="size-16 text-muted-foreground" />}
        emptyDescription={"create new customer to get started"}
        data={[]}
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
