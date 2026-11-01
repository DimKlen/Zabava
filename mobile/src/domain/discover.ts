/** Découvrir — specs/docs/08 §8.3. */
import { t, type MessageKey } from '@/i18n';

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

/** Section dont le titre suit la langue courante (lu à l'affichage). */
function section(list: DiscoverList, key: MessageKey): DiscoverSection {
  return {
    list,
    get title() {
      return t(key);
    },
  };
}

const SERIES_SECTIONS: readonly DiscoverSection[] = [
  section('trending', 'common.discover.trending'),
  section('new_seasons', 'common.discover.newSeasons'),
  section('popular_on_mine', 'common.discover.popularOnMine'),
  section('top_rated', 'common.discover.topRated'),
];

/** Carrousels d'un onglet, dans l'ordre de la spec. */
export const DISCOVER_SECTIONS: Record<MediaType, readonly DiscoverSection[]> = {
  movie: [
    section('trending', 'common.discover.trendingWeek'),
    section('now_playing', 'common.discover.nowPlaying'),
    section('upcoming', 'common.discover.upcoming'),
    section('new_on_mine', 'common.discover.newOnMine'),
    section('top_rated', 'common.discover.topRated'),
  ],
  tv: SERIES_SECTIONS,
  anime: [...SERIES_SECTIONS, section('season_anime', 'common.discover.seasonAnime')],
};
