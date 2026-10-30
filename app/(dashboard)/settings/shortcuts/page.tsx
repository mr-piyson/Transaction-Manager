"use client";

import {
  type AppHotkeyId,
  useAppHotkeyList,
  useCustomHotkeys,
  useHotkeyRecorder,
} from "@tanstack/react-hotkeys";
import { Keyboard, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useHotkeyLabel } from "@/hooks/use-hotkey-label";
import { cn } from "@/lib/utils";
import { SectionCard } from "../_shared";

type ShortcutItem = ReturnType<typeof useAppHotkeyList>[number];

export default function ShortcutsSettingsPage() {
  const t = useTranslations();
  const items = useAppHotkeyList();
  const { resetCustomHotkeys } = useCustomHotkeys();

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t("settings.shortcuts.title")}
        description={t("settings.shortcuts.description")}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Keyboard className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>{t("settings.shortcuts.help")}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              resetCustomHotkeys();
              toast.success(t("settings.shortcuts.allReset"));
            }}
          >
            <RotateCcw className="size-4" />
            {t("settings.shortcuts.resetAll")}
          </Button>
        </div>
      </SectionCard>

      <SectionCard title={t("settings.shortcuts.actions")}>
        <div className="divide-y divide-border">
          {items.map((item) => (
            <ShortcutRow key={item.appHotkey.id} item={item} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function ShortcutRow({ item }: { item: ShortcutItem }) {
  const t = useTranslations();
  const { findConflicts, setCustomHotkey, resetCustomHotkey } =
    useCustomHotkeys();
  const appHotkey = item.appHotkey;
  const id = appHotkey.id as AppHotkeyId;

  const recorder = useHotkeyRecorder({
    validate: (hotkey) => {
      const [conflict] = findConflicts(id, hotkey);
      return conflict
        ? t("settings.shortcuts.conflict", {
            action: conflict.meta?.name ?? conflict.id,
          })
        : true;
    },
    onRecord: (hotkey) => {
      setCustomHotkey(id, hotkey);
      toast.success(t("settings.shortcuts.saved"));
    },
    onClear: () => {
      setCustomHotkey(id, null);
      toast.success(t("settings.shortcuts.unboundSaved"));
    },
  });

  const hotkey = appHotkey.hotkey;
  const hotkeyLabel = useHotkeyLabel(hotkey);

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">
            {appHotkey.meta?.name ?? appHotkey.id}
          </span>
          {item.isCustom && (
            <Badge variant="secondary" className="text-[10px]">
              {t("settings.shortcuts.custom")}
            </Badge>
          )}
        </div>
        {appHotkey.meta?.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {appHotkey.meta.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        <Kbd
          className={cn(
            "min-w-16 justify-center",
            !hotkey && "text-muted-foreground",
          )}
        >
          {hotkey ? (hotkeyLabel ?? "…") : t("settings.shortcuts.unbound")}
        </Kbd>
        <Button
          variant={recorder.isRecording ? "default" : "outline"}
          size="sm"
          onClick={recorder.startRecording}
          disabled={recorder.isRecording}
        >
          {recorder.isRecording
            ? t("settings.shortcuts.pressKeys")
            : t("settings.shortcuts.change")}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={t("settings.shortcuts.reset")}
          aria-label={t("settings.shortcuts.reset")}
          onClick={() => {
            resetCustomHotkey(id);
            toast.success(t("settings.shortcuts.resetDone"));
          }}
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </div>
  );
}
