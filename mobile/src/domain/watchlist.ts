/** Ma liste › Films : segments, filtres et tris — specs/docs/06 (`vals()` › watchlist). */
import { isOnMyPlatforms, movieState, type MovieAvailability } from './availability';
import { parseLocalDate } from './dates';
import type { UserTitle } from './types';

export type LibraryMovie = MovieAvailability & {
  id: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  imdbRating?: number;
  /** Repli du tri par date de sortie quand la sortie en salle est inconnue. */
  releaseDigital?: string;
  year?: number;
  userTitle: UserTitle;
};

export type FilmSegment = 'towatch' | 'watched';
export type FilmFilter = 'all' | 'mine' | 'cinema' | 'upcoming';
export type FilmSort = 'added' | 'release' | 'title' | 'imdb';

export const FILM_SORTS: readonly { value: FilmSort; label: string }[] = [
  { value: 'added', label: "Date d'ajout" },
  { value: 'release', label: 'Date de sortie' },
  { value: 'title', label: 'Titre' },
  { value: 'imdb', label: 'Note IMDb' },
];

export const FILM_FILTERS: readonly { value: FilmFilter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'mine', label: 'Sur mes plateformes' },
  { value: 'cinema', label: 'Au cinéma' },
  { value: 'upcoming', label: 'Pas encore sorti' },
];

export function filmsInSegment<T extends LibraryMovie>(films: readonly T[], segment: FilmSegment) {
  return films.filter((film) => film.userTitle.status === segment);
}

export function filterFilms<T extends LibraryMovie>(
  films: readonly T[],
  filter: FilmFilter,
  myProviderIds: readonly number[],
  now: Date,
): T[] {
  switch (filter) {
    case 'all':
      return [...films];
    case 'mine':
      return films.filter(
        (film) =>
          movieState(film, now) === 'avail' && isOnMyPlatforms(film.availability, myProviderIds),
      );
    case 'cinema':
    case 'upcoming':
      return films.filter((film) => movieState(film, now) === filter);
  }
}

function time(iso: string | undefined): number {
  return iso ? new Date(iso).getTime() : 0;
}

/**
 * Date de sortie pour le tri : salle, sinon numérique, sinon 1er janvier de l'année.
 * Sans aucune date, le film passe en dernier.
 */
function releaseKey(film: LibraryMovie): number {
  const iso = film.releaseTheatrical ?? film.releaseDigital;
  if (iso) return parseLocalDate(iso).getTime();
  if (film.year) return new Date(film.year, 0, 1).getTime();
  return Number.POSITIVE_INFINITY;
}

/** Comparaison sûre : `Infinity - Infinity` vaudrait NaN. */
function compareRelease(a: number, b: number): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Libellés du sens de chaque tri : [sens par défaut, sens inversé]. */
const SORT_DIRECTION_LABELS: Record<FilmSort, readonly [string, string]> = {
  added: ['Plus récents', 'Plus anciens'],
  release: ['Plus proches', 'Plus lointains'],
  title: ['A → Z', 'Z → A'],
  imdb: ['Mieux notés', 'Moins bien notés'],
};

export function sortDirectionLabel(sort: FilmSort, reversed: boolean): string {
  return SORT_DIRECTION_LABELS[sort][reversed ? 1 : 0];
}

/**
 * Tri du segment À voir. Chaque tri a un sens par défaut (récents, plus proches, A → Z, mieux notés) ;
 * `reversed` l'inverse. Le tri est stable : à égalité, l'ordre reçu est conservé.
 * Les films sans date de sortie restent à la fin dans les deux sens.
 */
export function sortFilms<T extends LibraryMovie>(
  films: readonly T[],
  sort: FilmSort,
  reversed = false,
): T[] {
  const sign = reversed ? -1 : 1;
  const sorted = [...films];
  switch (sort) {
    case 'added':
      return sorted.sort((a, b) => sign * (time(b.userTitle.addedAt) - time(a.userTitle.addedAt)));
    case 'release':
      return sorted.sort((a, b) => {
        const keyA = releaseKey(a);
        const keyB = releaseKey(b);
        const undated = !Number.isFinite(keyA) || !Number.isFinite(keyB);
        return (undated ? 1 : sign) * compareRelease(keyA, keyB);
      });
    case 'title':
      return sorted.sort((a, b) => sign * a.title.localeCompare(b.title, 'fr'));
    case 'imdb':
      return sorted.sort((a, b) => sign * ((b.imdbRating ?? 0) - (a.imdbRating ?? 0)));
  }
}

/** Segment Vus : le plus récemment vu en premier. */
export function sortWatched<T extends LibraryMovie>(films: readonly T[]): T[] {
  return [...films].sort((a, b) => time(b.userTitle.watchedAt) - time(a.userTitle.watchedAt));
}

/** « 1 film » / « {n} films · appui long pour plus d'options ». */
export function filmCountLabel(count: number): string {
  return `${count} ${count > 1 ? 'films' : 'film'} · appui long pour plus d'options`;
}
