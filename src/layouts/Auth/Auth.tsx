"use server";
import SignInTab from "./SignIn";
import SignUpTab from "./SignUp";
import Logo from "@/components/Logo";
import { TabSwitcher } from "./TabSwitcher";

export default async function Auth(props: any) {
  
  return (
    <div className="  relative  h-screen items-center justify-center lg:grid  lg:grid-cols-2 ">
      <div className=" max-md:hidden flex justify-between relative h-full flex-col bg-muted-foreground p-10 text-card-foreground lg:flex dark:border-r sm:hidden">
        <div className="  absolute inset-0 bg-muted " />
        <div className=" relative z-20 flex items-center text-3xl font-medium gap-2">
          <Logo className="w-12 h-12" />
          <span>Transaction Manager</span>
        </div>
        {/* <ImageSlider /> */}
        <div className="relative z-20">
          <blockquote className="space-y-2">
            <p className="text-xl">
              &ldquo;Transaction Manager is a powerful tool designed to help you
              manage your financial transactions with ease and efficiency. It
              offers a seamless user experience and robust features to keep your
              finances in check.&rdquo;
            </p>
          </blockquote>
        </div>
      </div>
      <div className="w-full h-full flex flex-col justify-center items-center ">
        <TabSwitcher TabOne={<SignInTab />} TabTow={<SignUpTab />} />
      </div>
    </div>
  );
}
