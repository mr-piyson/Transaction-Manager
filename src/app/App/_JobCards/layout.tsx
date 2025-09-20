import { getAccount } from "@/app/Auth/auth.actions";

export default async function JobCardLayout(props: any) {
  props.params.account = getAccount();
  return <>{props.children}</>;
}
