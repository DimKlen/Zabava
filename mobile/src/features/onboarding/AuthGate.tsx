import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfile } from '@/api/profile';
import { useSessionStore } from '@/api/session';
import { LoadError } from '@/components/LoadError';
import { rememberMosaicPosters } from '@/lib/mosaic';
import { colors } from '@/theme/tokens';

/**
 * Garde d'auth (specs/docs/04-navigation.md §2) : pas de session → /login ;
 * onboarding non terminé → /onboarding/region ; sinon Ma liste.
 */
export function AuthGate() {
  const insets = useSafeAreaInsets();
  const status = useSessionStore((s) => s.status);
  const signedIn = status === 'signedIn';
  const profile = useProfile(signedIn);

  useEffect(() => {
    if (signedIn) void rememberMosaicPosters();
  }, [signedIn]);

  if (status === 'signedOut') return <Redirect href="/login" />;
  if (profile.data) {
    return (
      <Redirect href={profile.data.onboardedAt ? '/(tabs)/watchlist' : '/onboarding/region'} />
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {profile.isError ? <LoadError onRetry={() => void profile.refetch()} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
