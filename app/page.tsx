"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/auth/auth-client";

const LandingClient = dynamic(
  () => import("@/components/landing/LandingClient"),
  { ssr: false },
);

export default function RootPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;
    if (session) {
      router.replace("/erp");
    }
  }, [session, isPending, router]);

  if (isPending) return null;
  if (session) return null;

  return <LandingClient />;
}
