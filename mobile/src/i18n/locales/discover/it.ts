import type { Messages } from '../types';

export const discover: Messages<typeof import('./fr').discover> = {
  'discover.title': 'Scopri',
  'discover.tabs.movie': 'Film',
  'discover.tabs.tv': 'Serie',
  'discover.tabs.anime': 'Anime',
  'discover.offline.title': 'Scopri non è disponibile offline',
  'discover.offline.text': 'La tua lista e In arrivo restano disponibili dalla cache.',
  'discover.genre.title': 'Per genere',
  'discover.genre.back': 'Indietro',
  'discover.genre.empty': 'Nessun titolo in questo genere per ora',
  'discover.genre.mine': 'Sulle mie piattaforme',
  'discover.genre.rating': 'Voto {min}+',
};
