/** Découvrir, recherche avancée, liste par genre et fiche personne — specs/docs/08, 07 §7.3–7.4. */
import { keepPreviousData, queryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  advancedQuery,
  genreQuery,
  type AdvancedFilters,
  type GenreFilters,
  type GenreKey,
} from '@/domain/advancedSearch';
import type { DiscoverList } from '@/domain/discover';
import type { PersonRole } from '@/domain/person';
import type { MediaType } from '@/domain/types';

import { toBadgeData, type BadgeData } from './badges';
import { toPosterTitle, type PosterTitle } from './catalog';
import { api } from './http';
import { toMediaType } from './mappers';
import type { components } from './types';

type ApiDiscoverResult = components['schemas']['DiscoverResult'];
type ApiPersonDetail = components['schemas']['PersonDetail'];
type ApiTitleLite = components['schemas']['TitleLite'];
type ApiCount = components['schemas']['Count'];

const DAY = 24 * 60 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;
/** TMDB ne sert pas au-delà de la page 500. */
const LAST_PAGE = 500;

/** Affiche d'une grille avec ce qu'il faut pour trier une filmographie. */
export type CatalogTitle = PosterTitle & {
  year?: number;
  releaseDate?: string;
  popularity?: number;
  /** Joint par GET /discover ; absent ailleurs (filmographie : chargé par lots). */
  badge?: BadgeData;
};

export function toCatalogTitle(item: ApiTitleLite, fallbackType: MediaType): CatalogTitle | null {
  const title = toPosterTitle(item, fallbackType);
  if (!title) return null;
  return {
    ...title,
    year: item.year,
    releaseDate: item.releaseDate,
    popularity: item.popularity,
    badge: item.badge ? toBadgeData(item.badge) : undefined,
  };
}

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

export type DiscoverPage = { results: CatalogTitle[]; total: number; page: number };

type DiscoverParams = Record<string, string | number | undefined>;

async function fetchDiscover(
  params: DiscoverParams,
  fallbackType: MediaType,
  signal?: AbortSignal,
): Promise<DiscoverPage> {
  const result = await api<ApiDiscoverResult>('/discover', { query: params, signal });
  return {
    results: (result.results ?? [])
      .map((item) => toCatalogTitle(item, fallbackType))
      .filter(isDefined),
    total: result.total ?? 0,
    page: result.page ?? Number(params.page ?? 1),
  };
}

/** Page suivante tant que TMDB en a : les pages fusionnées de plusieurs types font plus de 20 titres. */
export function nextDiscoverPage(last: DiscoverPage, all: readonly DiscoverPage[]) {
  const loaded = all.reduce((sum, page) => sum + page.results.length, 0);
  if (last.results.length === 0 || loaded >= last.total || last.page >= LAST_PAGE) return undefined;
  return last.page + 1;
}

/** Titres de toutes les pages, sans doublon (une page TMDB peut décaler la suivante). */
export function flattenPages(pages: readonly DiscoverPage[] | undefined): CatalogTitle[] {
  const seen = new Set<string>();
  return (pages ?? [])
    .flatMap((page) => page.results)
    .filter((title) => !seen.has(title.id) && Boolean(seen.add(title.id)));
}

function useDiscoverPages(params: DiscoverParams, fallbackType: MediaType, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['discover', params],
    queryFn: ({ pageParam, signal }) =>
      fetchDiscover({ ...params, page: pageParam }, fallbackType, signal),
    initialPageParam: 1,
    getNextPageParam: nextDiscoverPage,
    enabled,
    staleTime: DAY,
  });
}

/** Carrousel de Découvrir (20 titres), à passer à useQueries. */
export function discoverListQuery(list: DiscoverList, type: MediaType) {
  return queryOptions({
    queryKey: ['discover', { list, type }],
    queryFn: async ({ signal }) => (await fetchDiscover({ list, type }, type, signal)).results,
    staleTime: DAY,
  });
}

/** Liste par genre, triée et filtrée (le plus récent d'abord par défaut), chargement infini. */
export function useGenreTitles(type: MediaType, genre: GenreKey, filters: GenreFilters) {
  return useDiscoverPages(genreQuery(type, genre, filters), type);
}

/** Résultats de la recherche avancée appliquée. */
export function useAdvancedResults(filters: AdvancedFilters, enabled: boolean) {
  return useDiscoverPages({ ...advancedQuery(filters) }, 'movie', enabled);
}

/** Compteur en direct du pied de la sheet ; garde l'ancien nombre pendant le chargement. */
export function useAdvancedCount(filters: AdvancedFilters, enabled: boolean) {
  // Le tri ne change pas le nombre de résultats.
  const params = { ...advancedQuery(filters), sort: undefined };
  return useQuery({
    queryKey: ['discoverCount', params],
    queryFn: async ({ signal }) =>
      (await api<ApiCount>('/discover/count', { query: params, signal })).total ?? 0,
    enabled,
    staleTime: TEN_MINUTES,
    placeholderData: keepPreviousData,
  });
}

export type PersonDetail = {
  id: number;
  name: string;
  profilePath?: string;
  gender?: number;
  birthday?: string;
  placeOfBirth?: string;
  biography?: string;
  credits: CatalogTitle[];
  roles: PersonRole[];
};

export function toPersonDetail(person: ApiPersonDetail, id: number): PersonDetail {
  return {
    id: person.id ?? id,
    name: person.name ?? '',
    profilePath: person.profilePath,
    gender: person.gender,
    birthday: person.birthday,
    placeOfBirth: person.placeOfBirth,
    biography: person.biography?.trim() || undefined,
    credits: (person.credits ?? [])
      .map((item) => toCatalogTitle(item, toMediaType(item.type, 'movie')))
      .filter(isDefined),
    roles: (person.roles ?? [])
      .filter((role) => Boolean(role.title))
      .map((role) => ({ title: role.title ?? '', character: role.character })),
  };
}

/** Fiche personne (`GET /people/{id}`), gardée 24 h. */
export function usePerson(id: number) {
  return useQuery({
    queryKey: ['person', id],
    queryFn: async () => toPersonDetail(await api<ApiPersonDetail>(`/people/${id}`), id),
    staleTime: DAY,
    enabled: Number.isFinite(id),
  });
}
