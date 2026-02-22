import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Customer } from "@prisma/client";
import { User2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function userCardRenderer({ data }: { data: Customer }) {
  //   const router = useRouter();
  return (
    <div
      onClick={() => {
        // router.push(`/app/customers/${data.id}`);
      }}
      className="flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-accent/50 "
    >
      <Avatar className="size-10">
        <AvatarImage
          src={data.image ?? ""}
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
          {data.createdAt
            ? new Date(data.createdAt).toLocaleDateString()
            : "No Date"}
        </p>
      </div>
    </div>
  );
}
