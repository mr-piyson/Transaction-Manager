"use client";

import { memo, useCallback } from "react";
import type { ICellRendererParams } from "ag-grid-community";
import { useRouter } from "next/navigation";
import { Trash, Package } from "lucide-react";
import { toast } from "sonner";

import { alert } from "@/components/Alert-dialog";
import { UniversalContextMenu } from "@/components/context-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Money } from "@/lib/money";
import axios from "axios";
import { queryClient } from "@/lib/client";

export type InventoryItem = {
  id: number;
  code?: string | null;
  name: string;
  description?: string | null;
  purchasePrice: number;
  salesPrice: number;
  image?: string | null;
  invoiceId?: number | null;
};

export function InventoryCardRenderer({ data }: { data: InventoryItem }) {
  const router = useRouter();

  if (!data) return null;

  const profit = data.salesPrice - data.purchasePrice;

  const handleDelete = () => {
    alert.delete({
      title: "Delete item?",
      description: data.name,
      confirmText: "Delete",
      destructive: true,
      onConfirm: async () => {
        const res = axios.delete(`/api/inventory/${data.id}`);
        if ((await res).status === 201) {
          toast.success("Item deleted");
          queryClient.refetchQueries({
            queryKey: ["inventory"],
          });
        }
      },
    });
  };

  return (
    <UniversalContextMenu
      items={[
        {
          id: "delete",
          label: "Delete",
          icon: Trash,
          destructive: true,
          onClick: handleDelete,
        },
      ]}
    >
      <div
        onClick={() => router.push(`/app/inventory/${data.id}`)}
        className="flex items-center gap-4 px-4 py-3 hover:bg-accent/50 cursor-pointer"
      >
        <Avatar className="size-12 shrink-0">
          <AvatarImage src={data.image ?? undefined} />
          <AvatarFallback>
            <Package className="size-6" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{data.name}</p>
          {data.description && (
            <p className="text-sm text-muted-foreground truncate">
              {data.description}
            </p>
          )}
        </div>

        <div className="text-right text-xs min-w-30">
          <p>Purchase: {Money.format(data.purchasePrice)}</p>
          <p className="text-destructive">
            Sales: {Money.format(data.salesPrice)}
          </p>
          <p
            className={cn(
              profit >= 0 ? "text-emerald-600" : "text-destructive",
            )}
          >
            Profit: {Money.format(profit)}
          </p>
        </div>
      </div>
    </UniversalContextMenu>
  );
}
