import { Easing } from 'react-native-reanimated';

import { easeBezier } from '@/theme/tokens';

/** Courbe CSS `ease`. */
export const ease = Easing.bezier(...easeBezier);

/** Options de withTiming avec la courbe ease (appelable depuis un geste). */
export function easeTiming(duration: number) {
  'worklet';
  return { duration, easing: ease };
}
