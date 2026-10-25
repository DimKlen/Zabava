import { router } from 'expo-router';

import { profileKey, type Profile } from '@/api/profile';
import { queryClient } from '@/api/queryClient';

/** Profil d'un membre ; le mien s'ouvre dans l'onglet Profil (specs/social/docs/02 §2). */
export function openUser(username: string): void {
  const me = queryClient.getQueryData<Profile>(profileKey)?.username;
  if (username === me) {
    router.navigate('/(tabs)/profile');
    return;
  }
  router.push({ pathname: '/u/[username]', params: { username } });
}

/** Amis d'un profil (les miens depuis l'onglet Profil). */
export function openFriends(username: string): void {
  router.push({ pathname: '/u/[username]/friends', params: { username } });
}
