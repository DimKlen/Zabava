/**
 * Listes d'un profil (onglets Films / Séries / Animés) — specs/social/docs/03 › ProfileLists et
 * docs/04 §4.2 (`A.profVM` du prototype). Mon profil se calcule à partir du cache de Ma liste.
 */
import { episodeCode } from '../format';
import { isWatched, seriesInfo, seriesSection, type SeriesSection } from '../series';
import type { LibrarySeries } from '../seriesList';
import type { MediaType } from '../types';
import type { LibraryMovie } from '../watchlist';

export type MovieSegment = 'towatch' | 'watched';
export type SeriesSegment = 'in_progress' | 'finished' | 'towatch';
export type ProfileSegment = MovieSegment | SeriesSegment;

export const PROFILE_TABS: readonly { key: MediaType; label: string }[] = [
  { key: 'movie', label: 'Films' },
  { key: 'tv', label: 'Séries' },
  { key: 'anime', label: 'Animés' },
];

export const MOVIE_SEGMENTS: readonly { key: MovieSegment; label: string }[] = [
  { key: 'towatch', label: 'À voir' },
  { key: 'watched', label: 'Vus' },
];

export const SERIES_SEGMENTS: readonly { key: SeriesSegment; label: string }[] = [
  { key: 'in_progress', label: 'En cours' },
  { key: 'finished', label: 'Terminées' },
  { key: 'towatch', label: 'À voir' },
];

/** Segment par défaut : Vus pour les films, En cours pour les séries. */
export function defaultSegment(tab: MediaType): ProfileSegment {
  return tab === 'movie' ? 'watched' : 'in_progress';
}

/** Le segment existe-t-il pour cet onglet (changement d'onglet) ? */
export function segmentFor(tab: MediaType, segment: ProfileSegment): ProfileSegment {
  const options = tab === 'movie' ? MOVIE_SEGMENTS : SERIES_SEGMENTS;
  return options.some((option) => option.key === segment) ? segment : defaultSegment(tab);
}

/**
 * Section de Ma liste → segment du profil : À regarder, Pas regardé depuis un moment et À jour
 * → En cours ; Terminées → Terminées ; Pas encore commencées → À voir ; Abandonnées : exclues.
 */
export function mySeriesBucket(section: SeriesSection): SeriesSegment | null {
  switch (section) {
    case 'watch':
    case 'stale':
    case 'uptodate':
      return 'in_progress';
    case 'done':
      return 'finished';
    case 'notstarted':
      return 'towatch';
    default:
      return null;
  }
}

/** Affiche d'une grille de profil ; `progress` sous les séries En cours. */
export type ProfileGridItem = {
  id: string;
  tmdbId: number;
  type: MediaType;
  title: string;
  posterPath?: string;
  progress?: { code: string; pct: number };
};

const time = (iso: string | undefined) => (iso ? new Date(iso).getTime() : 0);

/** Mes films : À voir par date d'ajout, Vus par date de visionnage, récents d'abord. */
export function myMovieGrid(
  movies: readonly LibraryMovie[],
  segment: MovieSegment,
): ProfileGridItem[] {
  const key = (movie: LibraryMovie) =>
    segment === 'watched'
      ? time(movie.userTitle.watchedAt ?? movie.userTitle.addedAt)
      : time(movie.userTitle.addedAt);
  return movies
    .filter((movie) => movie.userTitle.status === segment)
    .sort((a, b) => key(b) - key(a))
    .map((movie) => ({
      id: movie.id,
      tmdbId: movie.tmdbId,
      type: 'movie',
      title: movie.title,
      posterPath: movie.posterPath,
    }));
}

/**
 * Mes séries ou animés d'un segment. En cours et Terminées : dernier visionnage d'abord ;
 * À voir : ajout récent d'abord. Sous En cours, le dernier épisode vu et la progression.
 */
export function mySeriesGrid(
  series: readonly LibrarySeries[],
  segment: SeriesSegment,
  now: Date,
): ProfileGridItem[] {
  return series
    .map((item) => {
      const info = seriesInfo(item.episodes, now);
      const section = seriesSection(item.userTitle, info, item.ended, now);
      return { item, info, bucket: section ? mySeriesBucket(section) : null };
    })
    .filter(({ bucket }) => bucket === segment)
    .map(({ item, info }) => {
      const sortKey =
        segment === 'towatch'
          ? time(item.userTitle.addedAt)
          : (info.lastWatchedAt ?? time(item.userTitle.addedAt));
      const lastSeen = [...info.aired].reverse().find(isWatched);
      const progress =
        segment === 'in_progress' && lastSeen
          ? { code: episodeCode(lastSeen.season, lastSeen.number), pct: info.progress }
          : undefined;
      return {
        sortKey,
        grid: {
          id: item.id,
          tmdbId: item.tmdbId,
          type: item.type,
          title: item.title,
          posterPath: item.posterPath,
          progress,
        } satisfies ProfileGridItem,
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ grid }) => grid);
}
