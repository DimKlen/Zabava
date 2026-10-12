/** Ma liste › Films : segments, filtres et tris — specs/docs/06 (`vals()` › watchlist). */
import { isOnMyPlatforms, movieState, type MovieAvailability } from './availability';
import { daysFromToday } from './dates';
import type { UserTitle } from './types';

export type LibraryMovie = MovieAvailability & {
  id: string;
  tmdbId: number;
  title: string;
  posterPath?: string;
  imdbRating?: number;
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

/** Sortie en salle en jours ; sans date, le film passe en dernier. */
function releaseKey(film: LibraryMovie, now: Date): number {
  return film.releaseTheatrical
    ? daysFromToday(film.releaseTheatrical, now)
    : Number.POSITIVE_INFINITY;
}

/** Tri du segment À voir. Le tri est stable : à égalité, l'ordre reçu est conservé. */
export function sortFilms<T extends LibraryMovie>(
  films: readonly T[],
  sort: FilmSort,
  now: Date,
): T[] {
  const sorted = [...films];
  switch (sort) {
    case 'added':
      return sorted.sort((a, b) => time(b.userTitle.addedAt) - time(a.userTitle.addedAt));
    case 'release':
      return sorted.sort((a, b) => releaseKey(a, now) - releaseKey(b, now));
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    case 'imdb':
      return sorted.sort((a, b) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0));
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
