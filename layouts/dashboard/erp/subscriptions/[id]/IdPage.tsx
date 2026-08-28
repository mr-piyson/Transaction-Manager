"use client";

import {
  ArrowLeft,
  CalendarClock,
  Edit,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
  Trash,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { alert } from "@/components/Alert-dialog";
import { useHardDeleteForm } from "@/components/dialogs/hardDeleteForm";
import { useRenewalForm } from "@/components/dialogs/renewalForm";
import { useSubscriptionForm } from "@/components/dialogs/subscriptionForm";
import { SubscriptionDetail } from "@/components/subscriptions/subscription-detail";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { useAppAbility } from "@/hooks/use-app-ability";
import { trpc } from "@/lib/trpc/client";

export default function SubscriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useTranslations();
  const ability = useAppAbility();

  const { openEdit } = useSubscriptionForm();
  const { openCreate: openRenewal } = useRenewalForm();
  const { openDialog: openHardDelete } = useHardDeleteForm();
  const { data: me } = trpc.auth.me.useQuery();
  const isSuperAdmin = me?.platformRole === "SUPER_ADMIN";

  const canRenew = ability?.can("subscription:renew" as any, "Subscription");
  const canUpdate = ability?.can("subscription:update" as any, "Subscription");
  const canDelete = ability?.can("subscription:delete" as any, "Subscription");

  const {
    data: subscription,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.subscriptions.byId.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  const updateMutation = trpc.subscriptions.update.useMutation({
    onSuccess: () => {
      utils.subscriptions.byId.invalidate({ id: params.id });
      utils.subscriptions.list.invalidate();
      toast.success(t("subscriptions.updated"));
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.subscriptions.delete.useMutation({
    onSuccess: () => {
      utils.subscriptions.list.invalidate();
      toast.success(t("subscriptions.deleted"));
      router.push("/erp/subscriptions");
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending = updateMutation.isPending || deleteMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (isError || !subscription) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarClock className="size-6" />
            </EmptyMedia>
            <EmptyTitle>
              {isError ? t("common.failedToLoad") : t("common.notFound")}
            </EmptyTitle>
            <EmptyDescription>
              {error?.message ?? t("subscriptions.doesNotExist")}
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/erp/subscriptions")}
            >
              <ArrowLeft className="size-4 mr-1" /> {t("common.back")}
            </Button>
            {isError && (
              <Button onClick={() => refetch()}>{t("common.retry")}</Button>
            )}
          </div>
        </Empty>
      </div>
    );
  }

  const handleEdit = () => {
    openEdit(
      {
        id: subscription.id,
        name: subscription.name,
        vendor: subscription.vendor ?? undefined,
        url: subscription.url ?? "",
        description: subscription.description ?? undefined,
        notes: subscription.notes ?? undefined,
        billingCycle: subscription.billingCycle,
        customCycleDays: subscription.customCycleDays ?? undefined,
        amount: Number(subscription.amount),
        currency: subscription.currency,
        method: subscription.method,
        autoRenew: subscription.autoRenew,
        startDate: subscription.startDate
          ? new Date(subscription.startDate).toISOString().split("T")[0]
          : "",
        nextRenewalDate: subscription.nextRenewalDate
          ? new Date(subscription.nextRenewalDate).toISOString().split("T")[0]
          : "",
        alertDaysBefore: subscription.alertDaysBefore,
        categoryId: subscription.categoryId ?? undefined,
        departmentId: subscription.departmentId ?? undefined,
      },
      {
        onSuccess: () =>
          utils.subscriptions.byId.invalidate({ id: subscription.id }),
      },
    );
  };

  const handleRenew = () => {
    openRenewal(
      {
        id: subscription.id,
        name: subscription.name,
        amount: Number(subscription.amount),
        currency: subscription.currency,
        nextRenewalDate: subscription.nextRenewalDate,
      },
      {
        onSuccess: () =>
          utils.subscriptions.byId.invalidate({ id: subscription.id }),
      },
    );
  };

  const handleTogglePause = () => {
    const nextStatus = subscription.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    updateMutation.mutate({ id: subscription.id, status: nextStatus });
  };

  const handleDelete = () => {
    alert.delete({
      title: t("common.confirmDelete"),
      description: t("subscriptions.deleteConfirm"),
      confirmText: t("common.delete"),
      onConfirm: async () => {
        await deleteMutation.mutateAsync({ id: subscription.id });
      },
    });
  };

  const handleHardDelete = () => {
    openHardDelete(
      {
        kind: "subscription",
        id: subscription.id,
        title: subscription.name,
      },
      { onSuccess: () => router.push("/erp/subscriptions") },
    );
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-14 items-center gap-2 px-2 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/erp/subscriptions")}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CalendarClock className="size-5 text-muted-foreground shrink-0" />
          <h1 className="text-xl font-semibold truncate">
            {subscription.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {canRenew &&
            subscription.status !== "CANCELLED" &&
            subscription.status !== "EXPIRED" && (
              <Button size="sm" onClick={handleRenew}>
                <RefreshCw className="size-4 mr-1" />
                {t("subscriptions.recordRenewal")}
              </Button>
            )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdate && (
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="size-4" />
                  {t("common.edit")}
                </DropdownMenuItem>
              )}
              {canUpdate &&
                (subscription.status === "ACTIVE" ||
                  subscription.status === "PAUSED") && (
                  <DropdownMenuItem
                    onClick={handleTogglePause}
                    disabled={isPending}
                  >
                    {subscription.status === "ACTIVE" ? (
                      <>
                        <Pause className="size-4" />
                        {t("subscriptions.pause")}
                      </>
                    ) : (
                      <>
                        <Play className="size-4" />
                        {t("subscriptions.resume")}
                      </>
                    )}
                  </DropdownMenuItem>
                )}
              {canDelete && (
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isPending}
                  variant="destructive"
                >
                  <Trash className="size-4" />
                  {t("common.delete")}
                </DropdownMenuItem>
              )}
              {isSuperAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleHardDelete}
                    variant="destructive"
                  >
                    <ShieldAlert className="size-4" />
                    {t("hardDelete.menu")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <SubscriptionDetail subscription={subscription} />
    </div>
  );
}
