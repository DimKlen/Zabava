import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { GradientFill } from '@/components/GradientFill';
import { loadMosaicPosters } from '@/lib/mosaic';
import { tmdbImage } from '@/lib/tmdb';
import { colors, durations, radii } from '@/theme/tokens';

const GAP = 10;
/** Dégradés de remplacement tant qu'aucune affiche n'est mémorisée. */
const PLACEHOLDER_COUNT = 18;

type Tile = { key: string; uri?: string };

// Colonnes 1 et 3 vers le haut (70 s, 110 s), colonne 2 vers le bas (90 s).
const COLUMNS = [
  { duration: durations.drift1, reverse: false },
  { duration: durations.drift2, reverse: true },
  { duration: durations.drift3, reverse: false },
] as const;

function buildColumns(paths: string[]) {
  const tiles: Tile[] =
    paths.length > 0
      ? paths.map((path, index) => ({ key: `${index}-${path}`, uri: tmdbImage(path, 'w185') }))
      : Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => ({ key: `mosaic-${index}` }));
  return COLUMNS.map((column, k) => {
    const own = tiles.filter((_, index) => index % COLUMNS.length === k);
    // Liste dupliquée : un décalage de −50 % boucle sans saut.
    return { ...column, tiles: [...own, ...own] };
  });
}

/** Fond de l'écran de connexion : affiches qui dérivent, floutées, sous un voile. */
export function LoginMosaic() {
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void loadMosaicPosters().then((loaded) => {
      if (active) setPaths(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const columns = buildColumns(paths);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.mosaic}>
        {columns.map((column, k) => (
          <DriftColumn key={k} {...column} />
        ))}
      </View>
      <LinearGradient
        colors={[colors.bgA20, colors.bg, colors.bg]}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function DriftColumn({
  tiles,
  duration,
  reverse,
}: {
  tiles: Tile[];
  duration: number;
  reverse: boolean;
}) {
  const [height, setHeight] = useState(0);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (height === 0) return;
    const half = -height / 2;
    offset.set(reverse ? half : 0);
    offset.set(
      withRepeat(withTiming(reverse ? 0 : half, { duration, easing: Easing.linear }), -1, false),
    );
  }, [height, duration, reverse, offset]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));

  const onLayout = (event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height);

  return (
    <View style={styles.column}>
      <Animated.View onLayout={onLayout} style={[styles.columnContent, animatedStyle]}>
        {tiles.map((tile, index) => (
          <View key={`${tile.key}-${index}`} style={styles.tile}>
            <GradientFill gradientKey={tile.key} />
            {tile.uri ? (
              <Image
                source={{ uri: tile.uri }}
                contentFit="cover"
                blurRadius={3}
                cachePolicy="memory-disk"
                style={StyleSheet.absoluteFill}
              />
            ) : null}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Déborde de l'écran (−60 / −40), pivoté de −8°, opacité 0.6.
  mosaic: {
    position: 'absolute',
    top: -60,
    bottom: -60,
    left: -40,
    right: -40,
    flexDirection: 'row',
    gap: GAP,
    opacity: 0.6,
    transform: [{ rotate: '-8deg' }],
  },
  column: {
    flex: 1,
  },
  columnContent: {
    gap: GAP,
  },
  tile: {
    aspectRatio: 2 / 3,
    borderRadius: radii.rMd,
    overflow: 'hidden',
  },
});
