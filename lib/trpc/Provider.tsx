'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState, useEffect, useMemo } from 'react';
import { trpc } from './client';
import superjson from 'superjson';
import { API_URL_CHANGE_EVENT } from './use-api'; // Adjust the import path

export default function TrpcProvider({ children }: { children: React.ReactNode }) {
  // Default to the relative path, updating if a custom one exists
  const [apiUrl, setApiUrl] = useState('/api/trpc');

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
          },
        },
      }),
  );

  // Sync the API URL with localStorage and listen for dynamic updates
  useEffect(() => {
    const syncUrl = () => {
      const storedUrl = localStorage.getItem('custom_trpc_url');
      if (storedUrl) setApiUrl(storedUrl);
    };

    // Run on initial mount
    syncUrl();

    // Listen for successful validations from the useApiConfig hook
    window.addEventListener(API_URL_CHANGE_EVENT, syncUrl);
    return () => window.removeEventListener(API_URL_CHANGE_EVENT, syncUrl);
  }, []);

  // Re-instantiate the tRPC client dynamically whenever apiUrl changes
  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: apiUrl,
            transformer: superjson,
          }),
        ],
      }),
    [apiUrl],
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
