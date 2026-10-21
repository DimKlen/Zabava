/** Fiche série : méta, Créateurs, Infos, libellés d'épisodes — specs/docs/07 §7.1 et §7.2. */
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

export function seriesCrew(
  creators: string[],
  networks: string[],
  creatorIds: number[] = [],
  studios: { id: number; name: string }[] = [],
): InfoRow[] {
  return [
    ...personRow('Création', creators, creatorIds),
    ...(studios.length > 0
      ? [{ key: 'Studio', value: studios.map((s) => s.name).join(', '), studios }]
      : []),
    ...rows([['Diffusion', networks.join(', ')]]),
  ];
}

/** « 4 saisons · 38 épisodes » (Spéciaux exclus). */
export function seasonsSummary(
  seasons: { number: number; episodeCount?: number }[],
): string | undefined {
  const regular = seasons.filter((season) => season.number > 0);
  if (regular.length === 0) return undefined;
  const episodes = regular.reduce((sum, season) => sum + (season.episodeCount ?? 0), 0);
  const seasonsLabel = `${regular.length} ${regular.length > 1 ? 'saisons' : 'saison'}`;
  return `${seasonsLabel} · ${episodes} ${episodes > 1 ? 'épisodes' : 'épisode'}`;
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
    ['Titre original', series.originalTitle],
    ['Genres', series.genres.join(', ')],
    ['Saisons', seasonsSummary(series.seasons)],
    ['Langue originale', series.originalLanguage],
    ['Pays', series.country],
  ]);
}

/** « Prochain épisode : S03 E04 le 14 oct. », s'il y a un épisode à venir daté. */
export function nextEpisodeLine(info: SeriesInfo): string | undefined {
  const upcoming = info.upcoming;
  const date = upcoming ? episodeAirDate(upcoming) : undefined;
  if (!upcoming || !date) return undefined;
  return `Prochain épisode : ${episodeCode(upcoming.season, upcoming.number)} le ${formatShortDate(date)}`;
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

export const SPOILER_SYNOPSIS = "Synopsis masqué tant que l'épisode n'est pas vu (anti-spoiler).";
