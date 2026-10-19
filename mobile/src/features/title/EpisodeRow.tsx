import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CheckButton } from '@/components/CheckButton';
import { GradientFill } from '@/components/GradientFill';
import { Text } from '@/components/Text';
import { isAired, type SeriesEpisode } from '@/domain/series';
import { episodeRowMeta } from '@/domain/seriesDetail';
import { episodeTitle } from '@/domain/seriesList';
import { tmdbImage } from '@/lib/tmdb';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  seriesId: string;
  episode: SeriesEpisode;
  spoilerProtection: boolean;
  now: Date;
  /** Stables d'un rendu à l'autre : une saison de 300 épisodes ne se redessine pas en entier. */
  onPress: (episode: SeriesEpisode) => void;
  onCheck: (episode: SeriesEpisode) => void;
};

const MINUTE = 60_000;

/** Ne se redessine que si l'épisode, la protection ou la minute courante changent. */
function sameProps(a: Props, b: Props): boolean {
  return (
    a.seriesId === b.seriesId &&
    a.episode === b.episode &&
    a.spoilerProtection === b.spoilerProtection &&
    a.onPress === b.onPress &&
    a.onCheck === b.onCheck &&
    Math.floor(a.now.getTime() / MINUTE) === Math.floor(b.now.getTime() / MINUTE)
  );
}

/** Ligne d'épisode de la fiche : vignette, « E05 · Titre », méta, coche si diffusé. */
export const EpisodeRow = memo(function EpisodeRow({
  seriesId,
  episode,
  spoilerProtection,
  now,
  onPress,
  onCheck,
}: Props) {
  const aired = isAired(episode, now);
  const watched = episode.watchedAt !== undefined;
  const blur = spoilerProtection && !watched;
  const code = `E${String(episode.number).padStart(2, '0')}`;
  const uri = tmdbImage(episode.stillPath, 'w300');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(episode)}
      style={[styles.row, !aired && styles.notAired]}
      testID="episode-row"
    >
      <View style={styles.thumb}>
        <View style={styles.thumbInner}>
          <GradientFill gradientKey={`${seriesId}${episode.season}-${episode.number}`} />
          {uri ? (
            <Image
              source={{ uri }}
              contentFit="cover"
              cachePolicy="memory-disk"
              blurRadius={blur ? 6 : 0}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </View>
      </View>
      <View style={styles.text}>
        <Text numberOfLines={1} style={styles.title}>
          {`${code} · ${episodeTitle(episode, spoilerProtection)}`}
        </Text>
        <Text style={styles.meta}>{episodeRowMeta(episode, now)}</Text>
      </View>
      {aired ? <CheckButton watched={watched} onPress={() => onCheck(episode)} /> : null}
    </Pressable>
  );
}, sameProps);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  notAired: {
    opacity: 0.45,
  },
  thumb: {
    width: 96,
    height: 54,
    borderRadius: radii.rSm,
    overflow: 'hidden',
  },
  thumbInner: {
    flex: 1,
    // Agrandie pour que le flou anti-spoiler ne laisse pas de bord.
    transform: [{ scale: 1.15 }],
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: colors.text,
  },
  meta: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.neutral500,
  },
});
