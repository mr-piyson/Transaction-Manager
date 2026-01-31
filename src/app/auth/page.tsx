"use server";
import SignInTab from "@/app/auth/SignIn";
import SignUpTab from "@/app/auth/SignUp";
import { TabSwitcher } from "@/app/auth/TabSwitcher";
import Logo from "@/components/Logo";

export default async function Auth() {
  return (
    <div className="  relative  h-screen items-center justify-center lg:grid  lg:grid-cols-2 ">
      <div className=" max-md:hidden flex justify-between relative h-full flex-col bg-muted-foreground p-10 text-card-foreground lg:flex dark:border-r sm:hidden">
        <div className="  absolute inset-0 bg-muted " />
        <div className=" relative z-20 flex items-center text-3xl font-medium gap-2">
          <Logo className="w-12 h-12" />
          <span>Transaction Manager</span>
        </div>
        {/* <ImageSlider /> */}
        <div className="relative z-20"></div>
      </div>
      <div className="w-full h-full flex flex-col justify-center items-center ">
        <TabSwitcher TabOne={<SignInTab />} TabTow={<SignUpTab />} />
      </div>
    </div>
  );
}
