import Auth from "@/layouts/Auth/Auth";
import { isAuthenticated } from "@/lib/auth-server";
import { redirect } from "next/navigation";

type AuthPageProps = {
  children?: React.ReactNode;
};

export default async function AuthPage(props: AuthPageProps) {
  if (await isAuthenticated()) redirect("/App");
  return <Auth />;
}
