import type { Messages } from '../types';

export const misc: Messages<typeof import('./fr').misc> = {
  'misc.saveFailed': 'Não foi possível salvar, tente novamente',
  'misc.cancel': 'Cancelar',
  'misc.ok': 'OK',
  'misc.back': 'Voltar',
  'misc.signOut.title': 'Sair da conta?',
  'misc.signOut.body': 'Sua lista continua salva na sua conta.',
  'misc.deleteAccount.title': 'Excluir sua conta?',
  'misc.deleteAccount.body':
    'Sua lista, seu acompanhamento de episódios e suas configurações serão apagados definitivamente.',
  'misc.deleteAccount.confirm': 'Excluir',
  'misc.platforms.search': 'Buscar uma plataforma',
  'misc.person.more': 'Ver mais',
  'misc.person.less': 'Ver menos',
  'misc.person.movies': 'Filmes',
  'misc.person.series': 'Séries',
  'misc.person.sortPopular': 'Popularidade',
  'misc.person.sortRecent': 'Mais recente',
  'misc.person.filmography': 'Filmografia',
  'misc.person.empty': 'Nenhum título nesta categoria.',
  'misc.studio.empty': 'Ainda não há animes deste estúdio',
};
