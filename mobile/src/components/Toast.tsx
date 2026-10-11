import { useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { easeTiming } from '@/lib/animation';
import { useUiStore } from '@/store/ui';
import { colors, durations, motion, radii, shadows } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { Button } from './Button';

/** Barre d'onglets (58 + zone sûre ≥ 26) + 12 d'écart = 96 à 390 pt. */
const TAB_BAR_CONTENT = 58;
const MIN_BOTTOM = 26;
const GAP_ABOVE_TAB_BAR = 12;
const BOTTOM_WITHOUT_TABS = 34;

/** Hôte global du toast (5 s, « Annuler » facultatif). */
export function ToastHost() {
  const toast = useUiStore((s) => s.toast);
  const undo = useUiStore((s) => s.undoToast);
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  const tabsVisible = segments[0] === '(tabs)';
  const bottom = tabsVisible
    ? TAB_BAR_CONTENT + Math.max(insets.bottom, MIN_BOTTOM) + GAP_ABOVE_TAB_BAR
    : Math.max(BOTTOM_WITHOUT_TABS, insets.bottom);

  if (!toast) return null;

  return (
    <ToastView
      key={toast.id}
      bottom={bottom}
      message={toast.message}
      onUndo={toast.undo ? undo : undefined}
    />
  );
}

function ToastView({
  bottom,
  message,
  onUndo,
}: {
  bottom: number;
  message: string;
  onUndo?: () => void;
}) {
  const progress = useSharedValue(0);

  // Animation `up` : translateY 12 → 0 et opacité 0 → 1 en 250 ms.
  useEffect(() => {
    progress.set(withTiming(1, easeTiming(durations.up)));
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * motion.upTranslateY }],
  }));

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { bottom }, style]}
      testID="toast"
    >
      <Text style={styles.message}>{message}</Text>
      {onUndo ? (
        <Button
          variant="ghost"
          height={40}
          label="Annuler"
          color={colors.accent300}
          onPress={onUndo}
          style={styles.undo}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
    paddingRight: 6,
    paddingBottom: 4,
    paddingLeft: 16,
    borderRadius: radii.rLg,
    backgroundColor: colors.neutral800,
    ...shadows.shadowMd,
  },
  message: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    color: colors.text,
  },
  undo: {
    paddingHorizontal: 12,
  },
});
