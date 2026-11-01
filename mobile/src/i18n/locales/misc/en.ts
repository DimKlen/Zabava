import type { Messages } from '../types';

export const misc: Messages<typeof import('./fr').misc> = {
  'misc.saveFailed': "Couldn't save, try again",
  'misc.cancel': 'Cancel',
  'misc.ok': 'OK',
  'misc.back': 'Back',
  'misc.signOut.title': 'Sign out?',
  'misc.signOut.body': 'Your list stays saved on your account.',
  'misc.deleteAccount.title': 'Delete your account?',
  'misc.deleteAccount.body':
    'Your list, your episode tracking and your settings will be permanently deleted.',
  'misc.deleteAccount.confirm': 'Delete',
  'misc.platforms.search': 'Search for a platform',
  'misc.person.more': 'Show more',
  'misc.person.less': 'Show less',
  'misc.person.movies': 'Movies',
  'misc.person.series': 'Series',
  'misc.person.sortPopular': 'Popularity',
  'misc.person.sortRecent': 'Most recent',
  'misc.person.filmography': 'Filmography',
  'misc.person.empty': 'No titles in this category.',
  'misc.studio.empty': 'No anime for this studio yet',
};
