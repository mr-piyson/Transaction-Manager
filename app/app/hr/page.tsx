'use client';

import { Users, Building2, Calendar, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Header } from '@/app/app/App-Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const modules = [
  { key: 'employees', icon: Users, href: '/app/hr/employees', color: 'bg-blue-500' },
  { key: 'departments', icon: Building2, href: '/app/hr/departments', color: 'bg-emerald-500' },
  { key: 'attendance', icon: Calendar, href: '/app/hr/attendance', color: 'bg-amber-500' },
  { key: 'leave', icon: Calendar, href: '/app/hr/leave', color: 'bg-purple-500' },
  { key: 'payroll', icon: Wallet, href: '/app/hr/payroll', color: 'bg-rose-500' },
] as const;

export default function HrDashboard() {
  const t = useTranslations();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12">
      <Header title={t('hr.title')} icon={<Users className="size-5" />} />

      <main className="flex-1 p-4 lg:p-8 space-y-8 max-w-360 mx-auto w-full">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-600/90 to-emerald-500/70 p-6 lg:p-8 text-primary-foreground shadow-2xl shadow-emerald-600/30">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_70%)]" />
          <div className="relative z-10">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              {t('hr.welcome')}
            </h1>
            <p className="mt-2 text-white/80 max-w-xl">
              {t('hr.welcomeDescription')}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.key} href={mod.href}>
                <Card className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 border-muted/60">
                  <CardHeader className="pb-2">
                    <div
                      className={`inline-flex size-10 items-center justify-center rounded-lg ${mod.color} text-white shadow-sm`}
                    >
                      <Icon className="size-5" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-base">{t(`hr.${mod.key}`)}</CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {t(`hr.${mod.key}Description`)}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="rounded-xl border border-muted/60 bg-card p-8 text-center">
          <h3 className="text-lg font-semibold text-muted-foreground">
            {t('hr.comingSoon')}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground/70">
            {t('hr.comingSoonDescription')}
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/app">{t('common.back')}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
