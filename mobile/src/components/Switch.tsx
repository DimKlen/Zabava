import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { easeTiming } from '@/lib/animation';
import { colors, durations, radii } from '@/theme/tokens';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

const TRACK_W = 44;
const TRACK_H = 26;
const THUMB = 22;

/** Interrupteur maison : le Switch natif ne correspond pas au visuel. */
export function Switch({ value, onValueChange, accessibilityLabel, disabled = false }: Props) {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(value ? 1 : 0, easeTiming(durations.switch)));
  }, [progress, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [colors.neutral800, colors.accent]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    left: 2 + progress.get() * 18,
    backgroundColor: interpolateColor(progress.get(), [0, 1], [colors.neutral400, colors.bg]),
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      hitSlop={{ top: 9, bottom: 9 }}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: radii.rPill,
  },
  thumb: {
    position: 'absolute',
    top: 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
  },
});
