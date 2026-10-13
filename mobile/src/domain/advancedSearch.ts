/** Recherche avancée — specs/docs/08 §8.2 (prototype : `advDefault`, `A.advFilter`). */
import type { MediaType } from './types';

export type GenreKey =
  | 'action'
  | 'aventure'
  | 'comedie'
  | 'drame'
  | 'fantastique'
  | 'horreur'
  | 'science-fiction'
  | 'thriller'
  | 'animation'
  | 'documentaire';

/** Les 10 genres, dans l'ordre de la spec ; les clés sont celles de l'API (Genres.java). */
export const GENRES: readonly { key: GenreKey; label: string }[] = [
  { key: 'action', label: 'Action' },
  { key: 'aventure', label: 'Aventure' },
  { key: 'comedie', label: 'Comédie' },
  { key: 'drame', label: 'Drame' },
  { key: 'fantastique', label: 'Fantastique' },
  { key: 'horreur', label: 'Horreur' },
  { key: 'science-fiction', label: 'Science-fiction' },
  { key: 'thriller', label: 'Thriller' },
  { key: 'animation', label: 'Animation' },
  { key: 'documentaire', label: 'Documentaire' },
];

export function genreLabel(key: string): string | undefined {
  return GENRES.find((genre) => genre.key === key)?.label;
}

export type LanguageKey = 'all' | 'en' | 'fr' | 'ja' | 'ko' | 'es';
export const LANGUAGES: readonly { value: LanguageKey; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'en', label: 'Anglais' },
  { value: 'fr', label: 'Français' },
  { value: 'ja', label: 'Japonais' },
  { value: 'ko', label: 'Coréen' },
  { value: 'es', label: 'Espagnol' },
];

/** Durée maximale en minutes (films, ou épisode moyen des séries). */
export type RuntimeKey = 'all' | '90' | '120' | '150';
export const RUNTIMES: readonly { value: RuntimeKey; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: '90', label: 'Moins de 1 h 30' },
  { value: '120', label: 'Moins de 2 h' },
  { value: '150', label: 'Moins de 2 h 30' },
];

export type AdvancedSort = 'pop' | 'rating' | 'recent';
export const ADVANCED_SORTS: readonly { key: AdvancedSort; label: string }[] = [
  { key: 'pop', label: 'Popularité' },
  { key: 'rating', label: 'Mieux notés' },
  { key: 'recent', label: 'Plus récents' },
];

export type Actor = { id: number; name: string };

export type AdvancedFilters = {
  /** Aucun = tous les types. */
  types: MediaType[];
  /** Titres où ils jouent tous (ET). */
  actors: Actor[];
  /** Au moins un de ces genres (OU). */
  genres: GenreKey[];
  yearFrom: number;
  yearTo: number;
  /** 0 = toutes les notes ; pas de 0,5. */
  minRating: number;
  availability: 'all' | 'mine';
  language: LanguageKey;
  maxRuntime: RuntimeKey;
  sort: AdvancedSort;
};

export const FIRST_YEAR = 1950;
export const DEFAULT_YEAR_FROM = 1990;
/** Autocomplétion des acteurs : à partir de 2 caractères, 4 suggestions au plus. */
export const ACTOR_QUERY_MIN = 2;
export const MAX_ACTOR_SUGGESTIONS = 4;
/** Délai du compteur « Voir les N résultats ». */
export const COUNT_DEBOUNCE_MS = 250;

export function defaultFilters(now: Date): AdvancedFilters {
  return {
    types: [],
    actors: [],
    genres: [],
    yearFrom: DEFAULT_YEAR_FROM,
    yearTo: now.getFullYear(),
    minRating: 0,
    availability: 'all',
    language: 'all',
    maxRuntime: 'all',
    sort: 'pop',
  };
}

/** Ajoute ou retire une valeur d'une sélection multiple, en gardant l'ordre de sélection. */
export function toggleValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

export function addActor(filters: AdvancedFilters, actor: Actor): AdvancedFilters {
  if (filters.actors.some((a) => a.id === actor.id)) return filters;
  return { ...filters, actors: [...filters.actors, actor] };
}

export function removeActor(filters: AdvancedFilters, id: number): AdvancedFilters {
  return { ...filters, actors: filters.actors.filter((a) => a.id !== id) };
}

/** De ≤ À : chaque curseur est borné par l'autre. */
export function setYearFrom(filters: AdvancedFilters, year: number): AdvancedFilters {
  return { ...filters, yearFrom: Math.min(Math.round(year), filters.yearTo) };
}

export function setYearTo(filters: AdvancedFilters, year: number): AdvancedFilters {
  return { ...filters, yearTo: Math.max(Math.round(year), filters.yearFrom) };
}

/** Note arrondie au pas de 0,5. */
export function setMinRating(filters: AdvancedFilters, rating: number): AdvancedFilters {
  return { ...filters, minRating: Math.min(10, Math.max(0, Math.round(rating * 2) / 2)) };
}

export function yearsLabel(filters: AdvancedFilters): string {
  return `${filters.yearFrom} – ${filters.yearTo}`;
}

export function minRatingLabel(rating: number): string {
  if (rating <= 0) return 'Toutes les notes';
  return `${rating.toLocaleString('fr-CA', { maximumFractionDigits: 1 })}/10 minimum`;
}

/** Texte du bouton du pied de la sheet. */
export function countButtonLabel(count: number): string {
  if (count > 1) return `Voir les ${count.toLocaleString('fr-CA')} résultats`;
  if (count === 1) return 'Voir le résultat';
  return 'Aucun résultat';
}

export type DiscoverQueryParams = {
  type?: string;
  genres?: string;
  cast?: string;
  yearFrom: number;
  yearTo: number;
  minRating?: number;
  providers?: 'mine';
  lang?: string;
  maxRuntime?: number;
  sort: AdvancedSort;
};

/** Paramètres de `GET /discover` et `GET /discover/count`. */
export function advancedQuery(filters: AdvancedFilters): DiscoverQueryParams {
  const csv = (values: readonly (string | number)[]) =>
    values.length > 0 ? values.join(',') : undefined;
  return {
    type: csv(filters.types),
    genres: csv(filters.genres),
    cast: csv(filters.actors.map((a) => a.id)),
    yearFrom: filters.yearFrom,
    yearTo: filters.yearTo,
    minRating: filters.minRating > 0 ? filters.minRating : undefined,
    providers: filters.availability === 'mine' ? 'mine' : undefined,
    lang: filters.language === 'all' ? undefined : filters.language,
    maxRuntime: filters.maxRuntime === 'all' ? undefined : Number(filters.maxRuntime),
    sort: filters.sort,
  };
}

const TYPE_NOUNS: Record<MediaType, [singular: string, plural: string]> = {
  movie: ['film', 'films'],
  tv: ['série', 'séries'],
  anime: ['animé', 'animés'],
};

/** Sous-titre de la liste par genre : « 1 240 films », « 1 série ». */
export function genreCountLabel(count: number, type: MediaType): string {
  const [singular, plural] = TYPE_NOUNS[type];
  return `${count.toLocaleString('fr-CA')} ${count > 1 ? plural : singular}`;
}
