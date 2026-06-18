'use client';

import { LogOut, Monitor, Smartphone, Trash, Globe, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/auth/auth-client';
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

function parseDeviceInfo(ua: string | null): { icon: typeof Monitor; label: string; os: string } {
  if (!ua) return { icon: Globe, label: 'Unknown', os: '' };
  const lower = ua.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad/i.test(lower);
  const isMac = /mac/i.test(lower);
  const isWindows = /windows/i.test(lower);
  const isLinux = /linux/i.test(lower);

  let os = '';
  if (isMac) os = 'macOS';
  else if (isWindows) os = 'Windows';
  else if (isLinux) os = 'Linux';
  else if (/android/i.test(lower)) os = 'Android';
  else if (/iphone|ipad/i.test(lower)) os = 'iOS';

  const browser = /chrome/i.test(lower) ? 'Chrome' :
    /firefox/i.test(lower) ? 'Firefox' :
    /safari/i.test(lower) ? 'Safari' :
    /edge/i.test(lower) ? 'Edge' : '';

  return {
    icon: isMobile ? Smartphone : Monitor,
    label: [browser, os].filter(Boolean).join(' · ') || 'Unknown',
    os,
  };
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function SessionsSettingsPage() {
  const { data: sessionsData, isLoading, refetch } =
    trpc.auth.listSessions.useQuery();
  const revokeSession = trpc.auth.revokeSession.useMutation({
    onSuccess: () => refetch(),
  });
  const revokeOther = trpc.auth.revokeOtherSessions.useMutation({
    onSuccess: () => refetch(),
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
        title="Active Sessions"
        description="Manage devices and sessions logged into your account."
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
                            'Current Device'}
                        </p>
                        <Badge
                          variant="default"
                          className="text-xs whitespace-nowrap"
                        >
                          Current
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {currentSession.ipAddress
                          ? `IP: ${currentSession.ipAddress}`
                          : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(currentSession.createdAt)}
                        {currentSession.expiresAt &&
                          ` · Expires ${formatTime(currentSession.expiresAt)}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {otherSessions.length === 0 && currentSession && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No other active sessions.
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
                        {info.label || 'Unknown Device'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {session.ipAddress
                          ? `IP: ${session.ipAddress}`
                          : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(session.createdAt)}
                        {session.expiresAt &&
                          ` · Expires ${formatTime(session.expiresAt)}`}
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
                    Revoke
                  </Button>
                </div>
              );
            })}

            {otherSessions.length > 0 && (
              <div className="flex justify-end pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => revokeOther.mutate()}
                  disabled={isLoadingMutation}
                >
                  <LogOut className="size-4 mr-1" />
                  Revoke all other sessions
                </Button>
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
