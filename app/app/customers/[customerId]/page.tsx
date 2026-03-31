import { CustomerProfile } from './customer-profile';

type CustomerPageProps = {
  children?: React.ReactNode;
  params: Promise<{ customerId: string }>;
};

export default async function CustomerPage(props: CustomerPageProps) {
  return <CustomerProfile customerId={(await props.params).customerId} />;
}
