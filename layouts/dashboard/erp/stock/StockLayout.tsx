"use client";

import { Boxes } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type * as React from "react";
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
        <TabsList className="shrink-0 rounded-none border-b w-full">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {labels[tab.value]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="min-h-0 flex-1 w-full overflow-y-auto">{children}</div>
    </div>
  );
}
