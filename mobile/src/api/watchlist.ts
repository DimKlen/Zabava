import { useQuery } from '@tanstack/react-query';

import type { MediaType } from '@/domain/types';
import type { LibraryMovie } from '@/domain/watchlist';

import { api } from './http';
import { toAvailability, toUserTitle } from './mappers';
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

/** Films de Ma liste (`GET /me/watchlist?type=movie`), triés par date d'ajout. */
export function useMovieWatchlist() {
  return useQuery({
    queryKey: watchlistKey('movie'),
    queryFn: async () =>
      (await api<WatchlistItem[]>('/me/watchlist', { query: { type: 'movie' } }))
        .map(toLibraryMovie)
        .filter((movie): movie is LibraryMovie => movie !== null),
    staleTime: FIVE_MINUTES,
  });
}
