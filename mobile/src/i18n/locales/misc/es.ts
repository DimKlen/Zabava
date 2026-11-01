import type { Messages } from '../types';

export const misc: Messages<typeof import('./fr').misc> = {
  'misc.saveFailed': 'No se pudo guardar, inténtalo de nuevo',
  'misc.cancel': 'Cancelar',
  'misc.ok': 'OK',
  'misc.back': 'Atrás',
  'misc.signOut.title': '¿Cerrar sesión?',
  'misc.signOut.body': 'Tu lista queda guardada en tu cuenta.',
  'misc.deleteAccount.title': '¿Eliminar tu cuenta?',
  'misc.deleteAccount.body':
    'Tu lista, tu seguimiento de episodios y tus ajustes se borrarán definitivamente.',
  'misc.deleteAccount.confirm': 'Eliminar',
  'misc.platforms.search': 'Buscar una plataforma',
  'misc.person.more': 'Ver más',
  'misc.person.less': 'Ver menos',
  'misc.person.movies': 'Películas',
  'misc.person.series': 'Series',
  'misc.person.sortPopular': 'Popularidad',
  'misc.person.sortRecent': 'Más reciente',
  'misc.person.filmography': 'Filmografía',
  'misc.person.empty': 'Ningún título en esta categoría.',
  'misc.studio.empty': 'Aún no hay anime de este estudio',
};
