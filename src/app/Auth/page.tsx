import { redirect } from "next/navigation";
import Auth from "@/layouts/Auth/Auth";
import { isAuthenticated } from "@/lib/auth-server";

export default async function AuthPage() {
  if (await isAuthenticated()) return redirect("/App");
  return <Auth />;
}
