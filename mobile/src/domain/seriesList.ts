/** Ma liste › Séries / Animés : sections, ordre et libellés — specs/docs/06 (`vals()` › series). */
import { t } from '@/i18n';

import type { Availability, UserTitle } from './types';
import { isOnMyPlatforms } from './availability';
import { episodeCode, formatShortDate } from './format';
import {
  episodeAirDate,
  seriesInfo,
  seriesSection,
  type SeriesEpisode,
  type SeriesInfo,
  type SeriesSection,
} from './series';

export type LibrarySeries = {
  id: string;
  tmdbId: number;
  type: 'tv' | 'anime';
  title: string;
  posterPath?: string;
  network?: string;
  ended?: boolean;
  availability: Availability;
  userTitle: UserTitle;
  episodes: SeriesEpisode[];
};

export type SectionKind = 'cards' | 'carousel' | 'rows';

const SECTION_KINDS: readonly (readonly [SeriesSection, SectionKind])[] = [
  ['watch', 'cards'],
  ['stale', 'cards'],
  ['notstarted', 'carousel'],
  ['uptodate', 'rows'],
  ['done', 'rows'],
  ['abandoned', 'rows'],
];

export const SERIES_SECTIONS: readonly { key: SeriesSection; title: string; kind: SectionKind }[] =
  SECTION_KINDS.map(([key, kind]) => ({
    key,
    kind,
    get title() {
      return t(`common.series.section.${key}`);
    },
  }));

/** Repliées par défaut : Terminées et Abandonnées. */
export const DEFAULT_COLLAPSED: Readonly<Partial<Record<SeriesSection, boolean>>> = {
  done: true,
  abandoned: true,
};

export type SeriesEntry<T extends LibrarySeries = LibrarySeries> = {
  series: T;
  info: SeriesInfo;
  /** Animé sans épisode à voir (à jour, ou pas encore sorti) : ligne grisée en bas de À regarder. */
  waiting?: boolean;
};

export type SeriesGroup<T extends LibrarySeries = LibrarySeries> = {
  key: SeriesSection;
  title: string;
  kind: SectionKind;
  entries: SeriesEntry<T>[];
};

export type SeriesFilter = 'all' | 'mine' | 'upcoming';

export const SERIES_FILTERS: readonly { value: SeriesFilter; label: string }[] = [
  {
    value: 'all',
    get label() {
      return t('common.filter.all');
    },
  },
  {
    value: 'mine',
    get label() {
      return t('common.filter.mine');
    },
  },
  {
    value: 'upcoming',
    get label() {
      return t('common.filter.notReleased');
    },
  },
];

/** « Pas encore sorti » : aucun épisode n'a encore été diffusé. */
export function filterSeries<T extends LibrarySeries>(
  list: readonly T[],
  filter: SeriesFilter,
  myProviderIds: readonly number[],
  now: Date,
): T[] {
  switch (filter) {
    case 'all':
      return [...list];
    case 'mine':
      return list.filter((series) => isOnMyPlatforms(series.availability, myProviderIds));
    case 'upcoming':
      return list.filter((series) => seriesInfo(series.episodes, now).aired.length === 0);
  }
}

const time = (iso: string) => new Date(iso).getTime();

/**
 * Animés (retours du 2026-11-15) : ni « Pas encore commencées » ni « À jour ». Un animé non
 * commencé dont un épisode est sorti est une carte de À regarder (S01 E01) ; sans épisode à voir
 * (à jour, ou pas encore sorti), il passe en ligne grisée sous les cartes de À regarder.
 */
function animeEntry<T extends LibrarySeries>(
  section: SeriesSection,
  entry: SeriesEntry<T>,
): [SeriesSection, SeriesEntry<T>] {
  if (section === 'uptodate') return ['watch', { ...entry, waiting: true }];
  if (section === 'notstarted') {
    return ['watch', entry.info.next ? entry : { ...entry, waiting: true }];
  }
  return [section, entry];
}

/** Ligne grisée : prochaine diffusion la plus proche d'abord, puis les animés sans date. */
function nextAirTime(entry: SeriesEntry): number {
  const date = entry.info.upcoming ? episodeAirDate(entry.info.upcoming) : undefined;
  return date?.getTime() ?? Number.POSITIVE_INFINITY;
}

function sortEntries<T extends LibrarySeries>(
  entries: SeriesEntry<T>[],
  kind: SectionKind,
): SeriesEntry<T>[] {
  if (kind !== 'cards') {
    return entries.sort(
      (a, b) => time(b.series.userTitle.addedAt) - time(a.series.userTitle.addedAt),
    );
  }
  // Cartes : dernier visionnage le plus récent, les non commencées ensuite (ajout le plus récent).
  const cards = entries
    .filter((entry) => !entry.waiting)
    .sort(
      (a, b) =>
        (b.info.lastWatchedAt ?? 0) - (a.info.lastWatchedAt ?? 0) ||
        time(b.series.userTitle.addedAt) - time(a.series.userTitle.addedAt),
    );
  const waiting = entries
    .filter((entry) => entry.waiting)
    .sort((a, b) => nextAirTime(a) - nextAirTime(b));
  return [...cards, ...waiting];
}

/** Sections non vides, dans l'ordre de la spec, avec leur tri. */
export function groupSeries<T extends LibrarySeries>(
  list: readonly T[],
  now: Date,
): SeriesGroup<T>[] {
  const groups = new Map<SeriesSection, SeriesEntry<T>[]>();
  for (const series of list) {
    const info = seriesInfo(series.episodes, now);
    const anime = series.type === 'anime';
    // TMDB marque « terminée » des animés dont la suite est annoncée plus tard : on ne les
    // range jamais dans Terminées, pour ne rien promettre ni dans un sens ni dans l'autre.
    const section = seriesSection(series.userTitle, info, anime ? false : series.ended, now);
    if (!section) continue;
    const [key, entry] = anime
      ? animeEntry(section, { series, info })
      : [section, { series, info }];
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return SERIES_SECTIONS.flatMap(({ key, title, kind }) => {
    const entries = groups.get(key);
    return entries ? [{ key, title, kind, entries: sortEntries(entries, kind) }] : [];
  });
}

/** Titre d'un épisode : « Épisode {n} » si l'anti-spoiler le masque ou s'il n'a pas de nom. */
export function episodeTitle(episode: SeriesEpisode, spoilerProtection: boolean): string {
  const hidden = spoilerProtection && !episode.watchedAt;
  return !hidden && episode.name
    ? episode.name
    : t('common.series.episodeN', { number: episode.number });
}

/** Carte : « S04 E03 · Titre ». */
export function cardEpisodeLabel(episode: SeriesEpisode, spoilerProtection: boolean): string {
  return `${episodeCode(episode.season, episode.number)} · ${episodeTitle(episode, spoilerProtection)}`;
}

/** « {n} épisodes restants » si n > 1, sinon « Dernier épisode disponible ». */
export function remainingLabel(remaining: number): string {
  return remaining > 1
    ? t('common.series.remaining', { count: remaining })
    : t('common.series.lastAvailable');
}

/** Libellé des lignes compactes (À jour, Terminées, Abandonnées). */
export function compactRowLabel(section: SeriesSection, info: SeriesInfo): string {
  switch (section) {
    case 'done':
      return t('common.series.rowDone', { count: info.aired.length });
    case 'abandoned':
      return t('common.series.rowAbandoned', {
        watched: info.watchedCount,
        total: info.aired.length,
      });
    default: {
      const date = info.upcoming ? episodeAirDate(info.upcoming) : undefined;
      return date
        ? t('common.series.rowNext', { date: formatShortDate(date) })
        : t('common.series.rowWaiting');
    }
  }
}
