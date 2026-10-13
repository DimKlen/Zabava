import { useQuery } from '@tanstack/react-query';

import type { PosterTitle } from '@/api/catalog';
import { useProfile } from '@/api/profile';
import { movieWatchlistQuery, seriesWatchlistQuery } from '@/api/watchlist';

/** « Dans ma liste ? » d'un titre du catalogue. */
export type Membership = (title: PosterTitle) => boolean;

/**
 * Ma liste réduite à deux ensembles d'identifiants, lus une seule fois par écran : les
 * affiches reçoivent un simple booléen. Une série est reconnue par son id TMDB, qu'elle
 * soit classée série ou animé. Les trois listes sont chargées : l'ajout rapide lit aussi
 * leur cache pour savoir s'il faut ajouter ou retirer.
 */
export function useLibraryMembership(): Membership {
  const movies = useQuery({
    ...movieWatchlistQuery(),
    select: (list) => new Set(list.map((m) => m.id)),
  }).data;
  const tv = useQuery({
    ...seriesWatchlistQuery('tv'),
    select: (list) => list.map((s) => s.tmdbId),
  }).data;
  const anime = useQuery({
    ...seriesWatchlistQuery('anime'),
    select: (list) => list.map((s) => s.tmdbId),
  }).data;
  const series = new Set([...(tv ?? []), ...(anime ?? [])]);
  return (title) =>
    title.type === 'movie' ? Boolean(movies?.has(title.id)) : series.has(title.tmdbId);
}

const NO_PROVIDERS: readonly number[] = [];

/** Mes plateformes (badges), lues une fois par écran ; référence stable sans profil. */
export function useMyProviderIds(): readonly number[] {
  return useProfile().data?.providerIds ?? NO_PROVIDERS;
}
