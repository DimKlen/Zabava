import { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { setEpisodesWatched, type ListTitle } from '@/api/libraryActions';
import { Chip } from '@/components/Chip';
import { seasonNumbers, seasonProgress, seasonToggle, type SeriesEpisode } from '@/domain/series';
import { hapticLight } from '@/lib/haptics';

import { checkEpisode } from './checkEpisode';
import { SeasonHeader } from './SeasonHeader';

export const seasonLabel = (season: number) => (season === 0 ? 'Spéciaux' : `Saison ${season}`);

/** Épisodes d'une saison, dans l'ordre. */
export function seasonEpisodesOf(episodes: SeriesEpisode[], season: number): SeriesEpisode[] {
  return episodes
    .filter((episode) => episode.season === season)
    .sort((a, b) => a.number - b.number);
}

type HeaderProps = {
  series: ListTitle;
  episodes: SeriesEpisode[];
  seasonEpisodes: SeriesEpisode[];
  season: number;
  onSeasonChange: (season: number) => void;
};

/**
 * Haut de la liste des épisodes (specs/docs/07 §7.1) : saisons, puis en-tête de la saison. Les lignes
 * sont rendues par la liste virtualisée de la fiche : un animé peut compter plus de mille épisodes.
 */
export function EpisodesHeader({
  series,
  episodes,
  seasonEpisodes,
  season,
  onSeasonChange,
}: HeaderProps) {
  const now = new Date();
  const progress = seasonProgress(seasonEpisodes, now);

  const toggleAll = () => {
    const toggle = seasonToggle(seasonEpisodes, now);
    if (toggle.watched) hapticLight();
    setEpisodesWatched(series, toggle.episodes, toggle.watched);
  };

  return (
    <View style={styles.header}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.seasons}
      >
        {seasonNumbers(episodes).map((number) => (
          <Chip
            key={number}
            label={seasonLabel(number)}
            active={number === season}
            onPress={() => onSeasonChange(number)}
            paddingHorizontal={14}
          />
        ))}
      </ScrollView>
      <SeasonHeader name={seasonLabel(season)} progress={progress} onToggleAll={toggleAll} />
    </View>
  );
}

/**
 * Gestes des lignes, stables (EpisodeRow est mémoïsé) mais lus avec les données du moment :
 * une ligne ne se redessine pas quand une autre est cochée.
 */
export function useEpisodeActions(
  series: ListTitle | undefined,
  episodes: SeriesEpisode[],
  onOpenEpisode: (episode: SeriesEpisode) => void,
) {
  const latest = useRef({ series, episodes, onOpenEpisode });
  useEffect(() => {
    latest.current = { series, episodes, onOpenEpisode };
  });
  const openEpisode = useCallback(
    (episode: SeriesEpisode) => latest.current.onOpenEpisode(episode),
    [],
  );
  const check = useCallback((episode: SeriesEpisode) => {
    const { series: current, episodes: all } = latest.current;
    if (current) checkEpisode(current, all, episode);
  }, []);
  return { openEpisode, check };
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 6,
  },
  seasons: {
    gap: 8,
    paddingTop: 14,
    paddingHorizontal: 16,
  },
});
