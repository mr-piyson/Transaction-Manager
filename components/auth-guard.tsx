"use client";

import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Action, SubjectName } from "@/lib/abilities";
import { useAppAbility } from "@/hooks/use-app-ability";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface AuthGuardProps {
  permission: Action;
  subject: SubjectName;
  children: React.ReactNode;
}

export function AuthGuard({ permission, subject, children }: AuthGuardProps) {
  const ability = useAppAbility();
  const router = useRouter();
  const t = useTranslations();

  if (ability === null) return null;

  if (!ability.can(permission, subject)) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <div className="flex flex-1 items-center justify-center p-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldAlert className="size-6" />
              </EmptyMedia>
              <EmptyTitle>{t("common.accessDenied")}</EmptyTitle>
              <EmptyDescription>
                {t("common.unauthorized")}
              </EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => router.back()}>
              {t("common.goBack")}
            </Button>
          </Empty>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
