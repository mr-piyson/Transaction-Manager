'use client';

import { useTranslations } from 'next-intl';
import { LogOut, Monitor, Smartphone, Trash, Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useSession } from '@/auth/auth-client';
import { alert } from '@/components/Alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { SectionCard } from '../_shared';

interface SessionData {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function SessionsSettingsPage() {
  const t = useTranslations();

  function parseDeviceInfo(ua: string | null): { icon: typeof Monitor; label: string; os: string } {
    if (!ua) return { icon: Globe, label: t('common.unknown'), os: '' };
    const lower = ua.toLowerCase();
    const isMobile = /mobile|android|iphone|ipad/i.test(lower);
    const isMac = /mac/i.test(lower);
    const isWindows = /windows/i.test(lower);
    const isLinux = /linux/i.test(lower);

    let os = '';
    if (isMac) os = t('sessions.osMacos');
    else if (isWindows) os = t('sessions.osWindows');
    else if (isLinux) os = t('sessions.osLinux');
    else if (/android/i.test(lower)) os = t('sessions.osAndroid');
    else if (/iphone|ipad/i.test(lower)) os = t('sessions.osiOs');

    const browser = /chrome/i.test(lower) ? t('sessions.browserChrome') :
      /firefox/i.test(lower) ? t('sessions.browserFirefox') :
      /safari/i.test(lower) ? t('sessions.browserSafari') :
      /edge/i.test(lower) ? t('sessions.browserEdge') : '';

    return {
      icon: isMobile ? Smartphone : Monitor,
      label: [browser, os].filter(Boolean).join(' · ') || t('common.unknown'),
      os,
    };
  }

  const { data: sessionsData, isLoading, refetch } =
    trpc.auth.listSessions.useQuery();
  const revokeSession = trpc.auth.revokeSession.useMutation({
    onSuccess: () => { refetch(); toast.success(t('sessions.revoked')); },
    onError: (e) => toast.error(e.message),
  });
  const revokeOther = trpc.auth.revokeOtherSessions.useMutation({
    onSuccess: () => { refetch(); toast.success(t('sessions.revokedAll')); },
    onError: (e) => toast.error(e.message),
  });

  const session = useSession();
  const currentSessionToken = session.data?.session?.id;

  const sessions: SessionData[] = (sessionsData as unknown as SessionData[]) ?? [];

  const currentSession = sessions.find(
    (s) => s.id === currentSessionToken,
  );
  const otherSessions = sessions.filter(
    (s) => s.id !== currentSessionToken,
  );

  const isLoadingMutation =
    revokeSession.isPending || revokeOther.isPending;

  return (
    <div className="h-full space-y-6">
      <SectionCard
        title={t('sessions.title')}
        description={t('common.details')}
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {currentSession && (
              <div className="rounded-lg border-2 border-primary/40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    {(() => {
                      const info = parseDeviceInfo(
                        currentSession.userAgent,
                      );
                      const Icon = info.icon;
                      return <Icon className="size-5 mt-0.5 shrink-0" />;
                    })()}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">
                          {parseDeviceInfo(currentSession.userAgent).label ||
                            t('common.active')}
                        </p>
                        <Badge
                          variant="default"
                          className="text-xs whitespace-nowrap"
                        >
                          {t('sessions.currentSession')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {currentSession.ipAddress
                          ? t('sessions.ipLabel', { ip: currentSession.ipAddress })
                          : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(currentSession.createdAt)}
                        {currentSession.expiresAt &&
                          t('sessions.expiresLabel', { date: formatTime(currentSession.expiresAt) })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {otherSessions.length === 0 && currentSession && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('common.noResults')}
              </p>
            )}

            {otherSessions.map((session) => {
              const info = parseDeviceInfo(session.userAgent);
              const Icon = info.icon;
              return (
                <div
                  key={session.id}
                  className="flex items-start justify-between gap-4 rounded-lg border p-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Icon className="size-5 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {info.label || t('common.notSpecified')}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {session.ipAddress
                          ? t('sessions.ipLabel', { ip: session.ipAddress })
                          : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(session.createdAt)}
                        {session.expiresAt &&
                          t('sessions.expiresLabel', { date: formatTime(session.expiresAt) })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      revokeSession.mutate({ token: session.token })
                    }
                    disabled={isLoadingMutation}
                    className="shrink-0"
                  >
                    <Trash className="size-4 mr-1" />
                    {t('common.delete')}
                  </Button>
                </div>
              );
            })}

            {otherSessions.length > 0 && (
              <div className="flex justify-end pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    alert.delete({
                      title: t('sessions.revokeAll'),
                      description: t('sessions.revokeAllConfirm'),
                      confirmText: t('common.delete'),
                      onConfirm: async () => { await revokeOther.mutateAsync(); },
                    });
                  }}
                  disabled={isLoadingMutation}
                >
                  <LogOut className="size-4 mr-1" />
                  {t('sessions.revokeAll')}
                </Button>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
