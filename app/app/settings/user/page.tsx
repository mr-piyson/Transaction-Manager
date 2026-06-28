'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/auth/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc/client';
import { Field, SectionCard } from '../_shared';

export default function UserSettingsPage() {
  const t = useTranslations();
  const { data: sessionData, refetch } = useSession();
  const user = sessionData?.user;

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    name: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: (user as any).firstName ?? '',
        lastName: (user as any).lastName ?? '',
        name: user.name ?? '',
      });
    }
  }, [user]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success(t('common.itemSaved'));
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success(t('common.itemSaved'));
      setPasswordForm({ currentPassword: '', newPassword: '' });
    },
    onError: (e) => toast.error(e.message),
  });

  if (!user) {
    return (
      <p className="text-muted-foreground text-sm">
        {t('errors.generic')}
      </p>
    );
  }

  const hasProfileChanges =
    profile.firstName !== ((user as any).firstName ?? '') ||
    profile.lastName !== ((user as any).lastName ?? '') ||
    profile.name !== (user.name ?? '');

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      name: profile.name || undefined,
      firstName: profile.firstName || undefined,
      lastName: profile.lastName || undefined,
    });
  };

  const handleChangePassword = () => {
    if (!passwordForm.currentPassword || passwordForm.currentPassword.length < 8) {
      toast.error(t('errors.minLength', { field: t('auth.password'), min: 8 }));
      return;
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
      toast.error(t('errors.minLength', { field: t('users.newPassword'), min: 8 }));
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const initial = ((user as any).firstName ?? user.name ?? '')[0]?.toUpperCase() ?? '?';

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t('auth.name')}
        description={t('common.details')}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-semibold shrink-0">
            {initial}
          </div>
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <Field label={t('auth.name')}>
          <Input
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </Field>
        <Field label="First Name">
          <Input
            value={profile.firstName}
            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
          />
        </Field>
        <Field label="Last Name">
          <Input
            value={profile.lastName}
            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
          />
        </Field>
        <Field label={t('auth.email')}>
          <Input value={user.email ?? ''} readOnly />
        </Field>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSaveProfile}
            disabled={!hasProfileChanges || updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending && (
              <Loader2 className="size-4 mr-2 animate-spin" />
            )}
            {t('common.save')}
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title={t('auth.password')}
        description={t('common.description')}
      >
        <Field label={t('auth.password')}>
          <Input
            type="password"
            placeholder="Current password"
            value={passwordForm.currentPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
            }
          />
        </Field>
        <Field label={t('users.newPassword')}>
          <Input
            type="password"
            placeholder="New password"
            value={passwordForm.newPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, newPassword: e.target.value })
            }
          />
        </Field>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleChangePassword}
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending && (
              <Loader2 className="size-4 mr-2 animate-spin" />
            )}
            {t('common.save')}
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
