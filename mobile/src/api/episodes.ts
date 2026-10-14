import { useQuery } from '@tanstack/react-query';

import type { SeriesEpisode } from '@/domain/series';

import { api } from './http';
import { toSeriesEpisodes } from './mappers';
import { whenSettled } from './mutationQueue';
import type { components } from './types';

type ApiEpisode = components['schemas']['Episode'];

const FIVE_MINUTES = 5 * 60 * 1000;

export const episodesKey = (type: 'tv' | 'anime', tmdbId: number) =>
  ['episodes', type, tmdbId] as const;

/** Tous les épisodes d'une série, avec ceux que j'ai vus (`GET /titles/{type}/{id}/episodes`). */
export function useEpisodes(type: 'tv' | 'anime', tmdbId: number) {
  return useQuery<SeriesEpisode[]>({
    queryKey: episodesKey(type, tmdbId),
    queryFn: async () => {
      // Après les écritures en file : sinon le rechargement les effacerait de l'écran.
      await whenSettled();
      return toSeriesEpisodes(await api<ApiEpisode[]>(`/titles/${type}/${tmdbId}/episodes`));
    },
    staleTime: FIVE_MINUTES,
  });
}
