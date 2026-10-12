import { Image } from 'expo-image';
import { CheckIcon, PlusIcon } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { PosterBadge } from '@/domain/badge';
import { posterInitial } from '@/domain/initials';
import type { Title } from '@/domain/types';
import { easeTiming } from '@/lib/animation';
import { hapticMedium } from '@/lib/haptics';
import { tmdbImage } from '@/lib/tmdb';
import { colors, durations, motion, radii } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

import { GradientFill } from './GradientFill';
import { PressableScale } from './PressableScale';

type Props = {
  title: Pick<Title, 'id' | 'title' | 'posterPath'>;
  /** false en mode compact (lignes de 44 pt). */
  showTitle?: boolean;
  badge?: PosterBadge | null;
  /** Bouton « + » / coche. */
  showAdd?: boolean;
  inList?: boolean;
  /** w342 pour les grilles et carrousels, w185 en compact. */
  imageSize?: 'w185' | 'w342';
  onPress?: () => void;
  onToggle?: () => void;
  /** Films de Ma liste uniquement : délai 480 ms, haptique Medium. */
  onLongPress?: () => void;
  /** La largeur vient du parent. */
  style?: StyleProp<ViewStyle>;
};

/** Affiche 2:3, avec affiche de remplacement, badge, « + » et appui long. */
export function Poster({
  title,
  showTitle = true,
  badge,
  showAdd = false,
  inList = false,
  imageSize = 'w342',
  onPress,
  onToggle,
  onLongPress,
  style,
}: Props) {
  const uri = tmdbImage(title.posterPath, imageSize);

  return (
    <PressableScale
      pressedScale={motion.pressScalePoster}
      accessibilityRole="button"
      accessibilityLabel={title.title}
      onPress={onPress}
      onLongPress={
        onLongPress
          ? () => {
              hapticMedium();
              onLongPress();
            }
          : undefined
      }
      delayLongPress={durations.longPress}
      disabled={!onPress && !onLongPress}
      style={[styles.poster, style]}
      testID="poster"
    >
      {/* Remplacement : visible sans image et pendant le chargement. */}
      <GradientFill gradientKey={title.id} />
      <View importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        <Text style={styles.initial}>{posterInitial(title.title)}</Text>
        {showTitle ? (
          <Text
            numberOfLines={3}
            textBreakStrategy="simple"
            android_hyphenationFrequency="none"
            style={styles.title}
          >
            {title.title}
          </Text>
        ) : null}
      </View>
      {uri ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          transition={durations.posterFadeIn}
          cachePolicy="memory-disk"
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {badge ? (
        // Rangée bornée à 6 pt de chaque bord : largeur max = 100 % − 12.
        <View pointerEvents="none" style={styles.badgeRow}>
          <View style={[styles.badge, badge.highlight && styles.badgeHighlight]}>
            <Text
              numberOfLines={1}
              style={[styles.badgeText, badge.highlight && styles.badgeTextHighlight]}
            >
              {badge.text}
            </Text>
          </View>
        </View>
      ) : null}

      {showAdd ? <AddButton title={title.title} inList={inList} onToggle={onToggle} /> : null}
    </PressableScale>
  );
}

function AddButton({
  title,
  inList,
  onToggle,
}: {
  title: string;
  inList: boolean;
  onToggle?: () => void;
}) {
  const scale = useSharedValue(1);
  const wasInList = useRef(inList);

  // Animation pop (300 ms) au passage à l'état coché.
  useEffect(() => {
    if (inList && !wasInList.current) {
      const t = durations.popPoster;
      scale.set(
        withSequence(
          withTiming(motion.popScale, easeTiming(t * 0.4)),
          withTiming(1, easeTiming(t * 0.6)),
        ),
      );
    }
    wasInList.current = inList;
  }, [inList, scale]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${inList ? 'Retirer' : 'Ajouter'} ${title}`}
      onPress={onToggle}
      hitSlop={4}
      style={styles.addZone}
      testID="poster-add"
    >
      <Animated.View style={[styles.addVisual, inList ? styles.addOn : styles.addOff, popStyle]}>
        {inList ? (
          <CheckIcon size={14} color={colors.bg} weight="bold" />
        ) : (
          <PlusIcon size={14} color={colors.text} />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  poster: {
    aspectRatio: 2 / 3,
    borderRadius: radii.rMd,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral800,
    backgroundColor: colors.neutral900,
  },
  initial: {
    position: 'absolute',
    right: -4,
    top: '14%',
    fontFamily: fonts.semiBold,
    fontSize: 76,
    lineHeight: 76,
    color: colors.text,
    opacity: 0.08,
  },
  title: {
    position: 'absolute',
    left: 8,
    right: 34,
    bottom: 8,
    ...typography.posterTitle,
    color: colors.text,
  },
  badgeRow: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
  },
  badge: {
    flexShrink: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radii.rXs,
    backgroundColor: colors.bgA80,
  },
  badgeHighlight: {
    backgroundColor: colors.accent800,
  },
  badgeText: {
    ...typography.micro,
    color: colors.text,
  },
  badgeTextHighlight: {
    color: colors.accent100,
  },
  addZone: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addVisual: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOff: {
    backgroundColor: colors.bgA75,
    borderWidth: 1,
    borderColor: colors.neutral600,
  },
  addOn: {
    backgroundColor: colors.accent,
  },
});
