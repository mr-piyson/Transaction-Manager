import React, { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import AppLayout from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { inventoryApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import InventoryFormDialog from "@/components/inventory/InventoryFormDialog";

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: "15",
      };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await inventoryApi.list(params);
      setItems(res.items);
      setTotal(res.total);
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await inventoryApi.delete(deleteTarget.id);
      toast.success("Item deleted");
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const margin = (item: any) => {
    if (!item.purchasePrice) return 0;
    return Math.round(
      ((item.salesPrice - item.purchasePrice) / item.purchasePrice) * 100,
    );
  };

  const columns = [
    {
      key: "name",
      label: "Item",
      render: (row: any) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
            {row.image ? (
              <img
                src={row.image}
                alt={row.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <Package className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">{row.name}</p>
            {row.code && (
              <p className="text-xs text-muted-foreground font-mono">
                {row.code}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (row: any) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {row.description}
        </span>
      ),
    },
    {
      key: "purchasePrice",
      label: "Cost",
      render: (row: any) => (
        <span className="text-sm font-mono">
          {formatCurrency(row.purchasePrice)}
        </span>
      ),
    },
    {
      key: "salesPrice",
      label: "Price",
      render: (row: any) => (
        <span className="text-sm font-mono font-medium">
          {formatCurrency(row.salesPrice)}
        </span>
      ),
    },
    {
      key: "margin",
      label: "Margin",
      render: (row: any) => {
        const m = margin(row);
        return (
          <Badge
            variant={m >= 0 ? "default" : "destructive"}
            className="font-mono text-xs"
          >
            {m}%
          </Badge>
        );
      },
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
        <title>Inventory — BizCore</title>
      </Head>
      <AppLayout>
        <PageHeader
          title="Inventory"
          description={`${total} item${total !== 1 ? "s" : ""} in stock`}
          action={
            <Button
              onClick={() => {
                setEditTarget(null);
                setFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add item
            </Button>
          }
        />
        <div className="p-6 space-y-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <DataTable
            columns={columns}
            data={items}
            loading={loading}
            total={total}
            page={page}
            limit={15}
            onPageChange={setPage}
            emptyMessage="No inventory items found"
            rowKey={(r) => r.id}
          />
        </div>

        <InventoryFormDialog
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
          title="Delete inventory item?"
          description={`"${deleteTarget?.name}" will be permanently removed.`}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      </AppLayout>
    </>
  );
}
