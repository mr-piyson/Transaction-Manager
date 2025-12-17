"use client";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "../ui/button";
import { queryClient } from "../App/App";

export function CustomersContextMenu(props: { id?: number; children?: React.ReactNode }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{props.children ? <>{props.children}</> : <Button>Context menu</Button>}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem inset>Copy name</ContextMenuItem>
        <ContextMenuItem inset>Copy Phone Number</ContextMenuItem>
        <ContextMenuItem inset>Edit</ContextMenuItem>
        <ContextMenuItem
          inset
          onClick={() =>
            queryClient.refetchQueries({
              queryKey: ["customers"],
            })
          }
        >
          Reload
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked>Show Bookmarks</ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem>Show Full URLs</ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive">Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
