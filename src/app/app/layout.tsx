"use server";
import { SplashScreen } from "@/components/Splash-Screen";
import App from "../../components/App/App";
import { Auth } from "@/controllers/Auth";
import { redirect } from "next/navigation";

export default async function Activity_Layout(props: any) {
  if (!(await Auth.isAuthenticated())) {
    redirect("/auth");
  }
  return (
    <SplashScreen>
      <App>{props.children}</App>
    </SplashScreen>
  );
}
