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

export type AdvancedSort = 'pop' | 'rating' | 'recent';

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
  availability: 'all' | 'mine';
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
    availability: 'all',
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

/** Plage d'années de la piste à deux poignées ; De ≤ À. */
export function setYears(
  filters: AdvancedFilters,
  [from, to]: readonly [number, number],
): AdvancedFilters {
  const a = Math.round(from);
  const b = Math.round(to);
  return { ...filters, yearFrom: Math.min(a, b), yearTo: Math.max(a, b) };
}

export function yearsLabel(filters: AdvancedFilters): string {
  return `${filters.yearFrom} – ${filters.yearTo}`;
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
  providers?: 'mine';
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
    providers: filters.availability === 'mine' ? 'mine' : undefined,
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

/** Liste par genre : tri et filtres rapides, le plus récent d'abord par défaut. */
export type GenreFilters = { sort: AdvancedSort; mine: boolean; minRating: number };

export const DEFAULT_GENRE_FILTERS: GenreFilters = { sort: 'recent', mine: false, minRating: 0 };

export const GENRE_SORTS: readonly { key: AdvancedSort; label: string }[] = [
  { key: 'recent', label: 'Plus récents' },
  { key: 'rating', label: 'Mieux notés' },
  { key: 'pop', label: 'Populaires' },
];

/** Chip « Note 7+ ». */
export const GENRE_MIN_RATING = 7;

/** Paramètres de `GET /discover` pour la liste d'un genre. */
export function genreQuery(type: MediaType, genre: GenreKey, filters: GenreFilters) {
  return {
    type,
    genres: genre,
    sort: filters.sort,
    providers: filters.mine ? ('mine' as const) : undefined,
    minRating: filters.minRating > 0 ? filters.minRating : undefined,
  };
}
