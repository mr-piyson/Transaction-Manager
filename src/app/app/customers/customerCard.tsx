import { alert } from "@/components/Alert-dialog";
import { UniversalContextMenu } from "@/components/context-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Customer } from "@prisma/client";
import { Trash, User2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CustomerCardRenderer({
  data,
  itemList = false,
  disabled = true,
}: {
  data: Customer;
  itemList?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();

  return (
    <UniversalContextMenu
      items={[
        {
          id: "1",
          label: "Delete",
          icon: Trash,
          destructive: true,
          onClick: () => {
            alert.delete({
              title: <span>Are you sure you want to delete</span>,
              description: <CustomerCardRenderer data={data} disabled={true} />,
              confirmText: "Delete",
              onConfirm: async () => {
                toast.error("Item was deleted");
              },
              destructive: false,
            });
          },
        },
      ]}
    >
      <div
        onClick={() => {
          itemList ?? router.push(`/app/customers/${data.id}`);
        }}
        className={cn(
          itemList ?? "hover:bg-accent/50 cursor-pointer",
          "flex items-center gap-3 p-3  transition-colors ",
        )}
      >
        <Avatar className="size-10">
          <AvatarImage
            // src={data.image ?? ""}
            alt={data.name || "image"}
            loading="lazy"
            style={{ transition: "opacity 0.2s" }}
          />
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
          </p>
        </div>
      </div>
    </UniversalContextMenu>
  );
}
