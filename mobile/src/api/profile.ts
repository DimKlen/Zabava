import { useMutation, useQuery } from '@tanstack/react-query';

import { anyNotificationEnabled } from '@/domain/onboarding';

import { api } from './http';
import { queryClient } from './queryClient';
import type { components } from './types';

export type Profile = components['schemas']['Profile'];
export type ProfileUpdate = components['schemas']['ProfileUpdate'];

export const profileKey = ['profile'] as const;

export function fetchProfile(): Promise<Profile> {
  return api<Profile>('/me/profile');
}

/** Profil de l'utilisateur : jamais périmé, invalidé à chaque modification. */
export function useProfile(enabled = true) {
  return useQuery({ queryKey: profileKey, queryFn: fetchProfile, staleTime: Infinity, enabled });
}

/** Au moins une notification activée dans le profil (celui du cache, sinon chargé). */
export function notificationsWanted(): Promise<boolean> {
  return queryClient
    .fetchQuery({ queryKey: profileKey, queryFn: fetchProfile, staleTime: Infinity })
    .then((profile) => anyNotificationEnabled(profile.notificationPrefs));
}

export function updateProfile(update: ProfileUpdate): Promise<Profile> {
  return api<Profile>('/me/profile', { method: 'PUT', body: update }).then((profile) => {
    queryClient.setQueryData(profileKey, profile);
    return profile;
  });
}

export function useUpdateProfile() {
  return useMutation({ mutationFn: updateProfile });
}

export function useSetProviders() {
  return useMutation({
    mutationFn: (providerIds: number[]) =>
      api<void>('/me/providers', { method: 'PUT', body: { providerIds } }),
    onSuccess: (_data, providerIds) =>
      queryClient.setQueryData<Profile>(profileKey, (profile) =>
        profile ? { ...profile, providerIds } : profile,
      ),
  });
}
