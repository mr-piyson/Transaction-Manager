"use client";

/**
 * Example usage of SelectionDialog with React Query.
 * Drop this in any page or component to see it in action.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SelectionDialog } from "@/components/select-dialog-v2";
import { useTableTheme } from "@/hooks/use-table-theme";

// ─── Demo data types ──────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  department: string;
  avatar: string;
}

// ─── Fake fetch ───────────────────────────────────────────────────────────────

const fetchUsers = async (): Promise<User[]> => {
  await new Promise((r) => setTimeout(r, 600)); // simulate network
  return [
    {
      id: "1",
      name: "Alice Martin",
      email: "alice@acme.com",
      role: "admin",
      department: "Engineering",
      avatar: "AM",
    },
    {
      id: "2",
      name: "Bob Chen",
      email: "bob@acme.com",
      role: "editor",
      department: "Design",
      avatar: "BC",
    },
    {
      id: "3",
      name: "Carol White",
      email: "carol@acme.com",
      role: "viewer",
      department: "Marketing",
      avatar: "CW",
    },
    {
      id: "4",
      name: "Dave Kim",
      email: "dave@acme.com",
      role: "editor",
      department: "Engineering",
      avatar: "DK",
    },
    {
      id: "5",
      name: "Eva Lopez",
      email: "eva@acme.com",
      role: "admin",
      department: "Product",
      avatar: "EL",
    },
    {
      id: "6",
      name: "Frank Müller",
      email: "frank@acme.com",
      role: "viewer",
      department: "Sales",
      avatar: "FM",
    },
    {
      id: "7",
      name: "Grace Liu",
      email: "grace@acme.com",
      role: "editor",
      department: "Design",
      avatar: "GL",
    },
    {
      id: "8",
      name: "Hiro Tanaka",
      email: "hiro@acme.com",
      role: "viewer",
      department: "Support",
      avatar: "HT",
    },
  ];
};

// ─── Card renderer ────────────────────────────────────────────────────────────

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  editor: "secondary",
  viewer: "outline",
};

function UserCard(user: User, selected: boolean) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${selected ? "opacity-100" : "opacity-90"}`}
    >
      {/* Avatar */}
      <div
        className={`
        w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0
        ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
      `}
      >
        {user.avatar}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.name}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {user.department}
        </span>
        <Badge
          variant={roleBadgeVariant[user.role]}
          className="text-xs capitalize"
        >
          {user.role}
        </Badge>
      </div>
    </div>
  );
}

// ─── Demo page ────────────────────────────────────────────────────────────────

export default function SelectionDialogDemo() {
  const [open, setOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [mode, setMode] = useState<"single" | "multi">("multi");
  const theme = useTableTheme();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  return (
    <div className="flex flex-col gap-6 p-8 max-w-lg">
      <div>
        <h1 className="text-xl font-bold mb-1">SelectionDialog Demo</h1>
        <p className="text-sm text-muted-foreground">
          Click a button below to open the dialog.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => {
            setMode("multi");
            setOpen(true);
          }}
        >
          Multi-select
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setMode("single");
            setOpen(true);
          }}
        >
          Single-select
        </Button>
      </div>

      {selectedUsers.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">
            Selected ({selectedUsers.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((u) => (
              <Badge key={u.id} variant="secondary" className="gap-1">
                {u.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <SelectionDialog<User>
        open={open}
        onOpenChange={setOpen}
        title={
          mode === "multi" ? "Select team members" : "Select a team member"
        }
        description="Choose who to add to this project."
        mode={mode}
        data={data}
        isLoading={isLoading}
        isError={isError}
        error={error}
        useTheme
        onRefetch={refetch}
        getItemId={(u) => u.id}
        selectedIds={selectedUsers.map((u) => u.id)}
        searchPlaceholder="Search by name or email…"
        searchFields={["name", "email"]}
        filters={[
          {
            key: "role",
            label: "Role",
            getValue: (u) => u.role,
          },
          {
            key: "department",
            label: "Department",
            getValue: (u) => u.department,
          },
        ]}
        cardRenderer={UserCard}
        rowHeight={64}
        itemName="users"
        confirmLabel="Add to project"
        onSelect={(users) => setSelectedUsers(users)}
      />
    </div>
  );
}
