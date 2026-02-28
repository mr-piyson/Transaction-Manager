import React, { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import AppLayout from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usersApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { Pencil, Trash2, ShieldCheck, User, Shield } from "lucide-react";
import UserFormDialog from "@/components/users/UserFormDialog";

const roleIcon: Record<string, any> = {
  SUPER_ADMIN: ShieldCheck,
  ADMIN: Shield,
  USER: User,
};

const roleBadge: Record<string, any> = {
  SUPER_ADMIN: "default",
  ADMIN: "secondary",
  USER: "outline",
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: "15",
      };
      if (roleFilter) params.role = roleFilter;
      const res = await usersApi.list(params);
      setUsers(res.users);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await usersApi.delete(deleteTarget.id);
      toast.success("User deleted");
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      key: "user",
      label: "User",
      render: (row: any) => {
        const Icon = roleIcon[row.role] || User;
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">
                {row.firstName[0]}
              </span>
            </div>
            <div>
              <p className="font-medium text-sm">
                {row.firstName} {row.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{row.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "role",
      label: "Role",
      render: (row: any) => (
        <Badge variant={roleBadge[row.role]}>
          {row.role.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (row: any) => (
        <Badge
          variant={row.isActive ? "default" : "secondary"}
          className={row.isActive ? "bg-emerald-500 text-white" : ""}
        >
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
      render: (row: any) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-24 text-right",
      render: (row: any) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              setEditTarget(row);
              setFormOpen(true);
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Head>
        <title>Users — BizCore</title>
      </Head>
      <AppLayout>
        <PageHeader
          title="Users"
          description={`${total} user${total !== 1 ? "s" : ""} total`}
        />
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All roles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="USER">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            total={total}
            page={page}
            limit={15}
            onPageChange={setPage}
            emptyMessage="No users found"
            rowKey={(r) => r.id}
          />
        </div>

        <UserFormDialog
          open={formOpen}
          onOpenChange={(o) => {
            setFormOpen(o);
            if (!o) setEditTarget(null);
          }}
          initial={editTarget}
          onSuccess={() => {
            setFormOpen(false);
            load();
          }}
        />

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          title="Delete user?"
          description={`${deleteTarget?.firstName} ${deleteTarget?.lastName || ""} will be permanently deleted.`}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      </AppLayout>
    </>
  );
}
