/**
 * Formats de dates et de nombres dans la langue courante — specs/docs/10 §5 (exemples en français).
 */
import { currentLanguage, t } from '@/i18n';

import { calendarDaysBetween, parseLocalDate } from './dates';

const asDate = (value: string | Date) =>
  typeof value === 'string' ? parseLocalDate(value) : value;

/** Jour court : « 2026-12-18 » → « 18 déc. » (`fShort`). */
export function formatShortDate(value: string | Date): string {
  return asDate(value).toLocaleDateString(currentLanguage(), { day: 'numeric', month: 'short' });
}

/** Date longue : « 2026-12-18 » → « 18 décembre 2026 » (`fLong`). */
export function formatLongDate(value: string | Date): string {
  return asDate(value).toLocaleDateString(currentLanguage(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Jour relatif : « Aujourd'hui », « Demain », sinon « ven. 16 oct. » (`fDay`). */
export function formatRelativeDay(date: Date, now: Date): string {
  const days = calendarDaysBetween(now, date);
  if (days === 0) return t('common.format.today');
  if (days === 1) return t('common.format.tomorrow');
  return date.toLocaleDateString(currentLanguage(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** Heure locale : « 21 h 00 » en français, « 9:00 PM » en anglais, « 21:00 » ailleurs. */
export function formatTime(date: Date): string {
  const language = currentLanguage();
  const hour = language === 'fr' ? '2-digit' : 'numeric';
  const text = date.toLocaleTimeString(language, { hour, minute: '2-digit' });
  return language === 'fr' ? text.replace(':', ' h ') : text;
}

const NBSP = '\u00a0';

/** Note sur 10 avec virgule décimale : 8.5 → « 8,5/10 ». */
export function formatRating(rating: number): string {
  return `${rating.toLocaleString(currentLanguage(), { maximumFractionDigits: 1 })}/10`;
}

/** Votes IMDb : 640 312 → « 640 k votes », 1 412 000 → « 1,4 M votes ». */
export function formatVotes(votes: number): string {
  if (votes < 1_000_000) {
    return t('common.format.votes.thousands', { count: Math.round(votes / 1000) });
  }
  const count = (votes / 1_000_000).toLocaleString(currentLanguage(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return t('common.format.votes.millions', { count });
}

/** Pourcentage : 92 → « 92 % » (espace insécable en français, allemand et espagnol), « 92% » ailleurs. */
export function formatPercent(value: number): string {
  const spaced = ['fr', 'de', 'es'].includes(currentLanguage());
  return `${Math.round(value)}${spaced ? NBSP : ''}%`;
}

/** Durée : 166 → « 2 h 46 », 45 → « 45 min », absente → « Durée inconnue » (`fRun`). */
export function formatRuntime(minutes: number | undefined): string {
  if (!minutes) return t('common.format.runtime.unknown');
  if (minutes >= 60) {
    return t('common.format.runtime.hoursMinutes', {
      hours: Math.floor(minutes / 60),
      minutes: String(minutes % 60).padStart(2, '0'),
    });
  }
  return t('common.format.runtime.minutes', { minutes });
}

/** Code d'épisode : (4, 3) → « S04 E03 ». */
export function episodeCode(season: number, episode: number): string {
  return `S${String(season).padStart(2, '0')} E${String(episode).padStart(2, '0')}`;
}
