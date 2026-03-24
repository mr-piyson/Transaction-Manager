'use client';
import { SetupData } from '@/app/setup/setup-types';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useCheckOrganization() {
  return useQuery({
    queryKey: ['organizationStatus'],
    queryFn: async () => {
      const { data } = await api.get<{ hasOrganization: boolean }>('/api/organizations/check');
      return data.hasOrganization;
    },
  });
}

export function useCreateOrganization() {
  return useMutation({
    mutationFn: async (newOrg: { name: string; address?: string; website?: string }) => {
      const { data } = await api.post('/api/organizations', newOrg);
      return data;
    },
    onSuccess: () => {
      const queryClient = useQueryClient();
      // Invalidate the check query so the guard lets the user in
      queryClient.invalidateQueries({ queryKey: ['organizationStatus'] });
    },
  });
}

export function useSetupApplication() {
  return useMutation({
    mutationFn: async (payload: SetupData) => {
      // We send everything to a single unified endpoint
      const { data } = await api.post('/api/setup', payload);
      return data;
    },
    onSuccess: () => {
      const queryClient = useQueryClient();
      queryClient.invalidateQueries({ queryKey: ['organizationStatus'] });
    },
  });
}
