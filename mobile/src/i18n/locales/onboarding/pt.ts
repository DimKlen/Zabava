import type { Messages } from '../types';

export const onboarding: Messages<typeof import('./fr').onboarding> = {
  'onboarding.back': 'Voltar',
  'onboarding.skip': 'Pular',
  'onboarding.login.busy': 'Entrando…',
  'onboarding.login.cancelled': 'Login cancelado',
  'onboarding.login.error': 'Não foi possível entrar, tente novamente',
  'onboarding.login.title': 'Tudo o que você assiste, em um só lugar',
  'onboarding.login.text':
    'Filmes, séries e animes: sua lista, seus episódios e os próximos lançamentos.',
  'onboarding.login.apple': 'Continuar com a Apple',
  'onboarding.login.google': 'Continuar com o Google',
  'onboarding.login.legal': 'Ao continuar, você aceita os {terms} e a {privacy}.',
  'onboarding.login.terms': 'termos de uso',
  'onboarding.login.privacy': 'política de privacidade',
  'onboarding.platforms.title': 'Suas plataformas',
  'onboarding.platforms.text':
    'Nós as destacamos e avisamos quando um filme da sua lista chegar a elas.',
  'onboarding.notifications.title': 'Não perca nenhum lançamento',
  'onboarding.notifications.text':
    'Enviamos no máximo um alerta por título por dia, apenas do que você acompanha.',
  'onboarding.notifications.episodes': 'No dia da exibição, no horário local.',
  'onboarding.notifications.cinema': 'Quando um filme da sua lista estreia no cinema.',
  'onboarding.notifications.streaming': 'Quando um filme chega às suas plataformas.',
  'onboarding.notifications.enable': 'Ativar as notificações',
  'onboarding.notifications.later': 'Mais tarde',
  'onboarding.titles.title': 'Seus primeiros títulos',
  'onboarding.titles.text': 'Toque no que você quer ver ou acompanhar.',
  'onboarding.titles.movies': 'Filmes',
  'onboarding.titles.series': 'Séries',
  'onboarding.titles.anime': 'Animes',
  'onboarding.titles.finish': 'Concluir',
  'onboarding.titles.count.zero': 'Toque num pôster para adicionar',
  'onboarding.titles.count.one': '1 título adicionado',
  'onboarding.titles.count.other': '{count} títulos adicionados',
  'onboarding.username.title': 'Escolha seu nome de usuário',
  'onboarding.username.text':
    'É o seu identificador no Zabava. Os outros membros vão encontrar você com ele. Você não poderá alterá-lo depois.',
};
