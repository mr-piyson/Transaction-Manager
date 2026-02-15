"use client";
import { ListView } from "@/components/list-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFab } from "@/hooks/use-fab";
import { useHeader } from "@/hooks/use-header";
import { Invoice } from "@/types/prisma/client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { LucideFileText } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import CreateInvoiceDialog from "./create-invoice-dialog";
import { useI18n } from "@/hooks/use-i18n";

type RecordPageProps = {
  children?: React.ReactNode;
};

export default function RecordPage(props: RecordPageProps) {
  const header = useHeader();
  const params = useParams();
  const router = useRouter();
  const fab = useFab();
  const { t } = useI18n();

  const {
    data: invoices,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["invoices", params.recordId],
    queryFn: async () => (await axios.get(`/api/invoices`)).data,
  });

  useEffect(() => {
    header.configureHeader({
      leftContent: (
        <div className="flex h-full w-full items-center gap-4 print:hidden">
          <div className="bg-primary w-1 h-8"></div>
          <h1 className="text-2xl font-semibold pb-1 capitalize">{t("common.invoices")}</h1>
        </div>
      ),
    });

    fab.setFabConfig({
      visible: true,
      render: () => (
        <CreateInvoiceDialog>
          <Button variant="default" size="icon" className="absolute -top-6 left-1/2 -translate-x-1/2 size-14 rounded-full shadow-lg">
            <svg className="icon-[hugeicons--file-01] size-7 text-foreground" />
          </Button>
        </CreateInvoiceDialog>
      ),
    });

    return () => {
      header.resetHeader();
      fab.resetFabConfig();
    };
  }, []);
  return (
    <div className="flex-1 h-full">
      <ListView<Invoice>
        emptyTitle="No Invoices Found"
        emptyIcon={<LucideFileText className="size-16 text-muted-foreground" />}
        emptyDescription={"create new invoices to get started"}
        data={invoices}
        isLoading={isLoading}
        isError={!!error}
        itemName="invoices"
        useTheme={true}
        cardRenderer={invoiceCardRenderer}
        rowHeight={75}
        searchFields={["status"]}
      />
    </div>
  );
}

const invoiceCardRenderer = ({ data: invoice }: { data: Invoice }) => {
  const router = useRouter();
  const formattedDate = useMemo(() => {
    if (!invoice.createdAt) return "N/A";
    const date = new Date(invoice.createdAt);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [invoice.createdAt]);
  const params = useParams<{ recordId: string }>();

  const statusConfig = {
    pending: { variant: "warning" as const, label: "Pending", icon: "icon-[lucide--clock-4]" },
    done: { variant: "success" as const, label: "Done", icon: "icon-[lucide--check]" },
    draft: { variant: "primary" as const, label: "In Progress", icon: "icon-[mingcute--loading-fill]" },
    failed: { variant: "destructive" as const, label: "Failed", icon: "icon-[lucide--circle-x]" },
  };

  const status = invoice.status || "draft";
  const { variant, label, icon } = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <div className="flex items-center gap-4 p-4 cursor-pointer transition-colors hover:bg-accent/50 border-b border-border" onClick={() => router.push(`/app/invoices/${invoice.id}`)}>
      <div className="flex items-center justify-center size-10 rounded-lg ">
        <svg className="icon-[hugeicons--file-01] size-7 text-foreground/60" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">{`Invoice #${invoice.id}`}</p>
          <Badge variant={variant}>
            <svg className={icon} />
            {label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">{formattedDate}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          {/* <p className="font-semibold text-sm">{invoice.total?.toFixed(3) || "0.000"} BD</p> */}
          {/* <p className="font-semibold text-sm text-muted-foreground"></p> */}
        </div>
      </div>
    </div>
  );
};
