import { auth, getSession } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

type AuthLayoutProps = {
  children?: React.ReactNode;
};

export default async function AuthLayout(props: AuthLayoutProps) {
  const session = await getSession();
  if (session) redirect('/app');

  return <div>{props.children}</div>;
}
