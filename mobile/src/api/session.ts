import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { create } from 'zustand';

import { setUnauthorizedHandler } from './http';
import { clearMutationQueue } from './mutationQueue';
import { clearQueryCache } from './queryClient';
import { isSupabaseConfigured, supabase } from './supabase';

type SessionStatus = 'loading' | 'signedIn' | 'signedOut';

type SessionState = {
  status: SessionStatus;
  session: Session | null;
  setSession: (session: Session | null) => void;
};

export const useSessionStore = create<SessionState>()((set) => ({
  status: 'loading',
  session: null,
  setSession: (session) => set({ session, status: session ? 'signedIn' : 'signedOut' }),
}));

/**
 * Lit la session persistée puis suit ses changements (connexion, rafraîchissement,
 * déconnexion). Renvoie la fonction de désabonnement.
 */
export function initSession(): () => void {
  const { setSession } = useSessionStore.getState();
  setUnauthorizedHandler(signOut);

  if (!isSupabaseConfigured()) {
    setSession(null);
    return () => undefined;
  }

  const auth = supabase().auth;
  void auth
    .getSession()
    .then(({ data }) => setSession(data.session))
    .catch(() => setSession(null));
  const { data } = auth.onAuthStateChange((_event, session) => setSession(session));
  return () => data.subscription.unsubscribe();
}

/** Recopie la session courante dans le store (juste après une connexion). */
export async function syncSession(): Promise<void> {
  const { data } = await supabase().auth.getSession();
  useSessionStore.getState().setSession(data.session);
}

/** Déconnexion locale : session, cache, puis retour à /login. */
export async function signOut(): Promise<void> {
  await supabase()
    .auth.signOut({ scope: 'local' })
    .catch(() => undefined);
  useSessionStore.getState().setSession(null);
  await clearMutationQueue();
  await clearQueryCache();
  router.replace('/login');
}
