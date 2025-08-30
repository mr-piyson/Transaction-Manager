import { redirect } from "next/navigation";
import { getAccount } from "./Auth/auth.actions";

export default async function Page(props: any) {
  const account = await getAccount();
  if (!account) redirect("/Auth");
  redirect("/App/");
}
