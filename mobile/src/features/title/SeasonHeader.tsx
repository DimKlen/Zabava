import { ChecksIcon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { SeasonProgress } from '@/domain/series';
import { easeTiming } from '@/lib/animation';
import { colors, durations, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  name: string;
  progress: SeasonProgress;
  onToggleAll: () => void;
};

/** En-tête de saison : « {vus}/{total} vus », barre, « Tout marquer comme vu » / « Saison vue ». */
export function SeasonHeader({ name, progress, onToggleAll }: Props) {
  const ratio = progress.total > 0 ? progress.watched / progress.total : 0;
  const complete = progress.complete;
  return (
    <View style={styles.card}>
      <View style={styles.text}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.seen}>{`${progress.watched}/${progress.total} vus`}</Text>
        <ProgressBar ratio={ratio} />
      </View>
      {progress.aired.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={onToggleAll}
          style={({ pressed }) => [
            styles.button,
            complete && styles.buttonComplete,
            pressed && !complete && styles.buttonPressed,
          ]}
          testID="season-toggle"
        >
          <ChecksIcon size={18} color={complete ? colors.bg : colors.accent} />
          <Text style={[styles.buttonLabel, { color: complete ? colors.bg : colors.accent }]}>
            {complete ? 'Saison vue' : 'Tout marquer comme vu'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ProgressBar({ ratio }: { ratio: number }) {
  const width = useSharedValue(ratio * 100);
  useEffect(() => {
    width.set(withTiming(ratio * 100, easeTiming(durations.progress)));
  }, [ratio, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.get()}%` }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.rLg,
    backgroundColor: colors.surface,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: colors.text,
  },
  seen: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
  track: {
    height: 3,
    marginTop: 8,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.neutral800,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  button: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: radii.rPill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  buttonComplete: {
    backgroundColor: colors.accent,
  },
  buttonPressed: {
    backgroundColor: colors.accentA18,
  },
  buttonLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 13 * 1.2,
  },
});
