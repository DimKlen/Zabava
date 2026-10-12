import { CheckIcon } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { easeTiming } from '@/lib/animation';
import { hapticLight } from '@/lib/haptics';
import { colors, durations, motion } from '@/theme/tokens';

type Props = {
  watched: boolean;
  onPress: () => void;
  /** 44 dans les listes, 48 sur la carte « prochain épisode ». */
  zone?: 44 | 48;
};

/**
 * Coche d'épisode : visuel 32 dans une zone de 44 ou 48.
 * Ne pas l'afficher pour un épisode pas encore diffusé.
 */
export function CheckButton({ watched, onPress, zone = 44 }: Props) {
  const scale = useSharedValue(1);
  const wasWatched = useRef(watched);

  // Passage à vu : pop 350 ms. Le haptique part au tap (pas au décochage).
  useEffect(() => {
    if (watched && !wasWatched.current) {
      const t = durations.popEpisode;
      scale.set(
        withSequence(
          withTiming(motion.popScale, easeTiming(t * 0.4)),
          withTiming(1, easeTiming(t * 0.6)),
        ),
      );
    }
    wasWatched.current = watched;
  }, [watched, scale]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={watched ? 'Marquer comme non vu' : 'Marquer comme vu'}
      accessibilityState={{ checked: watched }}
      onPress={() => {
        if (!watched) hapticLight();
        onPress();
      }}
      style={[styles.zone, { width: zone, height: zone }]}
      testID="check-button"
    >
      <Animated.View style={[styles.visual, watched ? styles.on : styles.off, popStyle]}>
        {watched ? (
          <CheckIcon size={17} color={colors.bg} weight="bold" />
        ) : (
          <CheckIcon size={16} color={zone === 48 ? colors.neutral500 : colors.neutral600} />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zone: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visual: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: {
    borderWidth: 1.5,
    borderColor: colors.neutral600,
  },
  on: {
    backgroundColor: colors.accent,
  },
});
