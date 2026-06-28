'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import SignInTab from '@/app/auth/SignIn';
import SignUpTab from '@/app/auth/SignUp';
import Logo from '@/components/Logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from '@/auth/auth-client';

export default function Auth() {
  const router = useRouter();
  const t = useTranslations();
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      router.push('/app');
    }
  }, [session, router]);

  return (
    <div className="relative items-center p-4 ">
      <div className=" relative flex items-center max-sm:justify-center max-[375]:justify-start! text-3xl font-medium gap-2">
        <Logo className="w-12 h-12" />
        <span className="max-[375px]:hidden">{t('layout.appName')}</span>
      </div>
      <div className="w-full h-full flex flex-col  items-center pt-10 ">
        <Tabs defaultValue="Sign-In" className="flex flex-col w-90 max-[400px]:w-full ">
          <TabsList className="flex w-full ">
            <TabsTrigger value="Sign-In">{t('auth.signIn')}</TabsTrigger>
            <TabsTrigger value="Sign-Up">{t('auth.signUp')}</TabsTrigger>
          </TabsList>
          <TabsContent value="Sign-In">
            <SignInTab />
          </TabsContent>
          <TabsContent value="Sign-Up">
            <SignUpTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
