import { Stack } from 'expo-router';

import { colors, durations } from '@/theme/tokens';

// Étape 4 : en-tête maison (progression + « Passer »).
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: durations.fadeOnboarding,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
