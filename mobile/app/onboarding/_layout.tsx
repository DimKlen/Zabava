import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { stepFromPath } from '@/domain/onboarding';
import { OnboardingHeader } from '@/features/onboarding/OnboardingHeader';
import { colors, durations } from '@/theme/tokens';

// En-tête maison commun aux 3 étapes : il reste en place pour animer la progression.
export default function OnboardingLayout() {
  const step = stepFromPath(usePathname());
  return (
    <View style={styles.screen}>
      {step ? <OnboardingHeader step={step} /> : null}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: durations.fadeOnboarding,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
