import { SplashScreen } from "@/components/Splash-Screen";
import App from "../../layouts/App/App";

export default async function Activity_Layout(props: any) {
  return (
    <SplashScreen>
      <App>{props.children}</App>
    </SplashScreen>
  );
}
