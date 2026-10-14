/** À venir (`GET /me/upcoming`) — specs/docs/09 §9.1, clé `['upcoming', filter]` (docs/10 §3). */
import { useQuery } from '@tanstack/react-query';

import type { MediaType } from '@/domain/types';
import {
  UPCOMING_DAYS,
  type UpcomingEvent,
  type UpcomingKind,
  type UpcomingTitle,
} from '@/domain/upcoming';

import { api } from './http';
import { toMediaType } from './mappers';
import type { components } from './types';

type ApiUpcoming = components['schemas']['Upcoming'];
type ApiTitleLite = components['schemas']['TitleLite'];

export type UpcomingFilter = 'all' | MediaType;

export type NoDateTitle = { title: UpcomingTitle; nextSeason: number };

export type UpcomingData = { events: UpcomingEvent[]; noDate: NoDateTitle[] };

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const KINDS: readonly UpcomingKind[] = ['episode', 'theatrical', 'streaming', 'digital'];

export const upcomingKey = (filter: UpcomingFilter) => ['upcoming', filter] as const;

function isoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTitle(item: ApiTitleLite | undefined): UpcomingTitle | null {
  if (!item || item.tmdbId === undefined) return null;
  const type = toMediaType(item.type, 'movie');
  return {
    id: item.id ?? `${type}-${item.tmdbId}`,
    tmdbId: item.tmdbId,
    type,
    title: item.title ?? '',
    posterPath: item.posterPath,
  };
}

export function toUpcomingData(body: ApiUpcoming): UpcomingData {
  const events: UpcomingEvent[] = [];
  for (const event of body.events ?? []) {
    const title = toTitle(event.title);
    const kind = KINDS.find((k) => k === event.kind);
    if (!title || !kind || !event.date) continue;
    events.push({
      kind,
      date: event.date,
      title,
      season: event.season,
      episode: event.episode,
      airstamp: event.airstamp,
      provider: event.provider,
    });
  }
  const noDate: NoDateTitle[] = [];
  for (const item of body.noDate ?? []) {
    const title = toTitle(item.title);
    if (title && item.nextSeason !== undefined) noDate.push({ title, nextSeason: item.nextSeason });
  }
  return { events, noDate };
}

/** Événements d'aujourd'hui à +90 jours (jours du téléphone), gardés hors ligne. */
export function useUpcoming(filter: UpcomingFilter) {
  return useQuery({
    queryKey: upcomingKey(filter),
    queryFn: async () => {
      const today = new Date();
      const to = new Date(today.getFullYear(), today.getMonth(), today.getDate() + UPCOMING_DAYS);
      return toUpcomingData(
        await api<ApiUpcoming>('/me/upcoming', {
          query: { from: isoDay(today), to: isoDay(to), type: filter },
        }),
      );
    },
    staleTime: FIFTEEN_MINUTES,
  });
}
