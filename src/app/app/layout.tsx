"use server";
import { Auth } from "@controllers/Auth";
import { redirect } from "next/navigation";
import App from "./App";

export default async function App_layout(props: any) {
  if (!(await Auth.isAuthenticated())) {
    redirect("/auth");
  }
  return <App>{props.children}</App>;
}
