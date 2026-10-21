/** Recherche (`GET /search`) et tendances du jour — specs/docs/08 §8.1. */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { SearchTab } from '@/domain/search';

import { toPosterTitle, type PosterTitle } from './catalog';
import { api } from './http';
import type { components } from './types';

type ApiSearchResult = components['schemas']['SearchResult'];
type ApiPerson = components['schemas']['PersonLite'];
type ApiTitleLite = components['schemas']['TitleLite'];

const TEN_MINUTES = 10 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const TRENDING_ROWS = 5;

export type PersonResult = {
  id: number;
  name: string;
  profilePath?: string;
  knownFor: string[];
};

/** Titre d'une ligne de résultat : affiche + année. */
export type TitleResult = PosterTitle & { year?: number };

export type SearchPage = {
  people: PersonResult[];
  titles: TitleResult[];
  page: number;
  totalPages: number;
};

export function toPersonResult(item: ApiPerson): PersonResult | null {
  if (item.id === undefined || !item.name) return null;
  return {
    id: item.id,
    name: item.name,
    profilePath: item.profilePath,
    knownFor: item.knownFor ?? [],
  };
}

export function toTitleResult(item: ApiTitleLite): TitleResult | null {
  const title = toPosterTitle(item, 'movie');
  return title ? { ...title, year: item.year } : null;
}

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

export async function fetchSearchPage(
  q: string,
  tab: SearchTab,
  page: number,
  signal?: AbortSignal,
): Promise<SearchPage> {
  const result = await api<ApiSearchResult>('/search', { query: { q, type: tab, page }, signal });
  return {
    people: (result.people ?? []).map(toPersonResult).filter(isDefined),
    titles: (result.titles ?? []).map(toTitleResult).filter(isDefined),
    page: result.page ?? page,
    totalPages: result.totalPages ?? page,
  };
}

/**
 * Résultats d'une requête pour un onglet, page par page. Une nouvelle requête annule
 * la précédente (signal passé à fetch).
 */
export function useSearch(q: string, tab: SearchTab) {
  return useInfiniteQuery({
    queryKey: ['search', q, tab],
    queryFn: ({ pageParam, signal }) => fetchSearchPage(q, tab, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: q.length > 0,
    staleTime: TEN_MINUTES,
  });
}

/**
 * Rangées d'une recherche : films, puis séries, puis animés (ordre de pertinence du serveur
 * conservé dans chaque type), puis les personnes (page 1 seulement), sans doublon.
 */
export type SearchRow =
  | { kind: 'person'; key: string; person: PersonResult }
  | { kind: 'title'; key: string; title: TitleResult };

const TYPE_ORDER: Record<TitleResult['type'], number> = { movie: 0, tv: 1, anime: 2 };

export function searchRows(pages: readonly SearchPage[] | undefined): SearchRow[] {
  const rows: SearchRow[] = [];
  const seen = new Set<string>();
  const push = (row: SearchRow) => {
    if (seen.has(row.key)) return;
    seen.add(row.key);
    rows.push(row);
  };
  // Tri stable : à type égal, on garde l'ordre de pertinence du serveur.
  const titles = (pages ?? [])
    .flatMap((page) => page.titles)
    .sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
  titles.forEach((title) => push({ kind: 'title', key: title.id, title }));
  for (const page of pages ?? []) {
    page.people.forEach((person) => push({ kind: 'person', key: `person-${person.id}`, person }));
  }
  return rows;
}

/** « Tendances du moment » : 5 titres du jour. */
export function useTrendingToday() {
  return useQuery({
    queryKey: ['trending', 'all', 'day'],
    queryFn: async () =>
      (await api<ApiTitleLite[]>('/trending', { query: { type: 'all', window: 'day' } }))
        .map(toTitleResult)
        .filter(isDefined)
        .slice(0, TRENDING_ROWS),
    staleTime: DAY,
  });
}

/** Autocomplétion des acteurs de la recherche avancée. */
export function usePersonSuggestions(q: string, enabled: boolean) {
  return useQuery({
    queryKey: ['search', q, 'person', 'suggestions'],
    queryFn: async ({ signal }) => (await fetchSearchPage(q, 'person', 1, signal)).people,
    enabled,
    staleTime: TEN_MINUTES,
  });
}
