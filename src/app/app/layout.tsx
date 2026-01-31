"use server";
import { Auth } from "../../../controllers/Auth";
import { redirect } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export default async function App_layout(props: any) {
  if (!(await Auth.isAuthenticated())) {
    redirect("/auth");
  }
  return <App>{props.children}</App>;
}
