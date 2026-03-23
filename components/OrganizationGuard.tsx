'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useCheckOrganization } from '@/hooks/data/use-organization';

export function OrganizationGuard({ children }: { children: React.ReactNode }) {
  const { data: hasOrganization, isLoading } = useCheckOrganization();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && hasOrganization === false && pathname !== '/setup') {
      router.push('/setup');
    } else if (
      !isLoading &&
      hasOrganization === true &&
      pathname === '/setup'
    ) {
      // If they somehow navigate to setup but an org exists, send them to dashboard
      router.push('/auth');
    }
  }, [hasOrganization, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Prevent rendering children if we are about to redirect
  if (hasOrganization === false && pathname !== '/setup') return null;

  return <>{children}</>;
}
