/**
 * Formats fr-CA — specs/docs/10 §5.
 */
import { parseLocalDate } from './dates';

/** Jour court : « 2026-12-18 » → « 18 déc. » (`fShort`). */
export function formatShortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
}

/** Date longue : « 2026-12-18 » → « 18 décembre 2026 » (`fLong`). */
export function formatLongDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString('fr-CA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const NBSP = '\u00a0';

/** Note sur 10 avec virgule décimale : 8.5 → « 8,5/10 ». */
export function formatRating(rating: number): string {
  return `${rating.toLocaleString('fr-CA', { maximumFractionDigits: 1 })}/10`;
}

/** Votes IMDb : 640 312 → « 640 k votes », 1 412 000 → « 1,4 M votes ». */
export function formatVotes(votes: number): string {
  if (votes < 1_000_000) return `${Math.round(votes / 1000)} k votes`;
  const millions = (votes / 1_000_000).toLocaleString('fr-CA', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${millions} M votes`;
}

/** Pourcentage avec espace insécable : 92 → « 92 % ». */
export function formatPercent(value: number): string {
  return `${Math.round(value)}${NBSP}%`;
}

/** Durée : 166 → « 2 h 46 », 45 → « 45 min », absente → « Durée inconnue » (`fRun`). */
export function formatRuntime(minutes: number | undefined): string {
  if (!minutes) return 'Durée inconnue';
  if (minutes >= 60)
    return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
  return `${minutes} min`;
}

/** Code d'épisode : (4, 3) → « S04 E03 ». */
export function episodeCode(season: number, episode: number): string {
  return `S${String(season).padStart(2, '0')} E${String(episode).padStart(2, '0')}`;
}
