/** À venir — specs/docs/09 §9.1 (prototype : `vals()` › upcoming). */
import { calendarDaysBetween, parseLocalDate, startOfDay } from './dates';
import { episodeCode, formatRelativeDay, formatTime } from './format';
import type { MediaType } from './types';

/** Fenêtre affichée : aujourd'hui et les 90 jours suivants. */
export const UPCOMING_DAYS = 90;
export const WEEK_DAYS = 7;

export type UpcomingKind = 'episode' | 'theatrical' | 'streaming' | 'digital';

export type UpcomingTitle = {
  id: string;
  tmdbId: number;
  type: MediaType;
  title: string;
  posterPath?: string;
};

export type UpcomingEvent = {
  kind: UpcomingKind;
  /** Jour calculé par l'API dans le fuseau du profil (repli sans heure exacte). */
  date: string;
  title: UpcomingTitle;
  season?: number;
  episode?: number;
  /** Heure exacte de diffusion (ISO) : le jour et l'heure suivent le fuseau du téléphone. */
  airstamp?: string;
  /** Plateforme d'arrivée (streaming) ou chaîne de la série (épisode). */
  provider?: string;
};

export type UpcomingItem = {
  key: string;
  event: UpcomingEvent;
  line: string;
  tag?: string;
};

export type UpcomingGroup = {
  /** « 2026-10-14 » (jour local). */
  key: string;
  date: Date;
  label: string;
  items: UpcomingItem[];
};

/** Jour local de l'événement : celui de l'heure exacte si elle est connue. */
export function eventDay(event: UpcomingEvent): Date {
  return event.airstamp ? startOfDay(new Date(event.airstamp)) : parseLocalDate(event.date);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** « Aujourd'hui », « Demain », puis « Mer. 14 oct. ». */
export function groupLabel(date: Date, now: Date): string {
  return capitalize(formatRelativeDay(date, now));
}

/** Ligne sous le titre (tableau de specs/docs/09 §9.1). */
export function itemLine(event: UpcomingEvent): string {
  switch (event.kind) {
    case 'episode': {
      const code = episodeCode(event.season ?? 0, event.episode ?? 0);
      return event.airstamp ? `${code} · ${formatTime(new Date(event.airstamp))}` : code;
    }
    case 'theatrical':
      return 'Sortie en salle';
    case 'streaming':
      return event.provider ? `Arrive sur ${event.provider}` : 'Disponible en streaming';
    case 'digital':
      return 'Disponible en numérique';
  }
}

/** Tag à droite : plateforme ou chaîne d'un épisode, « Cinéma » d'une sortie en salle. */
export function itemTag(event: UpcomingEvent): string | undefined {
  if (event.kind === 'episode') return event.provider;
  if (event.kind === 'theatrical') return 'Cinéma';
  return undefined;
}

function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Moment de tri dans un jour : l'heure exacte, sinon le début de la journée. */
function sortTime(event: UpcomingEvent): number {
  return event.airstamp ? new Date(event.airstamp).getTime() : eventDay(event).getTime();
}

/**
 * Groupes par jour local, d'aujourd'hui à +90 jours. Dans un jour : par heure, puis par
 * titre. Les épisodes déjà diffusés (heure passée) sont écartés.
 */
export function groupUpcoming(events: readonly UpcomingEvent[], now: Date): UpcomingGroup[] {
  const groups = new Map<string, UpcomingGroup>();
  const sorted = [...events]
    .filter((event) => {
      const days = calendarDaysBetween(now, eventDay(event));
      if (days < 0 || days > UPCOMING_DAYS) return false;
      return !(event.airstamp && new Date(event.airstamp).getTime() <= now.getTime());
    })
    .sort(
      (a, b) =>
        sortTime(a) - sortTime(b) ||
        a.title.title.localeCompare(b.title.title, 'fr-CA') ||
        (a.season ?? 0) - (b.season ?? 0) ||
        (a.episode ?? 0) - (b.episode ?? 0),
    );
  for (const event of sorted) {
    const date = eventDay(event);
    const key = dayKey(date);
    let group = groups.get(key);
    if (!group) {
      group = { key, date, label: groupLabel(date, now), items: [] };
      groups.set(key, group);
    }
    group.items.push({
      key: `${event.kind}-${event.title.id}-${event.season ?? ''}-${event.episode ?? ''}-${event.provider ?? ''}`,
      event,
      line: itemLine(event),
      tag: itemTag(event),
    });
  }
  return [...groups.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

export type WeekDay = {
  key: string;
  date: Date;
  /** « Sam », « Dim », « Lun »… */
  weekday: string;
  day: number;
  isToday: boolean;
  hasEvents: boolean;
};

/** Bande de la semaine : aujourd'hui et les 6 jours suivants, point si un événement. */
export function weekDays(groups: readonly UpcomingGroup[], now: Date): WeekDay[] {
  const withEvents = new Set(groups.map((group) => group.key));
  const today = startOfDay(now);
  return Array.from({ length: WEEK_DAYS }, (_, offset) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const key = dayKey(date);
    const weekday = date.toLocaleDateString('fr-CA', { weekday: 'short' }).replace('.', '');
    return {
      key,
      date,
      weekday: capitalize(weekday),
      day: date.getDate(),
      isToday: offset === 0,
      hasEvents: withEvents.has(key),
    };
  });
}

/** Saut au jour : premier groupe dont le jour est ≥ au jour touché, sinon null. */
export function jumpTarget(groups: readonly UpcomingGroup[], day: Date): UpcomingGroup | null {
  const start = startOfDay(day).getTime();
  return groups.find((group) => group.date.getTime() >= start) ?? null;
}

/** « Saison 4 annoncée, date à venir ». */
export function noDateLine(nextSeason: number): string {
  return `Saison ${nextSeason} annoncée, date à venir`;
}
