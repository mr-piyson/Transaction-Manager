"use server";
import SignInTab from "@/app/auth/SignIn";
import Logo from "@/components/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function Auth() {
  return (
    <div className="  relative  h-screen items-center  p-4">
      <div className=" relative flex items-center max-sm:justify-center max-[375]:justify-start! text-3xl font-medium gap-2">
        <Logo className="w-12 h-12" />
        <span className="max-[375px]:hidden">Transaction Manager</span>
      </div>
      <div className="w-full h-full flex flex-col  items-center pt-8 ">
        <Tabs
          defaultValue="Sign-In"
          className="flex flex-col w-90 max-[400px]:w-full"
        >
          <TabsList className="flex w-full ">
            <TabsTrigger value="Sign-In">Sign In</TabsTrigger>
          </TabsList>
          <TabsContent value="Sign-In">
            <SignInTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
