import Auth from "@/components/Auth/Auth";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/app");
  }
  return <Auth />;
}
