"use client";

import { Loader2, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FormPageScaffold } from "@/components/form/FormPageScaffold";
import { POFormBody } from "@/components/purchase-orders/POFormBody";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from "@/hooks/use-currency";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import type { POFormValues } from "@/lib/form/po/poFormSchema";
import { buildPOCreateDefaults, poToFormValues } from "@/lib/form/po/poMapper";
import { usePOFormController } from "@/lib/form/po/usePOFormController";
import { trpc } from "@/lib/trpc/client";

export function DocumentFormPage({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{ id?: string }>();
  const isEdit = mode === "edit";
  const id = params.id;

  const { data: suppliersData, isPending: suppliersPending } =
    trpc.suppliers.list.useQuery({});
  const { data: warehousesData, isPending: warehousesPending } =
    trpc.warehouses.list.useQuery({});
  const { currency: orgCurrency } = useCurrency();

  const detail = trpc.purchaseOrders.byId.useQuery(
    { id: id ?? "" },
    { enabled: isEdit && !!id, retry: false },
  );

  const masterReady = !suppliersPending && !warehousesPending;

  if (isEdit) {
    if (detail.isPending || !masterReady) return <FormSkeleton />;
    if (detail.isError || !detail.data) return <NotFoundState />;
    return (
      <POFormCore
        key={`edit-${detail.data.id}`}
        mode="edit"
        initialValues={poToFormValues(detail.data as any)}
        document={{ id: detail.data.id, version: detail.data.version ?? 0 }}
        serial={detail.data.serial}
        suppliersData={suppliersData}
        warehousesData={warehousesData}
      />
    );
  }

  if (!masterReady) return <FormSkeleton />;

  return (
    <POFormCore
      key="create"
      mode="create"
      initialValues={buildPOCreateDefaults(warehousesData, orgCurrency)}
      document={null}
      suppliersData={suppliersData}
      warehousesData={warehousesData}
    />
  );
}

function POFormCore({
  mode,
  initialValues,
  document,
  serial,
  suppliersData,
  warehousesData,
}: {
  mode: "create" | "edit";
  initialValues: POFormValues;
  document: { id: string; version?: number } | null;
  serial?: string | null;
  suppliersData?: any[];
  warehousesData?: any[];
}) {
  const t = useTranslations();
  const router = useRouter();

  const controller = usePOFormController({
    mode,
    initialValues,
    document,
    suppliersData,
    warehousesData,
    onSaved: (savedId) => {
      router.replace(`/erp/purchase-orders/${savedId}`);
    },
  });

  const { form, isPending, submitError, isEdit } = controller;

  useUnsavedChangesGuard(
    form.formState.isDirty,
    isPending,
    "purchaseOrders.unsavedChangesWarning",
  );

  const backHref = `/erp/purchase-orders${document?.id ? `/${document.id}` : ""}`;
  const title = isEdit
    ? t("purchaseOrders.editPO")
    : t("purchaseOrders.createPO");
  const subtitle = isEdit
    ? t("purchaseOrders.editPODesc")
    : t("purchaseOrders.createPODesc");

  return (
    <FormPageScaffold
      context={`po-form-${mode}`}
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      onSubmit={form.handleSubmit(controller.onSubmit)}
      isPending={isPending}
      submitLabel={
        isEdit
          ? t("purchaseOrders.saveChanges")
          : t("common.create", { type: t("purchaseOrders.title") })
      }
      errors={form.formState.errors as Record<string, any>}
      submitError={submitError}
      contentClassName="max-w-5xl"
      pageClassName="bg-muted/30"
      icon={ShoppingCart}
      isDirty={form.formState.isDirty}
    >
      <POFormBody controller={controller} serial={serial} />
    </FormPageScaffold>
  );
}

function NotFoundState() {
  const t = useTranslations();
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-3 pt-6 text-center">
          <h2 className="text-lg font-semibold">
            {t("purchaseOrders.doesNotExist")}
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/erp/purchase-orders">{t("common.back")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
