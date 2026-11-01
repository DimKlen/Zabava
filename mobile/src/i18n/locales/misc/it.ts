import type { Messages } from '../types';

export const misc: Messages<typeof import('./fr').misc> = {
  'misc.saveFailed': 'Impossibile salvare, riprova',
  'misc.cancel': 'Annulla',
  'misc.ok': 'OK',
  'misc.back': 'Indietro',
  'misc.signOut.title': 'Disconnettersi?',
  'misc.signOut.body': 'La tua lista resta salvata sul tuo account.',
  'misc.deleteAccount.title': 'Eliminare il tuo account?',
  'misc.deleteAccount.body':
    'La tua lista, il tuo seguito degli episodi e le tue impostazioni saranno eliminati definitivamente.',
  'misc.deleteAccount.confirm': 'Elimina',
  'misc.platforms.search': 'Cerca una piattaforma',
  'misc.person.more': 'Mostra altro',
  'misc.person.less': 'Mostra meno',
  'misc.person.movies': 'Film',
  'misc.person.series': 'Serie',
  'misc.person.sortPopular': 'Popolarità',
  'misc.person.sortRecent': 'Più recente',
  'misc.person.filmography': 'Filmografia',
  'misc.person.empty': 'Nessun titolo in questa categoria.',
  'misc.studio.empty': 'Per ora nessun anime di questo studio',
};
