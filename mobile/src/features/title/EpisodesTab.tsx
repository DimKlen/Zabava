import { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { setEpisodesWatched, type ListTitle } from '@/api/libraryActions';
import { Chip } from '@/components/Chip';
import { seasonNumbers, seasonProgress, seasonToggle, type SeriesEpisode } from '@/domain/series';
import { hapticLight } from '@/lib/haptics';

import { checkEpisode } from './checkEpisode';
import { EpisodeRow } from './EpisodeRow';
import { SeasonHeader } from './SeasonHeader';

type Props = {
  series: ListTitle;
  episodes: SeriesEpisode[];
  season: number;
  onSeasonChange: (season: number) => void;
  spoilerProtection: boolean;
  onOpenEpisode: (episode: SeriesEpisode) => void;
};

export const seasonLabel = (season: number) => (season === 0 ? 'Spéciaux' : `Saison ${season}`);

/** Onglet Épisodes : saisons, en-tête de saison, liste des épisodes (specs/docs/07 §7.1). */
export function EpisodesTab({
  series,
  episodes,
  season,
  onSeasonChange,
  spoilerProtection,
  onOpenEpisode,
}: Props) {
  const now = new Date();
  const seasonEpisodes = episodes
    .filter((episode) => episode.season === season)
    .sort((a, b) => a.number - b.number);
  const progress = seasonProgress(seasonEpisodes, now);

  // Gestes stables pour les lignes (EpisodeRow est mémoïsé), lus avec les données du moment.
  const latest = useRef({ series, episodes, onOpenEpisode });
  useEffect(() => {
    latest.current = { series, episodes, onOpenEpisode };
  });
  const openEpisode = useCallback(
    (episode: SeriesEpisode) => latest.current.onOpenEpisode(episode),
    [],
  );
  const check = useCallback(
    (episode: SeriesEpisode) =>
      checkEpisode(latest.current.series, latest.current.episodes, episode),
    [],
  );

  const toggleAll = () => {
    const toggle = seasonToggle(seasonEpisodes, now);
    if (toggle.watched) hapticLight();
    setEpisodesWatched(series, toggle.episodes, toggle.watched);
  };

  return (
    <View>
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
      <View style={styles.list}>
        {seasonEpisodes.map((episode) => (
          <EpisodeRow
            key={episode.id}
            seriesId={series.id}
            episode={episode}
            spoilerProtection={spoilerProtection}
            now={now}
            onPress={openEpisode}
            onCheck={check}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seasons: {
    gap: 8,
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  list: {
    paddingTop: 6,
    paddingHorizontal: 16,
  },
});
