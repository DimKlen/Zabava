import { useQuery } from '@tanstack/react-query';

import type { PosterTitle } from '@/api/catalog';
import { movieWatchlistQuery, seriesWatchlistQuery } from '@/api/watchlist';

/**
 * « Dans ma liste ? » pour une affiche ou une ligne du catalogue. Chaque élément ne lit
 * que sa réponse (`select`) : un ajout ne redessine que l'élément concerné, pas les
 * centaines d'affiches de Découvrir ou de la recherche.
 *
 * Les trois listes sont chargées : l'ajout rapide lit aussi leur cache pour savoir s'il
 * faut ajouter ou retirer. Une série est reconnue par son id TMDB, qu'elle soit classée
 * série ou animé.
 */
export function useInList(title: PosterTitle): boolean {
  const movie = useQuery({
    ...movieWatchlistQuery(),
    select: (movies) => title.type === 'movie' && movies.some((m) => m.id === title.id),
  }).data;
  const tv = useQuery({
    ...seriesWatchlistQuery('tv'),
    select: (series) => title.type !== 'movie' && series.some((s) => s.tmdbId === title.tmdbId),
  }).data;
  const anime = useQuery({
    ...seriesWatchlistQuery('anime'),
    select: (series) => title.type !== 'movie' && series.some((s) => s.tmdbId === title.tmdbId),
  }).data;
  return Boolean(movie || tv || anime);
}
