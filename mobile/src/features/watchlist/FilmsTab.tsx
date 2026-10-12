import { router, useScrollToTop } from 'expo-router';
import { FilmStripIcon } from 'phosphor-react-native';
import { useRef } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { removeFromList } from '@/api/libraryActions';
import { useProfile } from '@/api/profile';
import { useMovieWatchlist } from '@/api/watchlist';
import { EmptyState } from '@/components/EmptyState';
import { LoadError } from '@/components/LoadError';
import { Poster } from '@/components/Poster';
import { PosterGrid } from '@/components/PosterGrid';
import { SkeletonPoster } from '@/components/Skeleton';
import { posterBadge } from '@/domain/badge';
import {
  filmCountLabel,
  filmsInSegment,
  filterFilms,
  sortFilms,
  sortWatched,
  type LibraryMovie,
} from '@/domain/watchlist';
import { useUiStore } from '@/store/ui';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { FilmControls } from './FilmControls';
import { openFilmMenu } from './filmMenu';
import { useMinimumDelay } from './useMinimumDelay';

/** Squelettes au moins 700 ms, pour éviter un flash au premier affichage. */
const MIN_SKELETON_MS = 700;
const SKELETONS = Array.from({ length: 9 }, (_, index) => index);

/** Ma liste › Films (specs/docs/06). */
export function FilmsTab() {
  const listRef = useRef<FlatList<LibraryMovie>>(null);
  useScrollToTop(listRef);
  const watchlist = useMovieWatchlist();
  const myProviderIds = useProfile().data?.providerIds ?? [];
  const delayDone = useMinimumDelay(MIN_SKELETON_MS);
  const { filmSegment, filmFilter, filmSort, setFilmSegment, setFilmFilter, setFilmSort } =
    useUiStore();

  const now = new Date();
  const inSegment = filmsInSegment(watchlist.data ?? [], filmSegment);
  const films =
    filmSegment === 'towatch'
      ? sortFilms(filterFilms(inSegment, filmFilter, myProviderIds, now), filmSort, now)
      : sortWatched(inSegment);

  const controls = (
    <FilmControls
      segment={filmSegment}
      sort={filmSort}
      filter={filmFilter}
      onSegmentChange={setFilmSegment}
      onSortChange={setFilmSort}
      onFilterChange={setFilmFilter}
    />
  );

  if (!watchlist.data || !delayDone) {
    return (
      <PosterGrid<number>
        data={watchlist.isError ? [] : SKELETONS}
        keyExtractor={String}
        ListHeaderComponent={
          <View style={styles.skeletonHeader}>
            {controls}
            {watchlist.isError ? <LoadError onRetry={() => void watchlist.refetch()} /> : null}
          </View>
        }
        paddingBottom={24}
        scrollEnabled={false}
        renderPoster={(_, width) => <SkeletonPoster style={{ width }} />}
      />
    );
  }

  const empty = emptyState(filmSegment === 'watched', inSegment.length === 0, {
    discover: () => router.navigate('/(tabs)/discover'),
    showAll: () => setFilmFilter('all'),
    showToWatch: () => setFilmSegment('towatch'),
  });

  return (
    <PosterGrid<LibraryMovie>
      ref={listRef}
      data={films}
      keyExtractor={(film) => film.id}
      ListHeaderComponent={
        <View>
          {controls}
          {films.length > 0 ? (
            <Text style={styles.count}>{filmCountLabel(films.length)}</Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        // L'état vide a ses propres marges : on annule celles de la grille.
        <View style={styles.empty}>
          <EmptyState icon={FilmStripIcon} {...empty} />
        </View>
      }
      paddingBottom={24}
      refreshControl={
        <RefreshControl
          refreshing={watchlist.isRefetching}
          onRefresh={() => void watchlist.refetch()}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
      renderPoster={(film, width) => (
        <Poster
          title={film}
          badge={posterBadge({ ...film, type: 'movie' }, myProviderIds, now)}
          showAdd
          inList
          onPress={() => router.push(`/title/movie/${film.tmdbId}`)}
          onToggle={() => removeFromList({ ...film, type: 'movie' })}
          onLongPress={() => openFilmMenu(film)}
          style={{ width }}
        />
      )}
    />
  );
}

type EmptyActions = { discover: () => void; showAll: () => void; showToWatch: () => void };

function emptyState(watchedSegment: boolean, segmentEmpty: boolean, actions: EmptyActions) {
  if (watchedSegment) {
    return {
      title: "Aucun film vu pour l'instant",
      text: 'Les films que tu marques comme vus apparaîtront ici.',
      action: { label: 'Voir ma liste', onPress: actions.showToWatch },
    };
  }
  if (segmentEmpty) {
    return {
      title: 'Ta liste est vide',
      text: 'Ajoute des films pour les retrouver ici.',
      action: { label: 'Découvrir des films', onPress: actions.discover },
    };
  }
  return {
    title: 'Aucun film pour ce filtre',
    text: 'Essaie un autre filtre.',
    action: { label: 'Tout afficher', onPress: actions.showAll },
  };
}

const styles = StyleSheet.create({
  skeletonHeader: {
    paddingBottom: 14,
  },
  empty: {
    marginHorizontal: -spacing.screenX,
  },
  count: {
    ...typography.small,
    paddingTop: 12,
    paddingBottom: 8,
    color: colors.neutral500,
  },
});
