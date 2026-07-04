'use client';

import { CheckCircle2, Crown, Loader2, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const { data: me, isLoading: meLoading } = trpc.auth.me.useQuery();

  const groupedPermissions = useMemo(() => {
    if (!me?.permissionsList) return {};
    return (me.permissionsList as any[]).reduce<Record<string, any[]>>((acc, p: any) => {
      const module = p.module || 'Other';
      if (!acc[module]) acc[module] = [];
      acc[module].push(p);
      return acc;
    }, {});
  }, [me?.permissionsList]);


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
    onSuccess: useCallback(() => {
      toast.success(t('common.itemSaved'));
      refetch();
    }, [t, refetch]),
    onError: useCallback((e: { message: string }) => toast.error(e.message), []),
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: useCallback(() => {
      toast.success(t('common.itemSaved'));
      setPasswordForm({ currentPassword: '', newPassword: '' });
    }, [t]),
    onError: useCallback((e: { message: string }) => toast.error(e.message), []),
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

  const handleSaveProfile = useCallback(() => {
    updateProfileMutation.mutate({
      name: profile.name || undefined,
      firstName: profile.firstName || undefined,
      lastName: profile.lastName || undefined,
    });
  }, [profile, updateProfileMutation]);

  const handleChangePassword = useCallback(() => {
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
  }, [passwordForm, t, changePasswordMutation]);

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
          onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
        />
      </Field>
      <Field label="First Name">
        <Input
          value={profile.firstName}
          onChange={(e) => setProfile((prev) => ({ ...prev, firstName: e.target.value }))}
        />
      </Field>
      <Field label="Last Name">
        <Input
          value={profile.lastName}
          onChange={(e) => setProfile((prev) => ({ ...prev, lastName: e.target.value }))}
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
              setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
            }
          />
        </Field>
        <Field label={t('users.newPassword')}>
          <Input
            type="password"
            placeholder="New password"
            value={passwordForm.newPassword}
            onChange={(e) =>
              setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
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

      <SectionCard
        title={t('users.role')}
        description="View your organization role and active permissions."
      >
        {meLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Role Header Banner */}
            <div className="flex items-start gap-4 p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
              <div
                className="flex size-12 items-center justify-center rounded-xl text-white text-xl font-bold shrink-0 shadow-md transition-all hover:scale-105"
                style={{ backgroundColor: me?.roleDetails?.color ?? '#6366f1' }}
              >
                {(() => {
                  const iconMap: Record<string, string> = {
                    shield: '🛡',
                    crown: '👑',
                    eye: '👁',
                    briefcase: '💼',
                    calculator: '📊',
                    package: '📦',
                    'trending-up': '📈',
                  };
                  if (me?.platformRole === 'SUPER_ADMIN') return '⚡';
                  if (me?.roleDetails?.systemKey === 'OWNER') return '👑';
                  if (me?.roleDetails?.systemKey === 'ADMIN') return '🛡';
                  return me?.roleDetails?.icon ? iconMap[me.roleDetails.icon] ?? '⚙' : '👤';
                })()}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
                  <span>{me?.roleDetails?.name ?? me?.roleName}</span>
                  {me?.roleDetails?.isSystem && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {t('common.system')}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {me?.roleDetails?.description ?? (
                    me?.roleDetails?.systemKey === 'OWNER'
                      ? 'Owner of the organization. Full unrestricted access to all resources.'
                      : me?.roleDetails?.systemKey === 'ADMIN'
                      ? 'Administrator role. Full access to manage resources and settings.'
                      : me?.platformRole === 'SUPER_ADMIN'
                      ? 'Platform Super Admin with absolute root privileges across all systems.'
                      : 'System assigned role with specific operational permissions.'
                  )}
                </p>
              </div>
            </div>

            {/* Special Banner for Owner / SuperAdmin */}
            {(me?.platformRole === 'SUPER_ADMIN' || me?.roleDetails?.systemKey === 'OWNER') && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-medium">
                <Crown className="size-5 shrink-0 animate-pulse text-amber-500" />
                <span>
                  {me?.platformRole === 'SUPER_ADMIN'
                    ? 'Platform Super Admin: You have absolute read/write access across all tenants.'
                    : 'Organization Owner: You have full administrative capabilities within this organization.'}
                </span>
              </div>
            )}

            {/* Permissions List */}
            {me?.permissionsList && me.permissionsList.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  {t('users.permissionsByModule')}
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <div
                      key={module}
                      className="rounded-xl border bg-muted/20 p-4 space-y-2.5 hover:bg-muted/30 transition-all duration-200"
                    >
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5 flex items-center justify-between">
                        <span>{module}</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                          {perms.length}
                        </span>
                      </h5>
                      <ul className="space-y-2">
                        {perms.map((perm) => (
                          <li key={perm.code} className="flex items-start gap-2 text-sm leading-snug">
                            <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-medium text-foreground text-xs sm:text-sm">{perm.label}</div>
                              {perm.description && (
                                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-normal">
                                  {perm.description}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground text-sm flex flex-col items-center gap-2">
                <Shield className="size-8 text-muted-foreground/40" />
                <span>{t('users.noPermissions')}</span>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

