"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useSession } from "@/auth/auth-client";
import Logo from "@/components/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SignInTab from "@/layouts/auth/SignIn";

function sanitizeCallbackUrl(url: string | null): string {
  if (!url || !url.startsWith("/") || url.startsWith("//")) {
    return "/erp";
  }
  return url;
}

export default function Auth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const { data: session } = useSession();

  const callbackUrl = sanitizeCallbackUrl(
    searchParams.get("callbackUrl"),
  );

  useEffect(() => {
    if (session) {
      router.push(callbackUrl);
    }
  }, [session, router, callbackUrl]);

  return (
    <div className="relative items-center p-4 ">
      <div className=" relative flex items-center max-sm:justify-center max-[375]:justify-start! text-3xl font-medium gap-2">
        <Logo className="w-12 h-12" />
        <span className="max-[375px]:hidden">{t("layout.appName")}</span>
      </div>
      <div className="w-full h-full flex flex-col  items-center pt-10 ">
        <Tabs
          defaultValue="Sign-In"
          className="flex flex-col w-90 max-[400px]:w-full "
        >
          <TabsList className="flex w-full ">
            <TabsTrigger value="Sign-In">{t("auth.signIn")}</TabsTrigger>
          </TabsList>
          <TabsContent value="Sign-In">
            <SignInTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
