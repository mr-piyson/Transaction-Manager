import { checkOrganization } from '@/server/organizations';
import { redirect } from 'next/navigation';

type SetupLayoutProps = {
  children?: React.ReactNode;
};

export default async function SetupLayout(props: SetupLayoutProps) {
  if (await checkOrganization()) {
    redirect('/');
  }
  return <main>{props.children}</main>;
}
