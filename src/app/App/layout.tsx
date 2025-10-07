import React from "react";
import { getAccount } from "../Auth/auth.actions";
import { redirect } from "next/navigation";
import App from "../../layouts/Home/App";
import { SplashScreen } from "@/components/Splash-Screen";

export default async function Activity_Layout(props: any) {
  const account = await getAccount();
  if (!account) redirect("/Auth");
  return (
    <SplashScreen>
      <App>{props.children}</App>
    </SplashScreen>
  );
}
