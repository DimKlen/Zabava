import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, durations, motion, radii } from '@/theme/tokens';

// Le prototype répète un dégradé de 600 pt (900 → 800 → 900) et le décale de
// −300 à +300 en 1,2 s : une bande de 3 périodes qui glisse de 600 pt boucle sans saut.
const PERIOD = motion.shimmerWidth;
const STRIP_COLORS = [
  colors.neutral900,
  colors.neutral800,
  colors.neutral900,
  colors.neutral800,
  colors.neutral900,
  colors.neutral800,
  colors.neutral900,
] as const;
const STRIP_LOCATIONS = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1] as const;

type BoxProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  radius: number;
  style?: StyleProp<ViewStyle>;
};

/** Forme de squelette avec le shimmer animé. Jamais de spinner plein écran. */
export function SkeletonBox({ width, height, aspectRatio, radius, style }: BoxProps) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.set(
      withRepeat(withTiming(PERIOD, { duration: durations.shimmer, easing: Easing.linear }), -1),
    );
  }, [offset]);

  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.box, { width, height, aspectRatio, borderRadius: radius }, style]}
    >
      <Animated.View style={[styles.strip, stripStyle]}>
        <LinearGradient
          colors={STRIP_COLORS}
          locations={STRIP_LOCATIONS}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** Affiche 2:3, rayon 8. */
export function SkeletonPoster({ style }: { style?: StyleProp<ViewStyle> }) {
  return <SkeletonBox aspectRatio={2 / 3} radius={radii.rMd} style={style} />;
}

/** Carte « prochain épisode » : hauteur 80, rayon 12. */
export function SkeletonCard() {
  return <SkeletonBox height={80} radius={radii.rLg} />;
}

/** Ligne de recherche : mini-affiche 40 × 60 + barre de 14. */
export function SkeletonSearchRow() {
  return (
    <View style={styles.row}>
      <SkeletonBox width={40} height={60} radius={radii.rSm} />
      <SkeletonBox height={14} radius={radii.rXs} style={styles.bar} />
    </View>
  );
}

/** Ligne de membre (specs/social/docs/05 §3) : hauteur 60, cercle de 44, nom et @pseudo. */
export function SkeletonMemberRow() {
  return (
    <View style={styles.memberRow}>
      <SkeletonBox width={44} height={44} radius={22} />
      <View style={styles.memberText}>
        <SkeletonBox width={140} height={15} radius={radii.rSm} />
        <SkeletonBox width={90} height={13} radius={radii.rSm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    backgroundColor: colors.neutral900,
  },
  strip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    // Départ à −900 ≡ −300 (mod 600), comme background-position −300 ;
    // la bande couvre encore 900 pt de large après un décalage de 600.
    left: -PERIOD * 1.5,
    width: PERIOD * 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bar: {
    flex: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 16,
  },
  memberText: {
    gap: 6,
  },
});
