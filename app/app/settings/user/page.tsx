'use client';

import { useTranslations } from 'next-intl';
import { useSession } from '@/auth/auth-client';
import { Input } from '@/components/ui/input';
import { Field, SectionCard } from '../_shared';

export default function UserSettingsPage() {
  const t = useTranslations();
  const session = useSession();
  const user = session.data?.user;

  if (!user) {
    return (
      <p className="text-muted-foreground text-sm">
        {t('errors.generic')}
      </p>
    );
  }

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t('auth.name')}
        description={t('common.details')}
      >
        <Field label={t('auth.name')}>
          <Input value={user.name ?? ''} readOnly />
        </Field>
        <Field label={t('auth.email')}>
          <Input value={user.email ?? ''} readOnly />
        </Field>
        <p className="text-sm text-muted-foreground">
          {t('common.description')}
        </p>
      </SectionCard>
    </div>
  );
}
