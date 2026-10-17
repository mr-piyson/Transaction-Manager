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

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
