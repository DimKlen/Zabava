import { Image } from 'expo-image';
import { CheckIcon, EyeIcon, XIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ListTitle } from '@/api/libraryActions';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { GradientFill } from '@/components/GradientFill';
import { ImdbBadge } from '@/components/RatingChips';
import { Text } from '@/components/Text';
import { ToastHost } from '@/components/Toast';
import { episodeCode, formatRating } from '@/domain/format';
import { isAired, type SeriesEpisode } from '@/domain/series';
import { episodeSheetMeta, SPOILER_SYNOPSIS } from '@/domain/seriesDetail';
import { episodeTitle } from '@/domain/seriesList';
import { hapticLight } from '@/lib/haptics';
import { tmdbImage } from '@/lib/tmdb';
import { colors, durations, radii } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

import { checkEpisode } from './checkEpisode';

type Props = {
  series: ListTitle;
  allEpisodes: SeriesEpisode[];
  /** Épisode affiché ; undefined = fiche fermée. */
  episode?: SeriesEpisode;
  spoilerProtection: boolean;
  onClose: () => void;
};

/** Fiche épisode (specs/docs/07 §7.2). */
export function EpisodeSheet({ series, allEpisodes, episode, spoilerProtection, onClose }: Props) {
  return (
    <BottomSheet
      visible={episode !== undefined}
      onClose={onClose}
      enterDuration={durations.sheetEpisode}
      panelStyle={styles.panel}
      // Le toast passe au-dessus de la fiche, comme dans le prototype.
      overlay={<ToastHost />}
    >
      {episode ? (
        <EpisodeContent
          series={series}
          allEpisodes={allEpisodes}
          episode={episode}
          spoilerProtection={spoilerProtection}
          onClose={onClose}
        />
      ) : null}
    </BottomSheet>
  );
}

function EpisodeContent({
  series,
  allEpisodes,
  episode,
  spoilerProtection,
  onClose,
}: Required<Omit<Props, 'episode'>> & { episode: SeriesEpisode }) {
  const now = new Date();
  const aired = isAired(episode, now);
  const watched = episode.watchedAt !== undefined;
  const hidden = spoilerProtection && !watched;
  const uri = tmdbImage(episode.stillPath, 'w780');
  const synopsis = hidden ? SPOILER_SYNOPSIS : episode.overview;

  return (
    <View testID="episode-sheet">
      <View style={styles.image}>
        <View style={styles.imageInner}>
          <GradientFill gradientKey={`${series.id}${episode.season}-${episode.number}`} />
          {uri ? (
            <Image
              source={{ uri }}
              contentFit="cover"
              cachePolicy="memory-disk"
              blurRadius={hidden ? 10 : 0}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fermer"
        onPress={onClose}
        hitSlop={4}
        style={styles.close}
      >
        <XIcon size={16} color={colors.text} />
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.code}>
          {`${episodeCode(episode.season, episode.number)} · ${series.title}`}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          {episodeTitle(episode, spoilerProtection)}
        </Text>
        <Text style={styles.meta}>{episodeSheetMeta(episode, now)}</Text>
        {aired && episode.imdbRating !== undefined ? (
          <View style={styles.rating}>
            <ImdbBadge />
            <Text style={styles.ratingValue}>{formatRating(episode.imdbRating)}</Text>
          </View>
        ) : null}
        {synopsis ? <Text style={styles.synopsis}>{synopsis}</Text> : null}
        {aired ? (
          <Button
            variant={watched ? 'secondary' : 'primary'}
            height={48}
            fontSize={15}
            icon={watched ? CheckIcon : EyeIcon}
            label={watched ? 'Vu' : 'Marquer comme vu'}
            onPress={() => {
              if (!watched) hapticLight();
              checkEpisode(series, allEpisodes, episode);
            }}
          />
        ) : (
          <Text style={styles.notAired}>Pas encore diffusé.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
  },
  image: {
    height: 180,
    overflow: 'hidden',
  },
  imageInner: {
    flex: 1,
    transform: [{ scale: 1.1 }],
  },
  close: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: radii.rPill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgA60,
  },
  content: {
    gap: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  code: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.accent300,
  },
  title: {
    ...typography.sheetTitle,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingValue: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.text,
  },
  synopsis: {
    marginTop: 4,
    marginBottom: 8,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.55,
    color: colors.neutral300,
  },
  notAired: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral500,
  },
});
