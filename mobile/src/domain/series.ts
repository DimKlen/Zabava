/**
 * Suivi des séries et animés — specs/docs/01 §3–4 (`A.sInfo`, `A.sec`, `A.checkEp`).
 * Les épisodes spéciaux (saison 0) sont ignorés dans tous les calculs.
 */
import { parseLocalDate } from './dates';
import type { UserTitle } from './types';

export type SeriesEpisode = {
  id: number;
  season: number;
  number: number;
  name?: string;
  overview?: string;
  stillPath?: string;
  /** Jour de diffusion (ISO, sans heure). */
  airDate?: string;
  /** Instant exact de diffusion (TVmaze), s'il est connu. */
  airstamp?: string;
  runtime?: number;
  imdbRating?: number;
  watchedAt?: string;
};

export type SeriesSection = 'watch' | 'stale' | 'notstarted' | 'uptodate' | 'done' | 'abandoned';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Au-delà de 30 jours sans visionnage : « Pas regardé depuis un moment ». */
const STALE_DAYS = 30;

/** Date de diffusion locale : l'instant TVmaze, sinon minuit du jour annoncé. */
export function episodeAirDate(episode: SeriesEpisode): Date | undefined {
  if (episode.airstamp) return new Date(episode.airstamp);
  if (episode.airDate) return parseLocalDate(episode.airDate);
  return undefined;
}

/** Diffusé = date de diffusion passée. Sans aucune date, l'épisode n'est pas diffusé. */
export function isAired(episode: SeriesEpisode, now: Date): boolean {
  const date = episodeAirDate(episode);
  return date !== undefined && date.getTime() <= now.getTime();
}

export const isWatched = (episode: SeriesEpisode) => episode.watchedAt !== undefined;

/** Ordre (saison, numéro). */
export function compareEpisodes(a: SeriesEpisode, b: SeriesEpisode): number {
  return a.season - b.season || a.number - b.number;
}

export type SeriesInfo = {
  /** Épisodes hors spéciaux, dans l'ordre. */
  episodes: SeriesEpisode[];
  aired: SeriesEpisode[];
  watchedCount: number;
  /** Prochain épisode : premier diffusé non vu. */
  next?: SeriesEpisode;
  /** Premier épisode à venir qui a une date. */
  upcoming?: SeriesEpisode;
  remaining: number;
  /** round(vus / diffusés × 100). */
  progress: number;
  /** Dernier visionnage (ms), ou undefined si aucun épisode vu. */
  lastWatchedAt?: number;
  /** Dernière saison qui a au moins un épisode diffusé. */
  lastAiredSeason: number;
};

export function seriesInfo(all: readonly SeriesEpisode[], now: Date): SeriesInfo {
  const episodes = all.filter((episode) => episode.season > 0).sort(compareEpisodes);
  const aired = episodes.filter((episode) => isAired(episode, now));
  const watchedCount = aired.filter(isWatched).length;
  const watchedTimes = episodes.flatMap((episode) =>
    episode.watchedAt ? [new Date(episode.watchedAt).getTime()] : [],
  );
  return {
    episodes,
    aired,
    watchedCount,
    next: aired.find((episode) => !isWatched(episode)),
    upcoming: episodes.find(
      (episode) => !isAired(episode, now) && episodeAirDate(episode) !== undefined,
    ),
    remaining: aired.length - watchedCount,
    progress: Math.round((watchedCount / Math.max(1, aired.length)) * 100),
    lastWatchedAt: watchedTimes.length > 0 ? Math.max(...watchedTimes) : undefined,
    lastAiredSeason: aired.at(-1)?.season ?? 0,
  };
}

/** Section de Ma liste (`A.sec`), ou null si la série n'est pas dans la liste. */
export function seriesSection(
  userTitle: UserTitle | undefined,
  info: SeriesInfo,
  ended: boolean | undefined,
  now: Date,
): SeriesSection | null {
  if (!userTitle) return null;
  if (userTitle.status === 'abandoned') return 'abandoned';
  if (info.watchedCount === 0) return 'notstarted';
  if (info.next) {
    const last = info.lastWatchedAt ?? Number.NEGATIVE_INFINITY;
    return now.getTime() - last > STALE_DAYS * DAY_MS ? 'stale' : 'watch';
  }
  return ended ? 'done' : 'uptodate';
}

/**
 * Épisodes diffusés non vus avant `episode` (dialogue « Marquer aussi… »).
 * Un épisode spécial n'en a jamais.
 */
export function previousUnwatched(
  all: readonly SeriesEpisode[],
  episode: SeriesEpisode,
  now: Date,
): SeriesEpisode[] {
  if (episode.season === 0) return [];
  return seriesInfo(all, now).aired.filter(
    (other) => compareEpisodes(other, episode) < 0 && !isWatched(other),
  );
}

/** Titre du dialogue des épisodes précédents. */
export function previousDialogTitle(count: number): string {
  return count === 1
    ? "Marquer aussi l'épisode précédent ?"
    : `Marquer aussi les ${count} épisodes précédents ?`;
}

export type SeasonProgress = {
  /** Tous les épisodes de la saison, diffusés ou non. */
  total: number;
  watched: number;
  aired: SeriesEpisode[];
  /** Tous les épisodes diffusés sont vus : le bouton affiche « Saison vue ». */
  complete: boolean;
};

export function seasonProgress(
  seasonEpisodes: readonly SeriesEpisode[],
  now: Date,
): SeasonProgress {
  const aired = seasonEpisodes.filter((episode) => isAired(episode, now));
  const watched = aired.filter(isWatched).length;
  return {
    total: seasonEpisodes.length,
    watched,
    aired,
    complete: aired.length > 0 && watched === aired.length,
  };
}

/**
 * « Tout marquer comme vu » coche les épisodes diffusés non vus ;
 * « Saison vue » décoche tous les épisodes diffusés.
 */
export function seasonToggle(
  seasonEpisodes: readonly SeriesEpisode[],
  now: Date,
): { watched: boolean; episodes: SeriesEpisode[] } {
  const progress = seasonProgress(seasonEpisodes, now);
  return progress.complete
    ? { watched: false, episodes: progress.aired }
    : { watched: true, episodes: progress.aired.filter((episode) => !isWatched(episode)) };
}

/** Saisons de la fiche : 1, 2… puis Spéciaux (0) en dernier. */
export function seasonNumbers(all: readonly SeriesEpisode[]): number[] {
  const numbers = [...new Set(all.map((episode) => episode.season))];
  return [...numbers.filter((n) => n > 0).sort((a, b) => a - b), ...numbers.filter((n) => n === 0)];
}

/** Saison par défaut : celle du prochain épisode, sinon du prochain à venir, sinon la dernière. */
export function defaultSeason(all: readonly SeriesEpisode[], now: Date): number {
  const info = seriesInfo(all, now);
  return (
    info.next?.season ??
    info.upcoming?.season ??
    info.episodes.at(-1)?.season ??
    seasonNumbers(all)[0] ??
    1
  );
}
