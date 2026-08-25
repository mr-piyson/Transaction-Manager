"use client";

import {
  Check,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { SectionCard } from "../_shared";

type Direction = "INCREASE" | "DECREASE";

const TYPES_BY_DIRECTION: Record<Direction, string[]> = {
  INCREASE: ["ADJUSTMENT_UP"],
  DECREASE: ["ADJUSTMENT_DOWN", "DAMAGE"],
};

export default function AdjustmentReasonsPage() {
  const t = useTranslations();
  const utils = trpc.useUtils();
  const { data: reasons, isLoading } = trpc.stock.reasons.list.useQuery();

  const [newName, setNewName] = useState("");
  const [newDirection, setNewDirection] = useState<Direction>("DECREASE");
  const [newType, setNewType] = useState("ADJUSTMENT_DOWN");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");

  const handleError = useCallback(
    (e: { message: string }) => toast.error(e.message),
    [],
  );

  const invalidate = useCallback(
    () => utils.stock.reasons.list.invalidate(),
    [utils],
  );

  const createReason = trpc.stock.reasons.create.useMutation({
    onSuccess: () => {
      invalidate();
      setNewName("");
    },
    onError: handleError,
  });

  const updateReason = trpc.stock.reasons.update.useMutation({
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    },
    onError: handleError,
  });

  const deleteReason = trpc.stock.reasons.delete.useMutation({
    onSuccess: invalidate,
    onError: handleError,
  });

  const reasonList = useMemo(() => reasons ?? [], [reasons]);

  const switchDirection = (dir: Direction) => {
    setNewDirection(dir);
    setNewType(TYPES_BY_DIRECTION[dir][0]);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t("stock.adjustments.reasonsTitle")}
        description={t("stock.adjustments.reasonsDesc")}
      >
        <div className="space-y-2">
          {reasonList.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("common.noResults")}
            </p>
          )}
          {reasonList.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border px-4 py-2.5"
            >
              {editingId === r.id ? (
                <>
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                    <Input
                      className="h-8 w-44"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          updateReason.mutate({
                            id: r.id,
                            name: editName,
                            movementType: editType as never,
                          });
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                    <Select
                      value={editType}
                      onValueChange={(v) => {
                        setEditType(v);
                        const dir =
                          v === "ADJUSTMENT_UP" ? "INCREASE" : "DECREASE";
                        updateReason.mutate({
                          id: r.id,
                          name: editName,
                          movementType: v as never,
                          ...(r.isSystem ? {} : { direction: dir }),
                        });
                        setEditingId(null);
                      }}
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(r.isSystem
                          ? [r.movementType as string]
                          : TYPES_BY_DIRECTION[r.direction]
                        ).map((mt) => (
                          <SelectItem key={mt} value={mt}>
                            {t(`stock.movementTypes.${mt}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() =>
                        updateReason.mutate({
                          id: r.id,
                          name: editName,
                          movementType: editType as never,
                        })
                      }
                      disabled={updateReason.isPending}
                    >
                      <Check className="size-3.5 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full",
                        r.direction === "DECREASE"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
                      )}
                    >
                      {r.direction === "DECREASE" ? (
                        <Plus className="size-3 rotate-45" />
                      ) : (
                        <Plus className="size-3" />
                      )}
                    </span>
                    <span
                      className="font-medium truncate cursor-pointer hover:text-primary"
                      onDoubleClick={() => {
                        setEditingId(r.id);
                        setEditName(r.name);
                        setEditType(r.movementType);
                      }}
                      title={t("common.edit")}
                    >
                      {r.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="hidden sm:inline-flex text-xs shrink-0"
                    >
                      {t(`stock.movementTypes.${r.movementType}`)}
                    </Badge>
                    {r.isSystem && (
                      <Badge
                        variant="secondary"
                        className="text-xs shrink-0 gap-1"
                      >
                        <ShieldCheck className="size-3" />
                        {t("stock.adjustments.system")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => {
                        setEditingId(r.id);
                        setEditName(r.name);
                        setEditType(r.movementType);
                      }}
                    >
                      <Pencil className="size-3.5 text-muted-foreground" />
                    </Button>
                    {!r.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => deleteReason.mutate({ id: r.id })}
                        disabled={deleteReason.isPending}
                      >
                        <Trash className="size-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new */}
        <div className="border-t mt-4 pt-4 space-y-3">
          <p className="text-sm font-medium">{t("common.add")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="h-8 w-44"
              placeholder={t("common.name")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim())
                  createReason.mutate({
                    name: newName.trim(),
                    direction: newDirection,
                    movementType: newType as never,
                  });
              }}
            />
            <Select
              value={newDirection}
              onValueChange={(v) => switchDirection(v as Direction)}
            >
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DECREASE">
                  {t("stock.adjustments.writeOffs")}
                </SelectItem>
                <SelectItem value="INCREASE">
                  {t("stock.adjustments.increases")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES_BY_DIRECTION[newDirection].map((mt) => (
                  <SelectItem key={mt} value={mt}>
                    {t(`stock.movementTypes.${mt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() =>
                createReason.mutate({
                  name: newName.trim(),
                  direction: newDirection,
                  movementType: newType as never,
                })
              }
              disabled={!newName.trim() || createReason.isPending}
            >
              <Plus className="size-4 mr-1" />
              {t("common.add")}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
