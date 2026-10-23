import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { clearMutationQueue } from '@/api/mutationQueue';
import { clearQueryCache } from '@/api/queryClient';
import { syncSession } from '@/api/session';
import { supabase } from '@/api/supabase';
import { colors } from '@/theme/tokens';

/**
 * Ouvre une session à partir de jetons passés dans le lien (`/dev/session?access_token=…&refresh_token=…`),
 * pour tester et filmer l'app avec un compte de test ou de démonstration dans l'émulateur.
 */
export function DevSessionScreen() {
  const { access_token: accessToken, refresh_token: refreshToken } = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
  }>();

  useEffect(() => {
    if (!accessToken || !refreshToken) return;
    // Rien du compte précédent ne doit rester (cache, écritures en attente).
    void (async () => {
      await supabase()
        .auth.signOut({ scope: 'local' })
        .catch(() => undefined);
      await clearMutationQueue();
      await clearQueryCache();
      await supabase().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      await syncSession();
      router.replace('/');
    })();
  }, [accessToken, refreshToken]);

  return <View style={styles.screen} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
