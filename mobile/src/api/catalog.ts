import { useQuery } from '@tanstack/react-query';

import { initials } from '@/domain/initials';
import { groupProviders } from '@/domain/providers';
import type { MediaType, Provider } from '@/domain/types';

import { api } from './http';
import type { components } from './types';

type ApiTitleLite = components['schemas']['TitleLite'];
type ApiProvider = components['schemas']['Provider'];
type DiscoverResult = components['schemas']['DiscoverResult'];

const DAY = 24 * 60 * 60 * 1000;

/** Titre réduit au nécessaire d'une affiche de grille. */
export type PosterTitle = {
  id: string;
  tmdbId: number;
  type: MediaType;
  title: string;
  posterPath?: string;
};

export function toPosterTitle(item: ApiTitleLite, fallbackType: MediaType): PosterTitle | null {
  if (item.tmdbId === undefined) return null;
  const type = (item.type as MediaType | undefined) ?? fallbackType;
  return {
    id: item.id ?? `${type}-${item.tmdbId}`,
    tmdbId: item.tmdbId,
    type,
    title: item.title ?? '',
    posterPath: item.posterPath,
  };
}

export function toProvider(item: ApiProvider): Provider | null {
  if (item.id === undefined || !item.name) return null;
  return {
    id: item.id,
    name: item.name,
    short: item.shortName ?? initials(item.name),
    logoPath: item.logoPath,
    link: item.link,
  };
}

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

/** Plateformes d'abonnement de la région du profil (clé : la région). */
export function useRegionProviders(region: string | undefined) {
  return useQuery({
    queryKey: ['providers', region],
    queryFn: async () =>
      groupProviders((await api<ApiProvider[]>('/providers')).map(toProvider).filter(isDefined)),
    staleTime: DAY,
    enabled: region !== undefined,
  });
}

const POPULAR_COUNT = 30;

/** Titres populaires d'un type (`/discover?sort=pop`) : 30 titres, soit deux pages TMDB. */
export function usePopularTitles(type: MediaType) {
  return useQuery({
    queryKey: ['discover', { type, sort: 'pop', count: POPULAR_COUNT }],
    queryFn: async () => {
      const pages = await Promise.all(
        [1, 2].map((page) =>
          api<DiscoverResult>('/discover', { query: { type, sort: 'pop', page } }),
        ),
      );
      const seen = new Set<string>();
      return pages
        .flatMap((page) => page.results ?? [])
        .map((item) => toPosterTitle(item, type))
        .filter(isDefined)
        .filter((title) => !seen.has(title.id) && seen.add(title.id))
        .slice(0, POPULAR_COUNT);
    },
    staleTime: DAY,
  });
}

/** Chemins d'affiches des tendances de la semaine (mosaïque de connexion). */
export async function fetchTrendingPosterPaths(): Promise<string[]> {
  const items = await api<ApiTitleLite[]>('/trending', { query: { type: 'all', window: 'week' } });
  return items.map((item) => item.posterPath).filter((path): path is string => Boolean(path));
}
