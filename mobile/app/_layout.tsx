import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors, durations } from '@/theme/tokens';

// Le splash reste affiché jusqu'au chargement des polices Inter.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="title/[type]/[id]" options={pushOptions} />
          <Stack.Screen name="person/[id]" options={pushOptions} />
          <Stack.Screen name="genre/[type]/[genre]" options={pushOptions} />
          <Stack.Screen
            name="search"
            options={{ animation: 'fade', animationDuration: durations.fadeSearch }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Fiches, personne, genre : glissement depuis la droite (~220 ms), retour par le bord actif.
const pushOptions = {
  animation: 'slide_from_right',
  animationDuration: durations.push,
  gestureEnabled: true,
} as const;
