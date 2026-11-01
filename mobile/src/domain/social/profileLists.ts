/**
 * Listes du profil d'un ami (onglets Films / Séries / Animés) — specs/social/docs/03 ›
 * ProfileLists et docs/04 §4.2 (`A.profVM` du prototype).
 */
import { t } from '@/i18n';

import type { MediaType } from '../types';

export type MovieSegment = 'towatch' | 'watched';
export type SeriesSegment = 'in_progress' | 'finished' | 'towatch';
export type ProfileSegment = MovieSegment | SeriesSegment;

export function profileTabs(): { key: MediaType; label: string }[] {
  return [
    { key: 'movie', label: t('social.tab.movie') },
    { key: 'tv', label: t('social.tab.tv') },
    { key: 'anime', label: t('social.tab.anime') },
  ];
}

export function movieSegments(): { key: MovieSegment; label: string }[] {
  return [
    { key: 'towatch', label: t('social.segment.towatch') },
    { key: 'watched', label: t('social.segment.watched') },
  ];
}

export function seriesSegments(): { key: SeriesSegment; label: string }[] {
  return [
    { key: 'in_progress', label: t('social.segment.inProgress') },
    { key: 'finished', label: t('social.segment.finished') },
    { key: 'towatch', label: t('social.segment.towatch') },
  ];
}

/** Segment par défaut : Vus pour les films, En cours pour les séries. */
export function defaultSegment(tab: MediaType): ProfileSegment {
  return tab === 'movie' ? 'watched' : 'in_progress';
}

/** Le segment existe-t-il pour cet onglet (changement d'onglet) ? */
export function segmentFor(tab: MediaType, segment: ProfileSegment): ProfileSegment {
  const options = tab === 'movie' ? movieSegments() : seriesSegments();
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
