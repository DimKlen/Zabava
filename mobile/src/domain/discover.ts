/** Découvrir — specs/docs/08 §8.3. */
import type { MediaType } from './types';

export type DiscoverList =
  | 'trending'
  | 'now_playing'
  | 'upcoming'
  | 'new_on_mine'
  | 'top_rated'
  | 'new_seasons'
  | 'popular_on_mine'
  | 'season_anime';

export type DiscoverSection = { list: DiscoverList; title: string };

const SERIES_SECTIONS: readonly DiscoverSection[] = [
  { list: 'trending', title: 'Tendances' },
  { list: 'new_seasons', title: 'Nouvelles saisons cette semaine' },
  { list: 'popular_on_mine', title: 'Populaires sur mes plateformes' },
  { list: 'top_rated', title: 'Les mieux notés' },
];

/** Carrousels d'un onglet, dans l'ordre de la spec. */
export const DISCOVER_SECTIONS: Record<MediaType, readonly DiscoverSection[]> = {
  movie: [
    { list: 'trending', title: 'Tendances de la semaine' },
    { list: 'now_playing', title: 'Au cinéma' },
    { list: 'upcoming', title: 'Bientôt en salle' },
    { list: 'new_on_mine', title: 'Nouveautés sur mes plateformes' },
    { list: 'top_rated', title: 'Les mieux notés' },
  ],
  tv: SERIES_SECTIONS,
  anime: [...SERIES_SECTIONS, { list: 'season_anime', title: 'Animés de la saison en cours' }],
};
