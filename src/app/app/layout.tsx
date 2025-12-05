import { SplashScreen } from "@/components/Splash-Screen";
import App from "../../components/App/App";
import { requireAuth } from "@/lib/auth/auth-server";

export default async function Activity_Layout(props: any) {
  await requireAuth();
  return (
    <SplashScreen>
      <App>{props.children}</App>
    </SplashScreen>
  );
}
