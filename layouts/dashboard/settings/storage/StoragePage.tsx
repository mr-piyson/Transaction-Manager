"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileIcon,
  HardDrive,
  Image,
  Loader2,
  RefreshCcw,
  Trash2,
  Unlink,
} from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useCallback, useMemo, useState } from "react";
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
  return storagePath;
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

type TabKey =
  | "all"
  | "orphaned-db"
  | "orphaned-disk"
  | "unused"
  | "dangling-ref";

const TABS: { key: TabKey; labelKey: string; icon: React.ElementType }[] = [
  { key: "all", labelKey: "common.all", icon: HardDrive },
  {
    key: "orphaned-db",
    labelKey: "settings.storage.orphanedDbRecords",
    icon: Database,
  },
  {
    key: "orphaned-disk",
    labelKey: "settings.storage.orphanedDiskFiles",
    icon: FileIcon,
  },
  { key: "unused", labelKey: "settings.storage.unusedFiles", icon: FileIcon },
  {
    key: "dangling-ref",
    labelKey: "settings.storage.danglingImageRefs",
    icon: Image,
  },
];

// ---------------------------------------------------------------------------
// Grid Card
// ---------------------------------------------------------------------------

function GridCard({
  issue,
  onRemove,
  isPending,
}: {
  issue: StorageIssue;
  onRemove: () => void;
  isPending: boolean;
}) {
  const imgUrl = issue.isImage ? fileUrl(issue.path) : null;
  const [imgError, setImgError] = useState(false);
  const showImage = imgUrl && !imgError;

  const overlayLabel =
    issue.category === "orphaned-db"
      ? "Missing File"
      : issue.category === "orphaned-disk"
        ? "No DB Record"
        : issue.category === "unused"
          ? "Unused"
          : "Broken Ref";

  const overlayIcon =
    issue.category === "dangling-ref" ? (
      <Unlink className="size-8 text-white/80" />
    ) : (
      <FileIcon className="size-8 text-white/80" />
    );

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      <div className="aspect-square w-full overflow-hidden bg-muted">
        {showImage ? (
          <>
            <img
              src={imgUrl}
              alt={issue.name}
              className="size-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              {overlayIcon}
              <span className="text-[11px] font-medium text-white/90 drop-shadow">
                {overlayLabel}
              </span>
            </div>
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5">
            {overlayIcon}
            <span className="text-[10px] text-muted-foreground/60 font-medium">
              {overlayLabel}
            </span>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium" title={issue.name}>
          {issue.name}
        </p>
        <p
          className="truncate text-[10px] text-muted-foreground"
          title={issue.path}
        >
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
      toast.success(t("settings.storage.removedCount", { count: data.total }));
      utils.settings.storage.scan.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [confirmCleanAll, setConfirmCleanAll] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    issue: StorageIssue;
  } | null>(null);

  const allIssues = useMemo(() => (scan ? toIssueItems(scan) : []), [scan]);

  const filteredIssues = useMemo(() => {
    if (activeTab === "all") return allIssues;
    return allIssues.filter((i) => i.category === activeTab);
  }, [allIssues, activeTab]);

  const totalIssues = allIssues.length;

  const isAnyPending =
    removeFile.isPending ||
    removeDiskFile.isPending ||
    removeImageRef.isPending ||
    removeOrphanedRecords.isPending;

  const handleRemove = useCallback((issue: StorageIssue) => {
    setConfirmAction({ issue });
  }, []);

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
                      <Badge
                        variant="secondary"
                        className="ml-1 text-[10px] px-1 py-0"
                      >
                        {count}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            {filteredIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="size-8 text-green-600 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {t("settings.storage.noIssues")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredIssues.map((issue) => (
                  <GridCard
                    key={issue.key}
                    issue={issue}
                    onRemove={() => handleRemove(issue)}
                    isPending={isAnyPending}
                  />
                ))}
              </div>
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
