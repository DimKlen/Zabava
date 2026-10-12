import { useQuery } from '@tanstack/react-query';

import type { LibrarySeries } from '@/domain/seriesList';
import type { MediaType } from '@/domain/types';
import type { LibraryMovie } from '@/domain/watchlist';

import { api } from './http';
import { toAvailability, toSeriesEpisodes, toUserTitle } from './mappers';
import type { components } from './types';

type WatchlistItem = components['schemas']['WatchlistItem'];

const FIVE_MINUTES = 5 * 60 * 1000;

export const watchlistKey = (type: MediaType) => ['watchlist', type] as const;

export function toLibraryMovie(item: WatchlistItem): LibraryMovie | null {
  if (item.tmdbId === undefined) return null;
  const id = item.id ?? `movie-${item.tmdbId}`;
  const userTitle = toUserTitle(item.userTitle, id);
  if (!userTitle) return null;
  return {
    id,
    tmdbId: item.tmdbId,
    title: item.title ?? '',
    posterPath: item.posterPath,
    imdbRating: item.imdbRating,
    releaseTheatrical: item.releaseTheatrical,
    availability: toAvailability(item.availability),
    userTitle,
  };
}

export function toLibrarySeries(item: WatchlistItem, type: 'tv' | 'anime'): LibrarySeries | null {
  if (item.tmdbId === undefined) return null;
  const id = item.id ?? `${type}-${item.tmdbId}`;
  const userTitle = toUserTitle(item.userTitle, id);
  if (!userTitle) return null;
  return {
    id,
    tmdbId: item.tmdbId,
    type,
    title: item.title ?? '',
    posterPath: item.posterPath,
    network: item.network,
    ended: item.ended,
    availability: toAvailability(item.availability),
    userTitle,
    episodes: toSeriesEpisodes(item.episodes),
  };
}

const fetchWatchlist = (type: MediaType) =>
  api<WatchlistItem[]>('/me/watchlist', { query: { type } });

/** Films de Ma liste (`GET /me/watchlist?type=movie`), triés par date d'ajout. */
export function useMovieWatchlist() {
  return useQuery({
    queryKey: watchlistKey('movie'),
    queryFn: async () =>
      (await fetchWatchlist('movie'))
        .map(toLibraryMovie)
        .filter((movie): movie is LibraryMovie => movie !== null),
    staleTime: FIVE_MINUTES,
  });
}

/** Séries ou animés de Ma liste, avec tous leurs épisodes et ceux que j'ai vus. */
export function useSeriesWatchlist(type: 'tv' | 'anime') {
  return useQuery({
    queryKey: watchlistKey(type),
    queryFn: async () =>
      (await fetchWatchlist(type))
        .map((item) => toLibrarySeries(item, type))
        .filter((series): series is LibrarySeries => series !== null),
    staleTime: FIVE_MINUTES,
  });
}
