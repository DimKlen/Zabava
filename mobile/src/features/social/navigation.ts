import { router } from 'expo-router';

import { profileKey, type Profile } from '@/api/profile';
import { queryClient } from '@/api/queryClient';
import type { ConnectionsKind } from '@/api/social';

/** Profil d'un membre ; le mien s'ouvre dans l'onglet Profil (specs/social/docs/02 §2). */
export function openUser(username: string): void {
  const me = queryClient.getQueryData<Profile>(profileKey)?.username;
  if (username === me) {
    router.navigate('/(tabs)/profile');
    return;
  }
  router.push({ pathname: '/u/[username]', params: { username } });
}

/** Abonnés ou abonnements d'un profil, ouvert sur l'onglet touché. */
export function openConnections(username: string, tab: ConnectionsKind): void {
  router.push({ pathname: '/u/[username]/connections', params: { username, tab } });
}
