/**
 * Films de specs/reference/data.js, convertis au modèle de l'app.
 * Les décalages en jours (`rel`, `dig`, `watchedAt`) partent du 10 octobre 2026,
 * le « TODAY » du prototype.
 */
import type { Provider } from '../types';
import type { LibraryMovie } from '../watchlist';

export const TODAY = new Date(2026, 9, 10, 12, 0);

const PLATFORMS = {
  netflix: { id: 8, name: 'Netflix', short: 'N' },
  prime: { id: 119, name: 'Prime Video', short: 'pv' },
  disney: { id: 337, name: 'Disney+', short: 'D+' },
  crave: { id: 230, name: 'Crave', short: 'C' },
  apple: { id: 350, name: 'Apple TV+', short: 'tv' },
} satisfies Record<string, Provider>;

type Platform = keyof typeof PLATFORMS;

/** Plateformes choisies dans le prototype : Netflix, Crave, Prime Video. */
export const MY_PROVIDER_IDS = [PLATFORMS.netflix.id, PLATFORMS.crave.id, PLATFORMS.prime.id];

function isoDay(offset: number): string {
  const date = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

type ProtoMovie = {
  id: string;
  title: string;
  imdb?: number;
  rel: number;
  dig?: number;
  prov?: { sub?: Platform[]; rent?: Platform[]; buy?: Platform[] };
};

type ProtoUserTitle = { status: 'towatch' | 'watched'; added: number; watchedAt?: number };

const MOVIES: ProtoMovie[] = [
  { id: 'odyssey', title: "L'Odyssée", imdb: 7.9, rel: -20 },
  {
    id: 'obaa',
    title: "Une bataille après l'autre",
    imdb: 8.1,
    rel: -390,
    dig: -330,
    prov: { rent: ['apple', 'prime'], buy: ['apple'] },
  },
  {
    id: 'sinners',
    title: 'Pécheurs',
    imdb: 7.6,
    rel: -540,
    dig: -480,
    prov: { sub: ['crave'], rent: ['apple'] },
  },
  {
    id: 'superman',
    title: 'Superman',
    imdb: 7.1,
    rel: -455,
    prov: { sub: ['crave'], rent: ['apple'] },
  },
  { id: 'f1', title: 'F1', imdb: 7.7, rel: -470, prov: { sub: ['apple'] } },
  {
    id: 'hailmary',
    title: 'Projet Dernière chance',
    imdb: 8.0,
    rel: -205,
    dig: -150,
    prov: { sub: ['prime'], rent: ['apple'] },
  },
  {
    id: 'spider',
    title: 'Spider-Man : Un tout nouveau jour',
    imdb: 7.4,
    rel: -71,
    dig: -15,
    prov: { rent: ['apple', 'prime'], buy: ['apple'] },
  },
  { id: 'dune3', title: 'Dune : Troisième partie', rel: 69 },
  { id: 'avengers', title: 'Avengers : Le Jour du Jugement', rel: 69 },
  {
    id: 'dune2',
    title: 'Dune : Deuxième partie',
    imdb: 8.5,
    rel: -950,
    dig: -890,
    prov: { sub: ['crave'], rent: ['apple', 'prime'], buy: ['apple'] },
  },
  {
    id: 'opp',
    title: 'Oppenheimer',
    imdb: 8.3,
    rel: -1180,
    prov: { sub: ['prime'], rent: ['apple'] },
  },
  {
    id: 'monte',
    title: 'Le Comte de Monte-Cristo',
    imdb: 7.7,
    rel: -830,
    prov: { sub: ['netflix'], rent: ['apple'] },
  },
  {
    id: 'anat',
    title: "Anatomie d'une chute",
    imdb: 7.7,
    rel: -1080,
    prov: { sub: ['crave'], rent: ['apple'] },
  },
  {
    id: 'wicked2',
    title: 'Wicked : Pour de bon',
    imdb: 6.8,
    rel: -325,
    dig: -270,
    prov: { rent: ['apple', 'prime'], buy: ['apple'] },
  },
  { id: 'kpop', title: 'KPop Demon Hunters', imdb: 7.6, rel: -480, prov: { sub: ['netflix'] } },
];

/** `MY` du prototype, limité aux films. */
const MY: Record<string, ProtoUserTitle> = {
  dune3: { status: 'towatch', added: 12 },
  odyssey: { status: 'towatch', added: 11 },
  wicked2: { status: 'towatch', added: 10 },
  obaa: { status: 'towatch', added: 9 },
  sinners: { status: 'towatch', added: 8 },
  avengers: { status: 'towatch', added: 7 },
  f1: { status: 'towatch', added: 6 },
  hailmary: { status: 'towatch', added: 5 },
  monte: { status: 'towatch', added: 4 },
  dune2: { status: 'watched', added: 3, watchedAt: -30 },
  opp: { status: 'watched', added: 2, watchedAt: -120 },
  anat: { status: 'watched', added: 1, watchedAt: -200 },
};

const providers = (keys: Platform[] = []) => keys.map((key) => PLATFORMS[key]);

export function toLibraryMovie(movie: ProtoMovie, index: number): LibraryMovie {
  const mine = MY[movie.id];
  return {
    id: movie.id,
    tmdbId: index + 1,
    title: movie.title,
    imdbRating: movie.imdb,
    releaseTheatrical: isoDay(movie.rel),
    availability: {
      sub: providers(movie.prov?.sub),
      rent: providers(movie.prov?.rent),
      buy: providers(movie.prov?.buy),
    },
    userTitle: {
      titleId: movie.id,
      status: mine?.status ?? 'towatch',
      // Le compteur `added` du prototype devient une date : plus il est grand, plus c'est récent.
      addedAt: new Date(2026, 0, 1, 0, mine?.added ?? 0).toISOString(),
      watchedAt:
        mine?.watchedAt === undefined ? undefined : `${isoDay(mine.watchedAt)}T20:00:00.000Z`,
      notificationsEnabled: true,
    },
  };
}

/** Tous les films du prototype, y compris ceux hors liste (pour les badges). */
export const ALL_FILMS = MOVIES.map(toLibraryMovie);

/** Films de la liste, dans l'ordre de l'API (date d'ajout décroissante). */
export const LIBRARY = ALL_FILMS.filter((film) => MY[film.id] !== undefined).sort(
  (a, b) => (MY[b.id]?.added ?? 0) - (MY[a.id]?.added ?? 0),
);

export const ids = (films: readonly { id: string }[]) => films.map((film) => film.id);
