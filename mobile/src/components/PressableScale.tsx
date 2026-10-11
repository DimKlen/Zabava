import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { easeTiming } from '@/lib/animation';
import { durations } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  /** Échelle pendant la pression : 0.97 affiche, 0.98 tuile, 0.99 ligne. */
  pressedScale: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** Pressable qui se réduit légèrement pendant la pression (150 ms). */
export function PressableScale({
  pressedScale,
  style,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => {
        scale.set(withTiming(pressedScale, easeTiming(durations.press)));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withTiming(1, easeTiming(durations.press)));
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
