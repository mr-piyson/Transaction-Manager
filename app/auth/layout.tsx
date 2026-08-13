import { redirect } from "next/navigation";
import { getSession } from "@/auth/auth-server";
import AuthLayoutClient from "@/layouts/auth/AuthLayout";

export default async function AuthLayout({
	children,
}: {
	children?: React.ReactNode;
}) {
	const session = await getSession();
	if (session) redirect("/erp");

	return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
