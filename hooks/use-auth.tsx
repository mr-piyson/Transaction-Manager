'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import type { z } from 'zod';
import { toast } from 'sonner';
import { SignInSchema, SignUpSchema } from '@/lib/validators/auth';
import { Route } from 'next';
import { signIn, signUp, signOut, useSession } from '@/lib/auth-client';

export function useAuth() {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } = useSession();

  // Helper to handle navigation and cache invalidation after success
  const handleAuthSuccess = (message: string) => {
    toast.success(message);
    router.push('/app' as Route);
    router.refresh();
  };

  // Sign In Mutation
  const signInMutation = useMutation({
    mutationFn: async (data: z.infer<typeof SignInSchema>) => {
      const { data: result, error } = await signIn.email({
        email: data.email,
          password: data.password,
          callbackURL: "/app"
      });
      if (error) throw new Error(error.message || 'Failed to sign in');
      return result;
    },
    onSuccess: () => handleAuthSuccess('Signed in successfully!'),
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Sign Up Mutation
  const signUpMutation = useMutation({
    mutationFn: async (data: z.infer<typeof SignUpSchema>) => {
      const { data: result, error } = await signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
        callbackURL: "/app"
      });
      if (error) throw new Error(error.message || 'Failed to create account');
      return result;
    },
    onSuccess: () => handleAuthSuccess('Account created successfully!'),
    onError: (error: any) => {
        toast.error(error.message);
    },
  });

  // Sign Out Mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      await signOut();
    },
    onSuccess: () => {
      toast.success('Signed out successfully!');
      router.push('/auth' as Route);
      router.refresh();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to sign out');
    },
  });

  return {
    signIn: signInMutation.mutate,
    signUp: signUpMutation.mutate,
    signOut: signOutMutation.mutate,
    session,
    isLoading: signInMutation.isPending || signUpMutation.isPending || signOutMutation.isPending || isSessionLoading,
  };
}

