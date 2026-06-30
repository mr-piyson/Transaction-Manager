'use client';

import { Handshake } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Header } from '@/components/layout/App-Header';
import { Button } from '@/components/ui/button';

export default function CrmDashboard() {
  const t = useTranslations();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/20 pb-12">
      <Header title="CRM" icon={<Handshake className="size-5" />} />

      <main className="flex-1 p-4 lg:p-8 space-y-8 max-w-360 mx-auto w-full">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-600/90 to-violet-500/70 p-6 lg:p-8 text-primary-foreground shadow-2xl shadow-violet-600/30">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_70%)]" />
          <div className="relative z-10">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">CRM</h1>
            <p className="mt-2 text-white/80 max-w-xl">
              Customer Relationship Management
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-muted/60 bg-card p-12 text-center">
          <Handshake className="size-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-2xl font-semibold text-muted-foreground mb-2">
            {t('hr.comingSoon')}
          </h3>
          <p className="text-muted-foreground/70 max-w-md mx-auto mb-6">
            {t('hr.comingSoonDescription')}
          </p>
          <Button variant="outline" asChild>
            <Link href="/erp">{t('common.back')}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
