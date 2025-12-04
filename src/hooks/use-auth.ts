// src/hooks/useAuth.ts
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { SignInSchema } from "@/components/Auth/SignIn";
import type { SignUpSchema } from "@/components/Auth/SignUp";
import type { z } from "zod";
import { signIn, signOut, signUp } from "@/lib/auth-server";
import { toast } from "sonner";

export function useAuth() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignIn = async (data: z.infer<typeof SignInSchema>) => {
    const result = await signIn(data);

    if (result.success) {
      toast.success("Signed in successfully!");
      startTransition(() => {
        router.push("/app");
        router.refresh();
      });
    }

    if (result.error) {
      toast.error(result.error);
    }

    return result;
  };

  const handleSignUp = async (data: z.infer<typeof SignUpSchema>) => {
    const result = await signUp(data);

    if (result.success) {
      toast.success("Account created successfully!");
      startTransition(() => {
        router.push("/app");
        router.refresh();
      });
    }
    if (result.error) {
      toast.error(result.error);
    }

    return result;
  };

  const handleSignOut = async () => {
    startTransition(async () => {
      await signOut();
      toast.success("Signed out successfully!");
      router.push("/auth");
      router.refresh();
    });
  };

  return {
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    isPending,
  };
}
