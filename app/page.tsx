import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/auth/auth-server';
import db from '@/lib/db';

export default async function Page() {
  if (await db.organization.count()) {
    const user = await getCurrentUser();
    if (user) redirect('/erp');
  }

  const { default: LandingClient } = await import('@/components/landing/LandingClient');

  return <LandingClient />;
}
