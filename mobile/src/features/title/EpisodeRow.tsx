import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckButton } from '@/components/CheckButton';
import { GradientFill } from '@/components/GradientFill';
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
  onPress: () => void;
  onCheck: () => void;
};

/** Ligne d'épisode de la fiche : vignette, « E05 · Titre », méta, coche si diffusé. */
export function EpisodeRow({ seriesId, episode, spoilerProtection, now, onPress, onCheck }: Props) {
  const aired = isAired(episode, now);
  const watched = episode.watchedAt !== undefined;
  const blur = spoilerProtection && !watched;
  const code = `E${String(episode.number).padStart(2, '0')}`;
  const uri = tmdbImage(episode.stillPath, 'w300');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
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
      {aired ? <CheckButton watched={watched} onPress={onCheck} /> : null}
    </Pressable>
  );
}

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
