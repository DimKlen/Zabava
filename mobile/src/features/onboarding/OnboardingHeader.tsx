import { router } from 'expo-router';
import { CaretLeftIcon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import {
  canSkip,
  nextStep,
  ONBOARDING_STEPS,
  previousStep,
  type OnboardingStep,
} from '@/domain/onboarding';
import { easeTiming } from '@/lib/animation';
import { colors, durations } from '@/theme/tokens';

type Props = { step: OnboardingStep };

/** Barre du haut : retour (sauf au pseudo), progression en 4 segments, « Passer » (sauf au pseudo). */
export function OnboardingHeader({ step }: Props) {
  const insets = useSafeAreaInsets();
  const current = ONBOARDING_STEPS.indexOf(step);
  const canGoBack = previousStep(step) !== null;

  // « Passer » : étape suivante, sans enregistrer de nouveau choix.
  const skip = () => router.push(`/onboarding/${nextStep(step)}`);
  const back = () => {
    const previous = previousStep(step);
    if (router.canGoBack()) router.back();
    else if (previous) router.replace(`/onboarding/${previous}`);
  };

  return (
    <View style={[styles.bar, { marginTop: insets.top }]}>
      <View style={styles.side}>
        {canGoBack ? (
          <Button
            variant="icon"
            height={44}
            icon={CaretLeftIcon}
            iconSize={22}
            color={colors.text}
            accessibilityLabel="Retour"
            onPress={back}
          />
        ) : null}
      </View>
      <View style={styles.progress}>
        {ONBOARDING_STEPS.map((key, index) => (
          <Segment key={key} filled={index <= current} />
        ))}
      </View>
      {/* Masqué sans être retiré : la barre de progression garde sa largeur d'une étape à l'autre. */}
      <View
        style={!canSkip(step) && styles.hidden}
        pointerEvents={canSkip(step) ? 'auto' : 'none'}
        accessibilityElementsHidden={!canSkip(step)}
        importantForAccessibility={canSkip(step) ? 'auto' : 'no-hide-descendants'}
      >
        <Button
          variant="ghost"
          height={44}
          label="Passer"
          color={colors.neutral400}
          onPress={skip}
          style={styles.skip}
        />
      </View>
    </View>
  );
}

function Segment({ filled }: { filled: boolean }) {
  const fill = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    fill.set(withTiming(filled ? 1 : 0, easeTiming(durations.progress)));
  }, [filled, fill]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(fill.get(), [0, 1], [colors.neutral800, colors.accent]),
  }));

  return <Animated.View style={[styles.segment, animatedStyle]} />;
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  side: {
    width: 44,
  },
  progress: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 4,
  },
  skip: {
    paddingHorizontal: 12,
  },
  hidden: {
    opacity: 0,
  },
});
