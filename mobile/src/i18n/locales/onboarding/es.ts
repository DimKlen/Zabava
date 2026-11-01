import type { Messages } from '../types';

export const onboarding: Messages<typeof import('./fr').onboarding> = {
  'onboarding.back': 'Atrás',
  'onboarding.skip': 'Omitir',
  'onboarding.login.busy': 'Iniciando sesión…',
  'onboarding.login.cancelled': 'Inicio de sesión cancelado',
  'onboarding.login.error': 'No se pudo iniciar sesión, inténtalo de nuevo',
  'onboarding.login.title': 'Todo lo que ves, en un solo lugar',
  'onboarding.login.text':
    'Películas, series y anime: tu lista, tus episodios y los próximos estrenos.',
  'onboarding.login.apple': 'Continuar con Apple',
  'onboarding.login.google': 'Continuar con Google',
  'onboarding.login.legal': 'Al continuar, aceptas las {terms} y la {privacy}.',
  'onboarding.login.terms': 'condiciones de uso',
  'onboarding.login.privacy': 'política de privacidad',
  'onboarding.platforms.title': 'Tus plataformas',
  'onboarding.platforms.text':
    'Las destacamos y te avisamos cuando una película de tu lista llegue a ellas.',
  'onboarding.notifications.title': 'No te pierdas ningún estreno',
  'onboarding.notifications.text':
    'Te enviamos como máximo una alerta por título y por día, solo de lo que sigues.',
  'onboarding.notifications.episodes': 'El día de emisión, a la hora local.',
  'onboarding.notifications.cinema': 'Cuando una película de tu lista llega al cine.',
  'onboarding.notifications.streaming': 'Cuando una película llega a tus plataformas.',
  'onboarding.notifications.enable': 'Activar las notificaciones',
  'onboarding.notifications.later': 'Más tarde',
  'onboarding.titles.title': 'Tus primeros títulos',
  'onboarding.titles.text': 'Toca lo que quieres ver o seguir.',
  'onboarding.titles.movies': 'Películas',
  'onboarding.titles.series': 'Series',
  'onboarding.titles.anime': 'Anime',
  'onboarding.titles.finish': 'Terminar',
  'onboarding.titles.count.zero': 'Toca un póster para añadirlo',
  'onboarding.titles.count.one': '1 título añadido',
  'onboarding.titles.count.other': '{count} títulos añadidos',
  'onboarding.username.title': 'Elige tu nombre de usuario',
  'onboarding.username.text':
    'Es tu identificador en Zabava. Los demás miembros te encontrarán con él. No podrás cambiarlo después.',
};
