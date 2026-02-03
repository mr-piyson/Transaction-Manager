"use client";
import { ListView } from "@/components/list-view";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFab } from "@/hooks/use-fab";
import { useHeader } from "@/hooks/use-header";
import { Records } from "@/types/prisma/client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ArrowLeft, LucideFileText, Plus, User2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import CreateRecordDialog from "./create-record-dialog";
import { UniversalDialog } from "@/components/dialog";
import { queryClient } from "../App";

type RecordsPageProps = {
  children?: React.ReactNode;
};

export default function RecordsPage(props: RecordsPageProps) {
  const header = useHeader();
  const fab = useFab();

  const {
    data: records,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["records"],
    queryFn: async () => {
      const res = await axios.get("/api/records");
      return res.data;
    },
  });

  useEffect(() => {
    header.configureHeader({
      leftContent: (
        <div className="flex h-full w-full items-center gap-4">
          <div className="bg-primary w-1 h-8"></div>
          <h1 className="text-2xl font-semibold pb-1">Records</h1>
        </div>
      ),
    });
    fab.setFabConfig({
      render: () => {
        return (
          <UniversalDialog<Records>
            title={"Create Record"}
            fields={[
              {
                name: "name",
                label: "Name",
                type: "text",
                required: false,
              },
              {
                name: "phone",
                label: "Phone",
                type: "text",
                required: false,
              },
              {
                name: "email",
                label: "Email",
                type: "text",
                required: false,
              },
              {
                name: "address",
                label: "Address",
                type: "text",
                required: false,
              },
            ]}
            apiEndpoint={"/api/records"}
            onSuccess={() => {
              console.log("Hello Muntadher");
              queryClient.refetchQueries({
                queryKey: ["records"],
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
      <ListView<Records>
        emptyTitle="No Records Found"
        emptyIcon={<LucideFileText className="size-16 text-muted-foreground" />}
        emptyDescription={"create new records to get started"}
        data={records}
        isLoading={isLoading}
        isError={isError}
        itemName="records"
        useTheme={true}
        cardRenderer={userCardRenderer}
        rowHeight={70}
        searchFields={["name", "phone", "code"]}
      />
    </div>
  );
}

const userCardRenderer = ({ data }: { data: Records }) => {
  const router = useRouter();
  return (
    <div
      onClick={() => {
        router.push(`/app/records/${data.id}`);
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
          <span className="font-semibold">{data.code}</span>
        </p>
        <p className="flex items-center justify-end gap-1 text-muted-foreground">
          <svg className="w-3 h-3" />
          {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "No Date"}
        </p>
      </div>
    </div>
  );
};
