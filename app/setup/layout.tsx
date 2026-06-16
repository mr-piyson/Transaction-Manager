import { redirect } from 'next/navigation';
import db from '@/lib/db';

type SetupLayoutProps = {
  children?: React.ReactNode;
};

export default async function SetupLayout(props: SetupLayoutProps) {
  if (await db.organization.count()) {
    redirect('/');
  }
  return <main>{props.children}</main>;
}
