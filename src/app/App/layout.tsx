import React from "react";
import App from "../../layouts/Home/App";
import { SplashScreen } from "@/components/Splash-Screen";

export default async function Activity_Layout(props: any) {
  return (
    <SplashScreen>
      <App>{props.children}</App>
    </SplashScreen>
  );
}
