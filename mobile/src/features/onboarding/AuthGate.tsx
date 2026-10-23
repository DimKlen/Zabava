import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfile, type Profile } from '@/api/profile';
import { useSessionStore } from '@/api/session';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { rememberMosaicPosters } from '@/lib/mosaic';
import { colors } from '@/theme/tokens';

/**
 * Garde d'auth (specs/docs/04-navigation.md §2) : pas de session → /login ;
 * onboarding non terminé → pseudo, puis langue ; compte existant sans pseudo →
 * /username-required (specs/social/docs/01 §2) ; sinon Ma liste.
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
  if (profile.data) return <Redirect href={startRoute(profile.data)} />;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {showsLoadError(profile) ? <LoadError onRetry={() => void profile.refetch()} /> : null}
    </View>
  );
}

function startRoute({ onboardedAt, username }: Profile) {
  if (!onboardedAt) return username ? '/onboarding/region' : '/onboarding/username';
  return username ? '/(tabs)/watchlist' : '/username-required';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
