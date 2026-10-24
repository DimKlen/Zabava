import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { useSessionStore } from '@/api/session';
import { profilePath } from '@/domain/social/links';
import { savePendingDeepLink } from '@/lib/pendingDeepLink';

import { UserProfileScreen } from './UserProfileScreen';

/**
 * Profil ouvert par un lien (`zabava://u/…`, `https://{domaine}/u/…`). Sans session, le lien est
 * gardé et l'on passe par la connexion (puis l'onboarding) avant d'arriver sur le profil.
 */
export function UserProfileGate({ username }: { username: string }) {
  const status = useSessionStore((s) => s.status);
  const signedOut = status === 'signedOut';

  useEffect(() => {
    if (signedOut) void savePendingDeepLink(profilePath(username));
  }, [signedOut, username]);

  if (signedOut) return <Redirect href="/login" />;
  if (status === 'loading') return null;
  return <UserProfileScreen key={username} username={username} />;
}
