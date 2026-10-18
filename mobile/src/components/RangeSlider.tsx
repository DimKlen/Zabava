import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { colors } from '@/theme/tokens';

const THUMB = 24;
const HIT = 44;
const TRACK = 4;

type Props = {
  min: number;
  max: number;
  step?: number;
  /** [début, fin] ; début ≤ fin. */
  value: readonly [number, number];
  onChange: (value: [number, number]) => void;
  accessibilityLabel: string;
};

type Edge = 'low' | 'high';

/** Curseur à deux poignées sur une seule piste (plage de valeurs). */
export function RangeSlider({ min, max, step = 1, value, onChange, accessibilityLabel }: Props) {
  const [width, setWidth] = useState(0);
  // Valeur de la poignée au début du geste (objet stable, lu seulement dans les gestes).
  const [origin] = useState(() => ({ low: 0, high: 0 }));
  const span = Math.max(1, max - min);
  const usable = Math.max(1, width - THUMB);
  const toX = (v: number) => ((v - min) / span) * usable;

  const snap = (raw: number) =>
    Math.min(max, Math.max(min, min + Math.round((raw - min) / step) * step));

  const drag = (edge: Edge) =>
    Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin(() => {
        origin[edge] = edge === 'low' ? value[0] : value[1];
      })
      .onUpdate((e) => {
        const next = snap(origin[edge] + (e.translationX / usable) * span);
        onChange(
          edge === 'low'
            ? [Math.min(next, value[1]), value[1]]
            : [value[0], Math.max(next, value[0])],
        );
      });

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const left = toX(value[0]);
  const right = toX(value[1]);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <View style={styles.track} />
      <View style={[styles.selected, { left: left + THUMB / 2, width: right - left }]} />
      {width > 0 ? (
        <>
          <GestureDetector gesture={drag('low')}>
            <View
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={`${accessibilityLabel}, début`}
              accessibilityValue={{ min, max, now: value[0] }}
              style={[styles.hit, { left: left - (HIT - THUMB) / 2 }]}
            >
              <View style={styles.thumb} />
            </View>
          </GestureDetector>
          <GestureDetector gesture={drag('high')}>
            <View
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={`${accessibilityLabel}, fin`}
              accessibilityValue={{ min, max, now: value[1] }}
              style={[styles.hit, { left: right - (HIT - THUMB) / 2 }]}
            >
              <View style={styles.thumb} />
            </View>
          </GestureDetector>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: HIT,
    justifyContent: 'center',
  },
  track: {
    height: TRACK,
    borderRadius: TRACK / 2,
    backgroundColor: colors.neutral800,
  },
  selected: {
    position: 'absolute',
    top: (HIT - TRACK) / 2,
    height: TRACK,
    backgroundColor: colors.accent,
  },
  hit: {
    position: 'absolute',
    top: 0,
    width: HIT,
    height: HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.accent,
  },
});
