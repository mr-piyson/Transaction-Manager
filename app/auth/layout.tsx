import { redirect } from "next/navigation";
import { getSession } from "@/auth/auth-server";

type AuthLayoutProps = {
	children?: React.ReactNode;
};

export default async function AuthLayout(props: AuthLayoutProps) {
	const session = await getSession();
	if (session) redirect("/erp");

	return <div>{props.children}</div>;
}
