"use client";

import { Boxes } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type * as React from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Header } from "@/components/layout/App-Header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { value: "levels", href: "/erp/stock", exact: true },
  { value: "movements", href: "/erp/stock/movements", exact: false },
  { value: "adjustments", href: "/erp/stock/adjustments", exact: false },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function activeTab(pathname: string): TabValue {
  const match = TABS.find((tab) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href),
  );
  return match?.value ?? "levels";
}

export default function StockLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();

  const labels: Record<TabValue, string> = {
    levels: t("stock.levels"),
    movements: t("stock.movements"),
    adjustments: t("stock.adjustments.tab"),
  };

  return (
    <AuthGuard permission="stock:read" subject="Stock">
      <div className="flex h-screen flex-col overflow-hidden">
        <Header title={t("stock.title")} icon={<Boxes className="size-5" />} />
        <Tabs
          value={activeTab(pathname)}
          onValueChange={(value) => {
            const tab = TABS.find((tb) => tb.value === value);
            if (tab && tab.href !== pathname) {
              router.push(tab.href);
            }
          }}
        >
          <div className="w-full outline px-1">
            <TabsList className="bg-background shrink-0 rounded-none max-md:w-full">
              {TABS.map((tab) => (
                <TabsTrigger
                  className="data-[state=active]:bg-primary/90! data-[state=active]:text-primary-foreground!"
                  key={tab.value}
                  value={tab.value}
                >
                  {labels[tab.value]}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
        <div className="min-h-0 flex-1 w-full overflow-y-auto">{children}</div>
      </div>
    </AuthGuard>
  );
}
