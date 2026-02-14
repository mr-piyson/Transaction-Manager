"use server";
import { redirect } from "next/navigation";
import App from "./App";
import { isAuthenticated } from "@controllers/auth.controller";

export default async function App_layout(props: any) {
  if (!(await isAuthenticated())) {
    redirect("/auth");
  }
  return <App>{props.children}</App>;
}
