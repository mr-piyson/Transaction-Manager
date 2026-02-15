"use client";
import { ListView } from "@/components/list-view";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFab } from "@/hooks/use-fab";
import { useHeader } from "@/hooks/use-header";
import { Customer } from "@/types/prisma/client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Plus, User2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { UniversalDialog } from "@/components/dialog";
import { queryClient } from "../App";
import { useI18n } from "@/hooks/use-i18n";

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
    queryFn: async () => {
      const res = await axios.get("/api/customers");
      return res.data;
    },
  });

  useEffect(() => {
    header.configureHeader({
      leftContent: (
        <div className="flex h-full w-full items-center gap-4 print:hidden">
          <div className="bg-primary w-1 h-8"></div>
          <h1 className="text-2xl font-semibold pb-1 capitalize">{t("common.customers")}</h1>
        </div>
      ),
    });
    fab.setFabConfig({
      render: () => {
        return (
          <UniversalDialog<Customer>
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
            apiEndpoint={"/api/customers"}
            onSuccess={() => {
              console.log("Hello Muntadher");
              queryClient.refetchQueries({
                queryKey: ["customers"],
              });
            }}
          >
            <Button variant="default" size="icon" className="absolute -top-6 left-1/2 -translate-x-1/2 size-14 rounded-full shadow-lg">
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
    <div className="flex-1 h-full">
      <ListView<Customer>
        emptyTitle="No Customers Found"
        emptyIcon={<User2 className="size-16 text-muted-foreground" />}
        emptyDescription={"create new customer to get started"}
        data={customers}
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

const userCardRenderer = ({ data }: { data: Customer }) => {
  const router = useRouter();
  return (
    <div
      onClick={() => {
        router.push(`/app/customers/${data.id}`);
      }}
      className="flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-accent/50 "
    >
      <Avatar className="size-10">
        <AvatarImage src={data.image ?? ""} alt={data.name || "image"} loading="lazy" style={{ transition: "opacity 0.2s" }} />
        <AvatarFallback>
          <User2 className="size-6" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{data.name}</p>
        <p className="text-sm text-muted-foreground truncate">{data.phone}</p>
      </div>
      <div className="text-right text-xs space-y-0.5">
        <p className="flex items-center justify-end gap-1 text-primary">
          <svg className="w-3 h-3" />
          <span className="font-semibold">{data.id}</span>
        </p>
        <p className="flex items-center justify-end gap-1 text-muted-foreground">
          <svg className="w-3 h-3" />
          {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "No Date"}
        </p>
      </div>
    </div>
  );
};
