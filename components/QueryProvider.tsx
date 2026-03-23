// @/components/QueryProvider.tsx
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Since this is a Client Component, getQueryClient()
  // returns the singleton browserQueryClient.
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
