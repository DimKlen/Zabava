/**
 * Séries et animés de specs/reference/data.js, convertis au modèle de l'app avec les
 * dates d'épisodes calculées comme `A.sInfo` (TODAY = 10 octobre 2026, 12 h).
 */
import type { SeriesEpisode } from '../series';
import type { LibrarySeries } from '../seriesList';

import { TODAY } from './prototypeFilms';

type ProtoSeries = {
  id: string;
  type: 'tv' | 'anime';
  title: string;
  network: string;
  ended?: boolean;
  /** [épisodes, épisodes diffusés] par saison. */
  seasons: [number, number][];
  /** Jours avant le prochain épisode à venir. */
  next?: number;
};

type ProtoProgress = [season: number, episode: number];
type ProtoUserTitle = {
  status: 'following' | 'abandoned';
  added: number;
  /** Jours depuis le dernier visionnage. */
  last: number;
};

const SERIES: ProtoSeries[] = [
  {
    id: 'bear',
    type: 'tv',
    title: 'The Bear',
    network: 'FX',
    seasons: [
      [8, 8],
      [10, 10],
      [10, 10],
      [10, 10],
    ],
  },
  {
    id: 'whitelotus',
    type: 'tv',
    title: 'The White Lotus',
    network: 'HBO',
    seasons: [
      [6, 6],
      [7, 7],
      [8, 8],
    ],
  },
  {
    id: 'tlou',
    type: 'tv',
    title: 'The Last of Us',
    network: 'HBO',
    seasons: [
      [9, 9],
      [7, 7],
    ],
  },
  {
    id: 'severance',
    type: 'tv',
    title: 'Dissociation',
    network: 'Apple TV+',
    seasons: [
      [9, 9],
      [10, 10],
    ],
  },
  {
    id: 'slow',
    type: 'tv',
    title: 'Slow Horses',
    network: 'Apple TV+',
    seasons: [
      [6, 6],
      [6, 6],
      [6, 6],
      [6, 6],
      [6, 6],
      [6, 3],
    ],
    next: 4,
  },
  {
    id: 'shogun',
    type: 'tv',
    title: 'Shōgun',
    network: 'FX',
    seasons: [
      [10, 10],
      [10, 0],
    ],
    next: 25,
  },
  {
    id: 'andor',
    type: 'tv',
    title: 'Andor',
    network: 'Disney+',
    ended: true,
    seasons: [
      [12, 12],
      [12, 12],
    ],
  },
  {
    id: 'stranger',
    type: 'tv',
    title: 'Stranger Things',
    network: 'Netflix',
    ended: true,
    seasons: [
      [8, 8],
      [9, 9],
      [8, 8],
      [9, 9],
      [8, 8],
    ],
  },
  {
    id: 'frieren',
    type: 'anime',
    title: 'Frieren',
    network: 'Crunchyroll',
    seasons: [
      [28, 28],
      [10, 10],
    ],
  },
  {
    id: 'jjk',
    type: 'anime',
    title: 'Jujutsu Kaisen',
    network: 'Crunchyroll',
    seasons: [
      [24, 24],
      [23, 23],
      [12, 6],
    ],
    next: 3,
  },
  {
    id: 'dandadan',
    type: 'anime',
    title: 'Dandadan',
    network: 'MBS',
    seasons: [
      [12, 12],
      [12, 12],
      [12, 2],
    ],
    next: 6,
  },
  {
    id: 'solo',
    type: 'anime',
    title: 'Solo Leveling',
    network: 'Crunchyroll',
    seasons: [
      [12, 12],
      [13, 13],
    ],
  },
  {
    id: 'spy',
    type: 'anime',
    title: 'Spy × Family',
    network: 'Crunchyroll',
    seasons: [
      [25, 25],
      [12, 12],
      [13, 13],
    ],
  },
];

const PROG: Record<string, ProtoProgress> = {
  bear: [4, 2],
  whitelotus: [3, 5],
  tlou: [2, 1],
  severance: [2, 10],
  slow: [6, 3],
  shogun: [0, 0],
  andor: [2, 12],
  stranger: [3, 4],
  frieren: [2, 6],
  jjk: [3, 4],
  dandadan: [3, 2],
  solo: [2, 13],
  spy: [0, 0],
};

const MY: Record<string, ProtoUserTitle> = {
  bear: { status: 'following', added: 20, last: 2 },
  whitelotus: { status: 'following', added: 19, last: 5 },
  tlou: { status: 'following', added: 18, last: 45 },
  severance: { status: 'following', added: 17, last: 60 },
  slow: { status: 'following', added: 16, last: 6 },
  shogun: { status: 'following', added: 15, last: 999 },
  andor: { status: 'following', added: 14, last: 300 },
  stranger: { status: 'abandoned', added: 13, last: 400 },
  frieren: { status: 'following', added: 30, last: 1 },
  jjk: { status: 'following', added: 29, last: 3 },
  dandadan: { status: 'following', added: 28, last: 4 },
  solo: { status: 'following', added: 27, last: 90 },
  spy: { status: 'following', added: 26, last: 999 },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDay(offset: number): string {
  const date = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Épisodes datés comme `A.sInfo` : diffusés une fois par semaine avant `next`. */
function episodesOf(series: ProtoSeries, progress: ProtoProgress, last: number): SeriesEpisode[] {
  const all: { s: number; e: number; aired: boolean }[] = [];
  series.seasons.forEach(([total, aired], index) => {
    for (let e = 1; e <= total; e += 1) all.push({ s: index + 1, e, aired: e <= aired });
  });
  const airedCount = all.filter((x) => x.aired).length;
  const base = series.next !== undefined ? series.next - 7 : -30;
  let airedIndex = 0;
  let upcomingIndex = 0;
  const watchedAt = new Date(TODAY.getTime() - last * DAY_MS).toISOString();
  return all.map(({ s, e, aired }, index) => {
    const offset = aired
      ? base - 7 * (airedCount - 1 - airedIndex++)
      : (series.next ?? 30) + 7 * upcomingIndex++;
    const [ps, pe] = progress;
    const watched = aired && (s < ps || (s === ps && e <= pe));
    return {
      id: 1000 * (SERIES.indexOf(series) + 1) + index,
      season: s,
      number: e,
      name: `Épisode ${s}-${e}`,
      airDate: isoDay(offset),
      runtime: 30,
      watchedAt: watched ? watchedAt : undefined,
    };
  });
}

export function protoSeries(id: string): LibrarySeries {
  const series = SERIES.find((s) => s.id === id);
  const my = MY[id];
  const progress = PROG[id];
  if (!series || !my || !progress) throw new Error(`Série inconnue : ${id}`);
  return {
    id: `${series.type}-${id}`,
    tmdbId: SERIES.indexOf(series) + 1,
    type: series.type,
    title: series.title,
    network: series.network,
    ended: series.ended ?? false,
    availability: { sub: [], rent: [], buy: [] },
    userTitle: {
      titleId: `${series.type}-${id}`,
      status: my.status,
      addedAt: new Date(TODAY.getTime() - (100 - my.added) * DAY_MS).toISOString(),
      notificationsEnabled: true,
    },
    episodes: episodesOf(series, progress, my.last),
  };
}

export const PROTOTYPE_TV = SERIES.filter((s) => s.type === 'tv').map((s) => protoSeries(s.id));
export const PROTOTYPE_ANIME = SERIES.filter((s) => s.type === 'anime').map((s) =>
  protoSeries(s.id),
);
