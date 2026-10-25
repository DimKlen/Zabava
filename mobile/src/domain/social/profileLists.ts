/**
 * Listes du profil d'un ami (onglets Films / Séries / Animés) — specs/social/docs/03 ›
 * ProfileLists et docs/04 §4.2 (`A.profVM` du prototype).
 */
import type { MediaType } from '../types';

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

/** Affiche d'une grille de profil ; `progress` sous les séries En cours. */
export type ProfileGridItem = {
  id: string;
  tmdbId: number;
  type: MediaType;
  title: string;
  posterPath?: string;
  progress?: { code: string; pct: number };
};
