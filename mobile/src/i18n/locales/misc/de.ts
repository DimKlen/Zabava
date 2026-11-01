import type { Messages } from '../types';

export const misc: Messages<typeof import('./fr').misc> = {
  'misc.saveFailed': 'Speichern nicht möglich, versuch es noch einmal',
  'misc.cancel': 'Abbrechen',
  'misc.ok': 'OK',
  'misc.back': 'Zurück',
  'misc.signOut.title': 'Abmelden?',
  'misc.signOut.body': 'Deine Liste bleibt in deinem Konto gespeichert.',
  'misc.deleteAccount.title': 'Dein Konto löschen?',
  'misc.deleteAccount.body':
    'Deine Liste, dein Folgenfortschritt und deine Einstellungen werden endgültig gelöscht.',
  'misc.deleteAccount.confirm': 'Löschen',
  'misc.platforms.search': 'Plattform suchen',
  'misc.person.more': 'Mehr anzeigen',
  'misc.person.less': 'Weniger anzeigen',
  'misc.person.movies': 'Filme',
  'misc.person.series': 'Serien',
  'misc.person.sortPopular': 'Beliebtheit',
  'misc.person.sortRecent': 'Neueste',
  'misc.person.filmography': 'Filmografie',
  'misc.person.empty': 'Keine Titel in dieser Kategorie.',
  'misc.studio.empty': 'Noch keine Animes von diesem Studio',
};
