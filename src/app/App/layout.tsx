import React from "react";
import App from "../../layouts/App/App";
import { SplashScreen } from "@/components/Splash-Screen";

export default async function Activity_Layout(props: any) {
  return (
    <SplashScreen>
      <App>{props.children}</App>
    </SplashScreen>
  );
}
