'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

export default function DashboardNotFound() {
  const t = useTranslations();
  const router = useRouter();

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center gap-2 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0 px-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileQuestion className="size-5 text-muted-foreground shrink-0" />
          <h1 className="text-lg font-semibold truncate">{t('common.notFound')}</h1>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileQuestion className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{t('common.notFound')}</EmptyTitle>
            <EmptyDescription>
              The page you are looking for does not exist or has been moved.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="size-4 mr-1" />
            {t('common.goBack')}
          </Button>
        </Empty>
      </div>
    </div>
  );
}
