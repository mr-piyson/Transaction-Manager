"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SignInSchema } from "@/app/auth/SignIn";
import type { SignUpSchema } from "@/app/auth/SignUp";
import type { z } from "zod";
import { toast } from "sonner";
import axios from "axios";

export function useAuth() {
  const router = useRouter();
  const [isLoading, setLoading] = useState(false);

  const handleSignIn = async (data: z.infer<typeof SignInSchema>) => {
    try {
      setLoading(true);
      const { data: result, status } = await axios.post("/api/auth", data);

      if (status === 200) {
        toast.success("Signed in successfully!");
        router.push("/app");
        router.refresh();
      } else if (status !== 200) {
        toast.error(result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || "Failed to sign in"
        : "An unexpected error occurred";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (data: z.infer<typeof SignUpSchema>) => {
    try {
      setLoading(true);
      const res = await axios.put("/api/auth", data).then((res) => res.data);

      if (res.status === 200) {
        toast.success("Account created successfully!");
        router.push("/app");
        router.refresh();
      } else if (res.error) {
        toast.error(res.error);
      }

      return res;
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || "Failed to create account"
        : "An unexpected error occurred";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await axios.delete("/api/auth");
      toast.success("Signed out successfully!");
      router.push("/auth");
      router.refresh();
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || "Failed to sign out"
        : "An unexpected error occurred";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    isLoading,
  };
}
