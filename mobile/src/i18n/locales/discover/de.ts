import type { Messages } from '../types';

export const discover: Messages<typeof import('./fr').discover> = {
  'discover.title': 'Entdecken',
  'discover.tabs.movie': 'Filme',
  'discover.tabs.tv': 'Serien',
  'discover.tabs.anime': 'Animes',
  'discover.offline.title': 'Entdecken ist offline nicht verfügbar',
  'discover.offline.text': 'Deine Liste und Demnächst bleiben über den Cache verfügbar.',
  'discover.genre.title': 'Nach Genre',
  'discover.genre.back': 'Zurück',
  'discover.genre.empty': 'Noch keine Titel in diesem Genre',
  'discover.genre.mine': 'Auf meinen Plattformen',
  'discover.genre.rating': 'Bewertung {min}+',
};
