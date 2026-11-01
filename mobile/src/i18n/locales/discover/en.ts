import type { Messages } from '../types';

export const discover: Messages<typeof import('./fr').discover> = {
  'discover.title': 'Discover',
  'discover.tabs.movie': 'Movies',
  'discover.tabs.tv': 'Series',
  'discover.tabs.anime': 'Anime',
  'discover.offline.title': 'Discover is unavailable offline',
  'discover.offline.text': 'Your list and Upcoming are still available from the cache.',
  'discover.genre.title': 'By genre',
  'discover.genre.back': 'Back',
  'discover.genre.empty': 'No titles in this genre yet',
  'discover.genre.mine': 'On my platforms',
  'discover.genre.rating': 'Rating {min}+',
};
