'use client';

import { useMemo } from 'react';
import { type Action, type AppAbilityType, defineAbilitiesFor } from '@/lib/abilities';
import { trpc } from '@/lib/trpc/client';

export function useAppAbility(): AppAbilityType | null {
  const { data: me, isLoading } = trpc.auth.me.useQuery();

  return useMemo(() => {
    if (isLoading || !me) return null;

    return defineAbilitiesFor({
      id: me.id,
      platformRole: me.platformRole as any,
      orgRole: me.orgRole ?? undefined,
      organizationId: me.organizationId ?? undefined,
      permissions: (me.permissionsList as any[])?.map((p: any) => p.code as Action) ?? [],
    });
  }, [me, isLoading]);
}
