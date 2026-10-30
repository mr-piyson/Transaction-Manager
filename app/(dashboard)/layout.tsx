import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/auth-server";
import db from "@/lib/db";
import DashboardLayoutClient from "./dashboard-layout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await db.organization.count())) {
    redirect("/setup");
  }
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  const shortcuts = await db.userShortcut.findMany({
    where: { userId: user.id },
    select: { action: true, shortcut: true },
  });

  const customHotkeys = shortcuts.reduce<Record<string, string | null>>(
    (acc, row) => {
      acc[row.action] = row.shortcut;
      return acc;
    },
    {},
  );

  return (
    <DashboardLayoutClient customHotkeys={customHotkeys}>
      {children}
    </DashboardLayoutClient>
  );
}
