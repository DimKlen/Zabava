/** Fiche série : méta, Créateurs, Infos, libellés d'épisodes — specs/docs/07 §7.1 et §7.2. */
import { t } from '@/i18n';
import { tPlural } from '@/lib/plural';

import {
  episodeCode,
  formatLongDate,
  formatRelativeDay,
  formatRuntime,
  formatShortDate,
  formatTime,
} from './format';
import { personRow, type InfoRow } from './movieDetail';
import { episodeAirDate, isAired, type SeriesEpisode, type SeriesInfo } from './series';

const rows = (entries: [string, string | undefined][]): InfoRow[] =>
  entries.flatMap(([key, value]) => (value ? [{ key, value }] : []));

/** « 2022 · Disney+ · En cours », en omettant les valeurs absentes. */
export function seriesMeta(year?: number, platform?: string, status?: string): string {
  return [year, platform, status].filter((part) => part !== undefined && part !== '').join(' · ');
}

/** Studios affichés sur la fiche d'un animé : les 3 premiers de TMDB (les plus importants). */
export const MAX_STUDIOS = 3;

export function seriesCrew(
  creators: string[],
  networks: string[],
  creatorIds: number[] = [],
  studios: { id: number; name: string }[] = [],
): InfoRow[] {
  return [
    ...personRow(t('common.crew.creation'), creators, creatorIds),
    ...studioRow(studios.slice(0, MAX_STUDIOS)),
    ...rows([[t('common.crew.broadcast'), networks.join(', ')]]),
  ];
}

function studioRow(studios: { id: number; name: string }[]): InfoRow[] {
  if (studios.length === 0) return [];
  return [{ key: t('common.info.studio'), value: studios.map((s) => s.name).join(', '), studios }];
}

/** « 4 saisons · 38 épisodes » (Spéciaux exclus). */
export function seasonsSummary(
  seasons: { number: number; episodeCount?: number }[],
): string | undefined {
  const regular = seasons.filter((season) => season.number > 0);
  if (regular.length === 0) return undefined;
  const episodes = regular.reduce((sum, season) => sum + (season.episodeCount ?? 0), 0);
  const seasonsLabel = tPlural('common.series.seasons', regular.length);
  return `${seasonsLabel} · ${tPlural('common.series.episodes', episodes)}`;
}

export type SeriesInfoInput = {
  originalTitle?: string;
  genres: string[];
  seasons: { number: number; episodeCount?: number }[];
  originalLanguage?: string;
  country?: string;
};

export function seriesInfos(series: SeriesInfoInput): InfoRow[] {
  return rows([
    [t('common.info.originalTitle'), series.originalTitle],
    [t('common.info.genres'), series.genres.join(', ')],
    [t('common.info.seasons'), seasonsSummary(series.seasons)],
    [t('common.info.originalLanguage'), series.originalLanguage],
    [t('common.info.country'), series.country],
  ]);
}

/** « Prochain épisode : S03 E04 le 14 oct. », s'il y a un épisode à venir daté. */
export function nextEpisodeLine(info: SeriesInfo): string | undefined {
  const upcoming = info.upcoming;
  const date = upcoming ? episodeAirDate(upcoming) : undefined;
  if (!upcoming || !date) return undefined;
  return t('common.series.nextEpisodeLine', {
    code: episodeCode(upcoming.season, upcoming.number),
    date: formatShortDate(date),
  });
}

/** Jour (et heure si connue) d'un épisode à venir : « Demain · 21 h 00 ». */
function upcomingParts(episode: SeriesEpisode, now: Date): string[] {
  const date = episodeAirDate(episode);
  if (!date) return [];
  return episode.airstamp
    ? [formatRelativeDay(date, now), formatTime(date)]
    : [formatRelativeDay(date, now)];
}

/**
 * Méta d'une ligne d'épisode : diffusé → « 3 octobre 2026 · 32 min » ;
 * à venir → « Demain · 21 h 00 ».
 */
export function episodeRowMeta(episode: SeriesEpisode, now: Date): string {
  const date = episodeAirDate(episode);
  if (date && isAired(episode, now)) {
    return `${formatLongDate(date)} · ${formatRuntime(episode.runtime)}`;
  }
  return upcomingParts(episode, now).join(' · ');
}

/** Méta de la fiche épisode : la durée s'ajoute aussi aux épisodes à venir. */
export function episodeSheetMeta(episode: SeriesEpisode, now: Date): string {
  const date = episodeAirDate(episode);
  if (date && isAired(episode, now)) {
    return `${formatLongDate(date)} · ${formatRuntime(episode.runtime)}`;
  }
  return [...upcomingParts(episode, now), formatRuntime(episode.runtime)].join(' · ');
}

export function spoilerSynopsis(): string {
  return t('common.series.spoilerSynopsis');
}
