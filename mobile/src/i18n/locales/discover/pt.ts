import type { Messages } from '../types';

export const discover: Messages<typeof import('./fr').discover> = {
  'discover.title': 'Descobrir',
  'discover.tabs.movie': 'Filmes',
  'discover.tabs.tv': 'Séries',
  'discover.tabs.anime': 'Animes',
  'discover.offline.title': 'Descobrir não está disponível offline',
  'discover.offline.text': 'Sua lista e Em breve continuam disponíveis pelo cache.',
  'discover.genre.title': 'Por gênero',
  'discover.genre.back': 'Voltar',
  'discover.genre.empty': 'Ainda não há títulos neste gênero',
  'discover.genre.mine': 'Nas minhas plataformas',
  'discover.genre.rating': 'Nota {min}+',
};
