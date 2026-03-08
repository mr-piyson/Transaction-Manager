import { CustomerProfile } from "./customer-profile";

export default async function Page({
  params,
}: {
  params: { customerId: string };
}) {
  return <CustomerProfile customerId={(await params).customerId} />;
}
