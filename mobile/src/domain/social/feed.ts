/**
 * Fil d'activité — specs/social/docs/04 §4.11 et docs/07 §1 (`A.actVM`, `dayLabel`, `when` du
 * prototype).
 */
import { calendarDaysBetween } from '../dates';
import { episodeCode, formatRelativeDay, formatShortDate, formatTime } from '../format';
import type { MediaType } from '../types';

import { firstName, type Member } from './members';

export type ActivityType =
  'added' | 'watched_movie' | 'started_show' | 'watched_episodes' | 'finished_show' | 'followed';

export type ActivityTitle = {
  id: string;
  tmdbId: number;
  type: MediaType;
  title: string;
  posterPath?: string;
};

export type ActivityEpisode = {
  id: number;
  season: number;
  number: number;
  name?: string;
  stillPath?: string;
};

export type FeedActivity = {
  id: string;
  /** Moment affiché : dernière mise à jour de l'activité (ISO). */
  createdAt: string;
  actor: Member;
  type: ActivityType;
  title?: ActivityTitle;
  episode?: ActivityEpisode;
  /** Épisodes vus ce jour-là (`watched_episodes`). */
  count: number;
  /** Personne suivie (`followed`). */
  target?: Member;
  /** Le titre est aussi dans ma liste : pastille de coche sur l'affiche. */
  inMyList: boolean;
};

/** Visuel de droite : affiche du titre, vignette de l'épisode ou avatar de la personne suivie. */
export type ActivityVisual = 'poster' | 'still' | 'avatar';

/** Phrase « **Léa** a vu S03 E04 « Titre » de **The Bear** » découpée pour la mise en forme. */
export type ActivitySentence = {
  name: string;
  verb: string;
  /** En gras : titre de l'œuvre, ou prénom de la personne suivie. */
  title: string;
  tail: string;
  visual: ActivityVisual;
};

/**
 * Phrase d'une activité. Anti-spoiler actif : un épisode que je n'ai pas vu perd son titre et sa
 * vignette (l'affiche reste).
 */
export function activitySentence(
  activity: FeedActivity,
  myWatchedEpisodes: ReadonlySet<number>,
  spoilerProtection: boolean,
): ActivitySentence {
  const name = firstName(activity.actor.displayName);
  const title = activity.title?.title ?? '';
  const base = { name, title, tail: '', visual: 'poster' as ActivityVisual };
  switch (activity.type) {
    case 'added':
      return { ...base, verb: 'a ajouté', tail: ' à sa liste' };
    case 'watched_movie':
      return { ...base, verb: 'a vu' };
    case 'started_show':
      return { ...base, verb: 'a commencé' };
    case 'finished_show':
      return { ...base, verb: 'a terminé' };
    case 'followed':
      return {
        ...base,
        verb: 'suit maintenant',
        title: activity.target ? firstName(activity.target.displayName) : '',
        visual: 'avatar',
      };
    case 'watched_episodes':
      return { ...base, ...episodesVerb(activity, myWatchedEpisodes, spoilerProtection) };
  }
}

function episodesVerb(
  { episode, count }: FeedActivity,
  myWatchedEpisodes: ReadonlySet<number>,
  spoilerProtection: boolean,
): { verb: string; visual: ActivityVisual } {
  if (count > 1 || !episode) return { verb: `a vu ${count} épisodes de`, visual: 'poster' };
  const code = episodeCode(episode.season, episode.number);
  const masked = spoilerProtection && !myWatchedEpisodes.has(episode.id);
  if (masked || !episode.name) {
    return { verb: `a vu ${code} de`, visual: !masked && episode.stillPath ? 'still' : 'poster' };
  }
  return {
    verb: `a vu ${code} « ${episode.name} » de`,
    visual: episode.stillPath ? 'still' : 'poster',
  };
}

export type ActivityDay = { key: string; label: string; items: FeedActivity[] };

/** Libellé d'un jour du fil : « Aujourd'hui », « Hier », puis « Mar. 20 oct. ». */
export function dayLabel(date: Date, now: Date): string {
  const label = calendarDaysBetween(now, date) === -1 ? 'Hier' : formatRelativeDay(date, now);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Groupes par jour calendaire local, dans l'ordre reçu (plus récent d'abord). */
export function groupByDay(activities: readonly FeedActivity[], now: Date): ActivityDay[] {
  const days: ActivityDay[] = [];
  for (const activity of activities) {
    const date = new Date(activity.createdAt);
    const key = date.toLocaleDateString('fr-CA');
    const last = days.at(-1);
    if (last?.key === key) last.items.push(activity);
    else days.push({ key, label: dayLabel(date, now), items: [activity] });
  }
  return days;
}

/** « Quand » d'une carte de Découvrir : l'heure aujourd'hui, « Hier », sinon « 7 oct. ». */
export function cardWhen(date: Date, now: Date): string {
  const days = calendarDaysBetween(now, date);
  if (days === 0) return formatTime(date);
  if (days === -1) return 'Hier';
  return formatShortDate(date);
}

/** Épisodes que j'ai vus, d'après les séries et animés de Ma liste. */
export function watchedEpisodeIds(
  series: readonly { episodes: readonly { id: number; watchedAt?: string }[] }[],
): Set<number> {
  const ids = new Set<number>();
  for (const item of series) {
    for (const episode of item.episodes) if (episode.watchedAt) ids.add(episode.id);
  }
  return ids;
}
