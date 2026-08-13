import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/auth-server";
import DashboardLayoutClient from "@/layouts/dashboard/DashboardLayout";
import db from "@/lib/db";

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
