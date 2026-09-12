"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { FormErrorBoundary } from "@/components/form/FormErrorBoundary";
import { FormErrorSummary } from "@/components/form/FormErrorSummary";
import { InvoiceFormBody } from "@/components/invoice/invoiceFormBody";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { InvoiceFormValues } from "@/lib/form/invoice/invoiceFormSchema";
import {
  buildCreateDefaults,
  invoiceToFormValues,
} from "@/lib/form/invoice/invoiceMapper";
import { useInvoiceFormController } from "@/lib/form/invoice/useInvoiceFormController";
import { trpc } from "@/lib/trpc/client";

export type DocumentKind = "invoices" | "quotations";

interface DocumentFormPageProps {
  mode: "create" | "edit";
  documentType: DocumentKind;
}

export function DocumentFormPage({
  mode,
  documentType,
}: DocumentFormPageProps) {
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit";
  const id = params.id;

  const sourceParam = searchParams.get("source");
  const sourceType = searchParams.get("sourceType");

  const { data: customersData, isPending: customersPending } =
    trpc.customers.list.useQuery({});
  const { data: warehousesData, isPending: warehousesPending } =
    trpc.warehouses.list.useQuery({});
  const { data: itemsData, isPending: itemsPending } = trpc.items.list.useQuery(
    { isSaleable: true },
  );
  const { data: orgData, isPending: orgPending } =
    trpc.settings.getOrg.useQuery();

  const detail = trpc.invoices.byId.useQuery(
    { id: id ?? "" },
    { enabled: isEdit && !!id, retry: false },
  );

  const source = trpc.invoices.byId.useQuery(
    { id: sourceParam ?? "" },
    { enabled: !isEdit && !!sourceParam, retry: false },
  );

  const masterReady =
    !customersPending && !warehousesPending && !itemsPending && !orgPending;

  if (isEdit) {
    if (detail.isPending || !masterReady) return <FormSkeleton />;
    if (detail.isError || !detail.data)
      return <NotFoundState documentType={documentType} />;
    return (
      <DocumentFormCore
        key={`edit-${detail.data.id}`}
        mode="edit"
        documentType={documentType}
        initialValues={invoiceToFormValues(detail.data)}
        document={{ id: detail.data.id, version: detail.data.version ?? 0 }}
        customersData={customersData}
        warehousesData={warehousesData}
        itemsData={itemsData}
        orgData={orgData}
      />
    );
  }

  // create mode
  if (!masterReady || (sourceParam && source.isPending))
    return <FormSkeleton />;
  if (sourceParam && (source.isError || !source.data)) {
    return <NotFoundState documentType={documentType} />;
  }

  let initialValues: InvoiceFormValues;
  if (sourceType === "creditNote" && source.data) {
    initialValues = buildCreateDefaults({
      documentType,
      warehousesData,
      org: orgData,
      source: { kind: "creditNote", invoice: source.data },
    });
  } else if (sourceType === "duplicate" && source.data) {
    initialValues = buildCreateDefaults({
      documentType,
      warehousesData,
      org: orgData,
      source: { kind: "duplicate", invoice: source.data },
    });
  } else {
    initialValues = buildCreateDefaults({
      documentType,
      warehousesData,
      org: orgData,
    });
  }

  return (
    <DocumentFormCore
      key={`create-${sourceParam ?? "blank"}-${sourceType ?? "none"}`}
      mode="create"
      documentType={documentType}
      initialValues={initialValues}
      document={null}
      customersData={customersData}
      warehousesData={warehousesData}
      itemsData={itemsData}
      orgData={orgData}
    />
  );
}

function DocumentFormCore({
  mode,
  documentType,
  initialValues,
  document,
  customersData,
  warehousesData,
  itemsData,
  orgData,
}: {
  mode: "create" | "edit";
  documentType: DocumentKind;
  initialValues: InvoiceFormValues;
  document: { id: string; version?: number } | null;
  customersData?: any[];
  warehousesData?: any[];
  itemsData?: any[];
  orgData?: unknown;
}) {
  const t = useTranslations();
  const router = useRouter();

  const controller = useInvoiceFormController({
    mode,
    initialValues,
    document,
    customersData,
    warehousesData,
    itemsData,
    orgData: orgData as
      | { defaultTermsText?: string | null; currency?: string }
      | null
      | undefined,
    onSaved: (savedId) => {
      router.replace(`/erp/documents/${documentType}/${savedId}`);
    },
  });

  const { form, isPending, submitError, isEdit } = controller;
  const invoiceType = form.watch("type");

  useUnsavedChangesGuard(form.formState.isDirty, isPending);

  const backHref = `/erp/documents/${documentType}${document?.id ? `/${document.id}` : ""}`;

  const isCreditNote = invoiceType === "CREDIT_NOTE";
  const title = isEdit
    ? t("invoices.editInvoice")
    : isCreditNote
      ? t("invoices.createCreditNote")
      : t("invoices.createInvoice");
  const subtitle = isEdit
    ? t("invoices.editInvoiceDesc")
    : isCreditNote
      ? t("invoices.createCreditNoteDesc")
      : t("invoices.createInvoiceDesc");

  const invoiceTypeOptions = [
    { value: "INVOICE", label: t("invoices.invoice") },
    { value: "QUOTE", label: t("invoices.quote") },
    { value: "CREDIT_NOTE", label: t("invoices.creditNote") },
    { value: "DELIVERY_NOTE", label: t("invoices.deliveryNote") },
  ];
  const typeLabel =
    invoiceTypeOptions.find((o) => o.value === invoiceType)?.label ??
    t("invoices.invoice");

  return (
    <FormErrorBoundary context={`invoice-form-${mode}`}>
      <form
        onSubmit={form.handleSubmit(controller.onSubmit)}
        noValidate
        className="flex h-full min-w-0 flex-col"
      >
        <header className="flex flex-wrap items-center gap-2 border-b bg-background px-4 py-3 sm:px-6">
          <Button asChild variant="ghost" size="icon" className="-ms-1">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold leading-tight">
              {title}
            </h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {subtitle}
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => router.push(backHref)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {isEdit
                ? t("invoices.saveChanges")
                : t("common.create", { type: typeLabel })}
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6 sm:px-6">
            <FormErrorSummary
              errors={form.formState.errors as Record<string, any>}
              submitError={submitError}
            />
            <InvoiceFormBody controller={controller} />
          </div>
        </div>

        <footer className="sticky bottom-0 border-t bg-background p-3 sm:hidden">
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {isEdit
              ? t("invoices.saveChanges")
              : t("common.create", { type: typeLabel })}
          </Button>
        </footer>
      </form>
    </FormErrorBoundary>
  );
}

function useUnsavedChangesGuard(isDirty: boolean, isPending: boolean) {
  const t = useTranslations();

  React.useEffect(() => {
    if (!isDirty || isPending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, isPending]);

  React.useEffect(() => {
    if (!isDirty || isPending) return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest(
        "a",
      ) as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (!window.confirm(t("invoices.unsavedChangesWarning"))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty, isPending, t]);
}

function NotFoundState({ documentType }: { documentType: DocumentKind }) {
  const t = useTranslations();
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-3 pt-6 text-center">
          <h2 className="text-lg font-semibold">
            {t("invoices.documentNotFound")}
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/erp/documents/${documentType}`}>
              {t("common.back")}
            </Link>
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
