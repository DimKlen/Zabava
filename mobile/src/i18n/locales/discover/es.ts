import type { Messages } from '../types';

export const discover: Messages<typeof import('./fr').discover> = {
  'discover.title': 'Descubrir',
  'discover.tabs.movie': 'Películas',
  'discover.tabs.tv': 'Series',
  'discover.tabs.anime': 'Anime',
  'discover.offline.title': 'Descubrir no está disponible sin conexión',
  'discover.offline.text': 'Tu lista y Próximamente siguen disponibles desde la caché.',
  'discover.genre.title': 'Por género',
  'discover.genre.back': 'Atrás',
  'discover.genre.empty': 'Aún no hay títulos en este género',
  'discover.genre.mine': 'En mis plataformas',
  'discover.genre.rating': 'Nota {min}+',
};
