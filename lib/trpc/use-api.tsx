import { useState, useCallback } from 'react';

// Custom event to notify the TrpcProvider when the URL changes
export const API_URL_CHANGE_EVENT = 'api-url-changed';

// Define the expected version (ideally mapped to your env variables)
const EXPECTED_API_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

export function useApiConfig() {
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeApiUrl = useCallback(async (newUrl: string) => {
    setIsTesting(true);
    setError(null);

    try {
      // Clean up the URL to prevent double slashes
      const baseUrl = newUrl.trim().replace(/\/+$/, '');

      // 1. Test the connection and fetch version metadata
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Connection failed with status: ${response.status}`);
      }

      const data = await response.json();

      // 2. Validate the API version against the client version
      if (data.version !== EXPECTED_API_VERSION) {
        throw new Error(
          `Version mismatch. Expected v${EXPECTED_API_VERSION}, but got v${data.version}`,
        );
      }

      // 3. Persist the validated tRPC path and notify the provider
      const trpcEndpoint = `${baseUrl}/api/trpc`;
      localStorage.setItem('custom_trpc_url', trpcEndpoint);
      window.dispatchEvent(new Event(API_URL_CHANGE_EVENT));

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown connection error occurred.');
      return false;
    } finally {
      setIsTesting(false);
    }
  }, []);

  return { changeApiUrl, isTesting, error };
}
