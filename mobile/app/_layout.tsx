import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  persistMaxAge,
  queryClient,
  queryPersister,
  setupOnlineManager,
  shouldPersistQuery,
} from '@/api/queryClient';
import { startMutationQueue } from '@/api/mutationQueue';
import { initSession } from '@/api/session';
import { ActionSheetHost } from '@/components/ActionSheet';
import { DialogHost } from '@/components/Dialog';
import { ToastHost } from '@/components/Toast';
import { InviteSheetHost } from '@/features/social/InviteSheet';
import { colors, durations } from '@/theme/tokens';

// Le splash reste affiché jusqu'au chargement des polices Inter.
void SplashScreen.preventAutoHideAsync();
setupOnlineManager();

const persistOptions = {
  persister: queryPersister,
  maxAge: persistMaxAge,
  // À changer quand la forme d'une réponse en cache évolue (ex. identifiants de l'équipe).
  buster: 'v2',
  dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => initSession(), []);
  // Écritures faites hors ligne ou avant la fermeture de l'app : envoyées dès que possible.
  useEffect(() => startMutationQueue(), []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            {/* index en premier : sur natif, le premier écran déclaré sert d'écran initial. */}
            <Stack.Screen name="index" options={{ animation: 'none' }} />
            <Stack.Screen name="login" options={{ animation: 'fade' }} />
            <Stack.Screen name="auth/callback" options={{ animation: 'none' }} />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="username-required" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="title/[type]/[id]" options={pushOptions} />
            <Stack.Screen name="person/[id]" options={pushOptions} />
            <Stack.Screen name="genre/[type]/[genre]" options={pushOptions} />
            <Stack.Screen name="studio/[id]" options={pushOptions} />
            <Stack.Screen name="u/[username]/index" options={pushOptions} />
            <Stack.Screen name="u/[username]/connections" options={pushOptions} />
            <Stack.Screen name="feed" options={pushOptions} />
            <Stack.Screen name="settings/index" options={pushOptions} />
            <Stack.Screen name="profile/edit" options={pushOptions} />
            <Stack.Screen
              name="scan"
              options={{ presentation: 'fullScreenModal', animation: 'fade' }}
            />
            <Stack.Screen
              name="search"
              options={{ animation: 'fade', animationDuration: durations.fadeSearch }}
            />
            <Stack.Screen name="dev/kitchen-sink" options={pushOptions} />
            <Stack.Screen name="dev/session" options={{ animation: 'none' }} />
          </Stack>
          {/* Empilement : écran < Toast < ActionSheet / sheets < Dialog. */}
          <InviteSheetHost />
          <ToastHost />
          <ActionSheetHost />
          <DialogHost />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </PersistQueryClientProvider>
  );
}

// Fiches, personne, genre : glissement depuis la droite (~220 ms), retour par le bord actif.
const pushOptions = {
  animation: 'slide_from_right',
  animationDuration: durations.push,
  gestureEnabled: true,
} as const;
