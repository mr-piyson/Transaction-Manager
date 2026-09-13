"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileIcon,
  Grid3X3,
  HardDrive,
  Image,
  List,
  Loader2,
  RefreshCcw,
  Trash2,
  Unlink,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc/client";
import { SectionCard } from "../_shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrphanedDbRecord {
  id: string;
  filename: string;
  storagePath: string;
  size: number;
  originalName: string;
  mime: string;
}

interface OrphanedDiskFile {
  storagePath: string;
  size: number;
}

interface UnusedFile {
  id: string;
  filename: string;
  storagePath: string;
  size: number;
  originalName: string;
  mime: string;
}

interface DanglingImageRef {
  entityType: string;
  entityId: string;
  field: string;
  imagePath: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function fileNameFromPath(storagePath: string): string {
  return storagePath.split("/").pop() ?? storagePath;
}

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/") && mime !== "image/svg+xml";
}

function isImageByExt(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
}

function fileUrl(storagePath: string): string {
  const clean = storagePath.replace(/^\/+/, "");
  return `/api/files/${clean}`;
}

// Unified item type for the table
interface StorageIssue {
  key: string;
  category: "orphaned-db" | "orphaned-disk" | "unused" | "dangling-ref";
  name: string;
  path: string;
  size: number;
  mime: string;
  isImage: boolean;
  raw: OrphanedDbRecord | OrphanedDiskFile | UnusedFile | DanglingImageRef;
}

function toIssueItems(scan: {
  orphanedDbRecords: OrphanedDbRecord[];
  orphanedDiskFiles: OrphanedDiskFile[];
  unusedFiles: UnusedFile[];
  danglingImageRefs: DanglingImageRef[];
}): StorageIssue[] {
  const items: StorageIssue[] = [];

  for (const r of scan.orphanedDbRecords) {
    items.push({
      key: `db-${r.id}`,
      category: "orphaned-db",
      name: r.originalName,
      path: r.storagePath,
      size: r.size,
      mime: r.mime,
      isImage: isImageMime(r.mime),
      raw: r,
    });
  }

  for (const f of scan.orphanedDiskFiles) {
    const name = fileNameFromPath(f.storagePath);
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    items.push({
      key: `disk-${f.storagePath}`,
      category: "orphaned-disk",
      name,
      path: f.storagePath,
      size: f.size,
      mime: `application/${ext}`,
      isImage: isImageByExt(f.storagePath),
      raw: f,
    });
  }

  for (const u of scan.unusedFiles) {
    items.push({
      key: `unused-${u.id}`,
      category: "unused",
      name: u.originalName,
      path: u.storagePath,
      size: u.size,
      mime: u.mime,
      isImage: isImageMime(u.mime),
      raw: u,
    });
  }

  for (const d of scan.danglingImageRefs) {
    items.push({
      key: `ref-${d.entityType}-${d.entityId}-${d.field}`,
      category: "dangling-ref",
      name: `${d.entityType} → ${d.field}`,
      path: d.imagePath,
      size: 0,
      mime: "",
      isImage: isImageByExt(d.imagePath),
      raw: d,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

type TabKey = "all" | "orphaned-db" | "orphaned-disk" | "unused" | "dangling-ref";

const TABS: { key: TabKey; labelKey: string; icon: React.ElementType }[] = [
  { key: "all", labelKey: "common.all", icon: HardDrive },
  { key: "orphaned-db", labelKey: "settings.storage.orphanedDbRecords", icon: Database },
  { key: "orphaned-disk", labelKey: "settings.storage.orphanedDiskFiles", icon: FileIcon },
  { key: "unused", labelKey: "settings.storage.unusedFiles", icon: FileIcon },
  { key: "dangling-ref", labelKey: "settings.storage.danglingImageRefs", icon: Image },
];

// ---------------------------------------------------------------------------
// Grid Card
// ---------------------------------------------------------------------------

function ImageGridCard({
  issue,
  onRemove,
  isPending,
}: {
  issue: StorageIssue;
  onRemove: () => void;
  isPending: boolean;
}) {
  const imgUrl = issue.isImage ? fileUrl(issue.path) : null;
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      <div className="aspect-square w-full overflow-hidden bg-muted">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={issue.name}
            className="size-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <FileIcon className="size-10 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium" title={issue.name}>
          {issue.name}
        </p>
        <p className="truncate text-[10px] text-muted-foreground" title={issue.path}>
          {issue.path}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            {issue.category === "orphaned-db" && "DB"}
            {issue.category === "orphaned-disk" && "Disk"}
            {issue.category === "unused" && "Unused"}
            {issue.category === "dangling-ref" && "Ref"}
          </Badge>
          {issue.size > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {formatBytes(issue.size)}
            </span>
          )}
        </div>
      </div>
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-1.5 right-1.5 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
        disabled={isPending}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------

const columnHelper = createColumnHelper<StorageIssue>();

function useTableColumns(onRemove: (issue: StorageIssue) => void, isPending: boolean) {
  return useMemo(
    () => [
      columnHelper.accessor("isImage", {
        header: "",
        size: 40,
        cell: (info) => {
          const issue = info.row.original;
          if (!issue.isImage) return <FileIcon className="size-4 text-muted-foreground" />;
          return (
            <div className="size-8 overflow-hidden rounded border bg-muted">
              <img
                src={fileUrl(issue.path)}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            </div>
          );
        },
      }),
      columnHelper.accessor("category", {
        header: "Type",
        size: 90,
        cell: (info) => {
          const v = info.getValue();
          const map: Record<string, string> = {
            "orphaned-db": "DB Record",
            "orphaned-disk": "Disk File",
            unused: "Unused",
            "dangling-ref": "Dangling Ref",
          };
          return (
            <Badge variant="outline" className="text-xs">
              {map[v] ?? v}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => (
          <span className="truncate text-sm font-medium" title={info.getValue()}>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("path", {
        header: "Path",
        cell: (info) => (
          <span className="truncate text-xs text-muted-foreground" title={info.getValue()}>
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("size", {
        header: "Size",
        size: 80,
        cell: (info) => {
          const v = info.getValue();
          return v > 0 ? (
            <span className="text-xs text-muted-foreground">{formatBytes(v)}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        size: 48,
        cell: (info) => (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive"
            onClick={() => onRemove(info.row.original)}
            disabled={isPending}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ),
      }),
    ],
    [onRemove, isPending],
  );
}

// ---------------------------------------------------------------------------
// Virtualized Table
// ---------------------------------------------------------------------------

function VirtualizedTable({
  issues,
  onRemove,
  isPending,
}: {
  issues: StorageIssue[];
  onRemove: (issue: StorageIssue) => void;
  isPending: boolean;
}) {
  const columns = useTableColumns(onRemove, isPending);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollReady, setScrollReady] = useState(false);

  const setScrollRef = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    setScrollReady(Boolean(node));
  }, []);

  const table = useReactTable({
    data: issues,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  useMemo(() => {
    if (scrollReady && rows.length > 0) {
      virtualizer.scrollToIndex(0);
    }
  }, [scrollReady, rows.length, virtualizer]);

  return (
    <div
      ref={setScrollRef}
      className="h-[500px] overflow-auto rounded-lg border"
    >
      {/* Table header */}
      <div className="sticky top-0 z-10 flex border-b bg-muted/50 text-xs font-medium text-muted-foreground">
        {table.getHeaderGroups()[0].headers.map((header) => (
          <div
            key={header.id}
            className="flex items-center px-3 py-2"
            style={{ width: header.getSize() }}
          >
            {header.isPlaceholder
              ? null
              : flexRender(header.column.columnDef.header, header.getContext())}
          </div>
        ))}
      </div>

      {/* Virtual rows */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
          width: "100%",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={row.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 flex w-full border-b border-border/50 hover:bg-muted/30"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <div
                  key={cell.id}
                  className="flex items-center px-3 py-2 truncate"
                  style={{ width: cell.column.getSize() }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Virtualized Grid
// ---------------------------------------------------------------------------

function VirtualizedGrid({
  issues,
  onRemove,
  isPending,
}: {
  issues: StorageIssue[];
  onRemove: (issue: StorageIssue) => void;
  isPending: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollReady, setScrollReady] = useState(false);

  const setScrollRef = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    setScrollReady(Boolean(node));
  }, []);

  const COLS = 4;
  const GAP = 12;
  const CARD_HEIGHT = 220;

  const rows = useMemo(() => {
    const result: StorageIssue[][] = [];
    for (let i = 0; i < issues.length; i += COLS) {
      result.push(issues.slice(i, i + COLS));
    }
    return result;
  }, [issues]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_HEIGHT + GAP,
    overscan: 5,
  });

  useMemo(() => {
    if (scrollReady && rows.length > 0) {
      virtualizer.scrollToIndex(0);
    }
  }, [scrollReady, rows.length, virtualizer]);

  return (
    <div
      ref={setScrollRef}
      className="h-[600px] overflow-auto rounded-lg border p-3"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
          width: "100%",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowItems = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.index}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 grid w-full gap-3"
              style={{
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowItems.map((issue) => (
                <ImageGridCard
                  key={issue.key}
                  issue={issue}
                  onRemove={() => onRemove(issue)}
                  isPending={isPending}
                />
              ))}
              {/* Fill empty cells in last row */}
              {rowItems.length < COLS &&
                Array.from({ length: COLS - rowItems.length }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function StoragePage() {
  const t = useTranslations();
  const utils = trpc.useUtils();

  const { data: scan, isLoading } = trpc.settings.storage.scan.useQuery();

  const removeFile = trpc.settings.storage.removeFile.useMutation({
    onSuccess: () => {
      toast.success(t("settings.storage.recordRemoved"));
      utils.settings.storage.scan.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeDiskFile = trpc.settings.storage.removeDiskFile.useMutation({
    onSuccess: () => {
      toast.success(t("settings.storage.diskFileRemoved"));
      utils.settings.storage.scan.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeImageRef = trpc.settings.storage.removeImageRef.useMutation({
    onSuccess: () => {
      toast.success(t("settings.storage.refRemoved"));
      utils.settings.storage.scan.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const removeOrphanedRecords =
    trpc.settings.storage.removeOrphanedRecords.useMutation({
      onSuccess: (data) => {
        toast.success(
          t("settings.storage.removedCount", { count: data.removed }),
        );
        utils.settings.storage.scan.invalidate();
      },
      onError: (e) => toast.error(e.message),
    });

  const cleanAll = trpc.settings.storage.cleanAll.useMutation({
    onSuccess: (data) => {
      toast.success(
        t("settings.storage.removedCount", { count: data.total }),
      );
      utils.settings.storage.scan.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [confirmCleanAll, setConfirmCleanAll] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    issue: StorageIssue;
  } | null>(null);

  const allIssues = useMemo(
    () => (scan ? toIssueItems(scan) : []),
    [scan],
  );

  const filteredIssues = useMemo(() => {
    if (activeTab === "all") return allIssues;
    return allIssues.filter((i) => i.category === activeTab);
  }, [allIssues, activeTab]);

  // Separate for grid: images go to grid, non-images go to list
  const imageIssues = useMemo(
    () => filteredIssues.filter((i) => i.isImage),
    [filteredIssues],
  );
  const nonImageIssues = useMemo(
    () => filteredIssues.filter((i) => !i.isImage),
    [filteredIssues],
  );

  const totalIssues = allIssues.length;

  const isAnyPending =
    removeFile.isPending ||
    removeDiskFile.isPending ||
    removeImageRef.isPending ||
    removeOrphanedRecords.isPending;

  const handleRemove = useCallback(
    (issue: StorageIssue) => {
      setConfirmAction({ issue });
    },
    [],
  );

  const handleConfirmAction = useCallback(() => {
    if (!confirmAction) return;
    const { issue } = confirmAction;
    switch (issue.category) {
      case "orphaned-db":
      case "unused": {
        const raw = issue.raw as OrphanedDbRecord | UnusedFile;
        removeFile.mutate({ fileId: raw.id });
        break;
      }
      case "orphaned-disk":
        removeDiskFile.mutate({ storagePath: issue.path });
        break;
      case "dangling-ref": {
        const raw = issue.raw as DanglingImageRef;
        removeImageRef.mutate({
          entityType: raw.entityType as "Item" | "User" | "Organization",
          entityId: raw.entityId,
          field: raw.field,
        });
        break;
      }
    }
    setConfirmAction(null);
  }, [confirmAction, removeFile, removeDiskFile, removeImageRef]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {
      all: allIssues.length,
      "orphaned-db": 0,
      "orphaned-disk": 0,
      unused: 0,
      "dangling-ref": 0,
    };
    for (const i of allIssues) {
      counts[i.category]++;
    }
    return counts;
  }, [allIssues]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t("settings.storage.title")}
        description={t("settings.storage.description")}
      >
        {/* Summary bar */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2">
            <HardDrive className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {t("settings.storage.totalFiles")}: {scan?.totalFiles ?? 0}
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {formatBytes(scan?.totalSize ?? 0)}
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            {totalIssues === 0 ? (
              <CheckCircle2 className="size-4 text-green-600" />
            ) : (
              <AlertTriangle className="size-4 text-amber-600" />
            )}
            <span className="text-sm font-medium">
              {t("settings.storage.issuesFound")}: {totalIssues}
            </span>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => utils.settings.storage.scan.invalidate()}
              disabled={isLoading}
            >
              <RefreshCcw className="size-4 mr-1" />
              {t("settings.storage.scan")}
            </Button>
            {totalIssues > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmCleanAll(true)}
                disabled={cleanAll.isPending}
              >
                {cleanAll.isPending ? (
                  <Loader2 className="size-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="size-4 mr-1" />
                )}
                {t("settings.storage.cleanAll")}
              </Button>
            )}
          </div>
        </div>

        {/* No issues */}
        {totalIssues === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="size-10 text-green-600 mb-3" />
            <p className="text-sm font-medium">
              {t("settings.storage.noIssues")}
            </p>
          </div>
        )}

        {totalIssues > 0 && (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto border-b pb-px">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const count = tabCounts[tab.key];
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? "border-b-2 border-primary bg-muted/50 text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {t(tab.labelKey as any)}
                    {count > 0 && (
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                        {count}
                      </Badge>
                    )}
                  </button>
                );
              })}

              {/* View toggle */}
              <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="size-7"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3X3 className="size-3.5" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="size-7"
                  onClick={() => setViewMode("list")}
                >
                  <List className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            {filteredIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="size-8 text-green-600 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t("settings.storage.noIssues")}
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="space-y-4">
                {imageIssues.length > 0 && (
                  <VirtualizedGrid
                    issues={imageIssues}
                    onRemove={handleRemove}
                    isPending={isAnyPending}
                  />
                )}
                {nonImageIssues.length > 0 && (
                  <VirtualizedTable
                    issues={nonImageIssues}
                    onRemove={handleRemove}
                    isPending={isAnyPending}
                  />
                )}
              </div>
            ) : (
              <VirtualizedTable
                issues={filteredIssues}
                onRemove={handleRemove}
                isPending={isAnyPending}
              />
            )}
          </>
        )}
      </SectionCard>

      {/* Confirm dialog for individual actions */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.issue.category === "dangling-ref"
                ? t("settings.storage.confirmRemoveRef")
                : t("settings.storage.confirmRemoveRecord")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.thisActionCannotBeUndone")}
              {confirmAction && (
                <span className="mt-2 block text-xs text-foreground font-mono break-all">
                  {confirmAction.issue.path}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm dialog for clean all */}
      <AlertDialog open={confirmCleanAll} onOpenChange={setConfirmCleanAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings.storage.cleanAll")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.storage.cleanAllConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmCleanAll(false);
                cleanAll.mutate();
              }}
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
