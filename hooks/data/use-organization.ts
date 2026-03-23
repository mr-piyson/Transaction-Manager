import { SetupData } from '@/app/setup/setup-types';
import { getQueryClient } from '@/lib/query-client';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';

export function useCheckOrganization() {
  return useQuery({
    queryKey: ['organizationStatus'],
    queryFn: async () => {
      const { data } = await axios.get<{ hasOrganization: boolean }>(
        '/api/organizations/check',
      );
      return data.hasOrganization;
    },
  });
}

export function useCreateOrganization() {
  const queryClient = getQueryClient();

  return useMutation({
    mutationFn: async (newOrg: {
      name: string;
      address?: string;
      website?: string;
    }) => {
      const { data } = await axios.post('/api/organizations', newOrg);
      return data;
    },
    onSuccess: () => {
      // Invalidate the check query so the guard lets the user in
      queryClient.invalidateQueries({ queryKey: ['organizationStatus'] });
    },
  });
}

export function useSetupApplication() {
  const queryClient = getQueryClient();

  return useMutation({
    mutationFn: async (payload: SetupData) => {
      // We send everything to a single unified endpoint
      const { data } = await axios.post('/api/setup', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizationStatus'] });
    },
  });
}
