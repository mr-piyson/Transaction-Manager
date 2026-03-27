'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import type { z } from 'zod';
import { toast } from 'sonner';
import axios from 'axios';
import { SignInSchema, SignUpSchema } from '@/lib/validators/auth';
import { Route } from 'next';

export function useAuth() {
  const router = useRouter();

  // Helper to handle navigation and cache invalidation after success
  const handleAuthSuccess = (message: string, slug?: string) => {
    toast.success(message);
    // Invalidate any 'user' or 'session' queries you might have
    // queryClient.invalidateQueries({ queryKey: ['session'] });
    const redirectPath = slug ? `/app` : '/app';
    router.push(redirectPath as Route);
    router.refresh();
  };

  // Sign In Mutation
  const signInMutation = useMutation({
    mutationFn: async (data: z.infer<typeof SignInSchema>) => {
      const response = await axios.post('/api/auth/signin', data);
      return response.data;
    },
    onSuccess: (data) => handleAuthSuccess('Signed in successfully!', data.user?.slug),
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to sign in';
      toast.error(message);
    },
  });

  // Sign Up Mutation
  const signUpMutation = useMutation({
    mutationFn: async (data: z.infer<typeof SignUpSchema>) => {
      const response = await axios.put('/api/auth/signup', data);
      return response.data;
    },
    onSuccess: (data) => handleAuthSuccess('Account created successfully!', data.user?.slug),
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to create account';
      toast.error(message);
    },
  });

  // Sign Out Mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      await axios.delete('/api/auth');
    },
    onSuccess: () => {
      // queryClient.clear(); // Clear all cached data on logout
      toast.success('Signed out successfully!');
      router.push('/auth');
      router.refresh();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to sign out';
      toast.error(message);
    },
  });

  return {
    signIn: signInMutation.mutate,
    signUp: signUpMutation.mutate,
    signOut: signOutMutation.mutate,
    // Combined loading state for any auth action
    isLoading: signInMutation.isPending || signUpMutation.isPending || signOutMutation.isPending,
  };
}
