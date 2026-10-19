import { Image } from 'expo-image';

import { discoverListQuery } from '@/api/discover';
import { queryClient } from '@/api/queryClient';
import { DISCOVER_SECTIONS } from '@/domain/discover';
import type { MediaType } from '@/domain/types';
import { tmdbImage } from '@/lib/tmdb';

/** Affiches visibles sans défiler dans un carrousel (112 pt de large à 390 pt d'écran). */
export const PREFETCHED_POSTERS = 4;

const TYPES: readonly MediaType[] = ['movie', 'tv', 'anime'];

/**
 * Prépare Découvrir avant qu'on l'ouvre : carrousels des trois onglets (sans nouvel appel
 * s'ils sont encore frais en cache) puis leurs premières affiches, gardées sur l'appareil.
 * Un échec est sans conséquence : l'écran chargera lui-même ce qui manque.
 */
export async function prefetchDiscover(): Promise<void> {
  const queries = TYPES.flatMap((type) =>
    DISCOVER_SECTIONS[type].map((section) => discoverListQuery(section.list, type)),
  );
  await Promise.allSettled(queries.map((query) => queryClient.prefetchQuery(query)));

  const posters = queries.flatMap((query) =>
    (queryClient.getQueryData(query.queryKey) ?? [])
      .slice(0, PREFETCHED_POSTERS)
      .flatMap((title) => tmdbImage(title.posterPath, 'w342') ?? []),
  );
  if (posters.length > 0) {
    await Image.prefetch([...new Set(posters)], 'memory-disk').catch(() => false);
  }
}
