/** API sociale — specs/social/docs/06 §3 et docs/07 §2. */
import { useQuery } from '@tanstack/react-query';

import { isWellFormedUsername } from '@/domain/social/username';

import { api } from './http';
import type { components } from './types';

export type UsernameAvailability = components['schemas']['UsernameAvailability'];

export const usernameAvailableKey = (username: string) => ['usernameAvailable', username] as const;

export function checkUsername(
  username: string,
  signal?: AbortSignal,
): Promise<UsernameAvailability> {
  return api<UsernameAvailability>('/users/username-available', { query: { u: username }, signal });
}

/**
 * Disponibilité d'un pseudo bien formé, jamais mise en cache (staleTime 0) et sans nouvel essai :
 * hors ligne, l'échec s'affiche tout de suite (« Vérification impossible, réessaie »).
 */
export function useUsernameAvailability(username: string, enabled: boolean) {
  return useQuery({
    queryKey: usernameAvailableKey(username),
    queryFn: ({ signal }) => checkUsername(username, signal),
    enabled: enabled && isWellFormedUsername(username),
    staleTime: 0,
    retry: false,
  });
}
