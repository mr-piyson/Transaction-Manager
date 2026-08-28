"use client";

import { UserPlus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCustomerForm } from "@/components/dialogs";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

export default function CustomersPage() {
  const { openCreate } = useCustomerForm();
  const t = useTranslations();
  const { data, isPending } = trpc.customers.list.useQuery({});

  const hasCustomers = (data?.length ?? 0) > 0;

  return (
    <div className="flex h-full items-center justify-center p-8">
      {isPending ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
          <Skeleton className="size-10 rounded-lg" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      ) : (
        <Empty className="w-full max-w-xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{t("customers.title")}</EmptyTitle>
            <EmptyDescription>
              {hasCustomers
                ? t("customers.selectDescription")
                : t("customers.firstDescription")}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="lg" onClick={() => openCreate()}>
              <UserPlus className="size-4" />
              {hasCustomers
                ? t("customers.createCustomer")
                : t("customers.firstCustomer")}
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
