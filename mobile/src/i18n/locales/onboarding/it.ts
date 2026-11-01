import type { Messages } from '../types';

export const onboarding: Messages<typeof import('./fr').onboarding> = {
  'onboarding.back': 'Indietro',
  'onboarding.skip': 'Salta',
  'onboarding.login.busy': 'Accesso in corso…',
  'onboarding.login.cancelled': 'Accesso annullato',
  'onboarding.login.error': 'Impossibile accedere, riprova',
  'onboarding.login.title': 'Tutto ciò che guardi, in un unico posto',
  'onboarding.login.text':
    'Film, serie e anime: la tua lista, i tuoi episodi e le prossime uscite.',
  'onboarding.login.apple': 'Continua con Apple',
  'onboarding.login.google': 'Continua con Google',
  'onboarding.login.legal': "Continuando, accetti i {terms} e l'{privacy}.",
  'onboarding.login.terms': 'termini di utilizzo',
  'onboarding.login.privacy': 'informativa sulla privacy',
  'onboarding.platforms.title': 'Le tue piattaforme',
  'onboarding.platforms.text':
    'Le mettiamo in evidenza e ti avvisiamo quando un film della tua lista arriva su di esse.',
  'onboarding.notifications.title': 'Non perderti nessuna uscita',
  'onboarding.notifications.text':
    'Ti inviamo al massimo un avviso per titolo al giorno, solo per ciò che segui.',
  'onboarding.notifications.episodes': "Il giorno della messa in onda, all'ora locale.",
  'onboarding.notifications.cinema': 'Quando un film della tua lista esce al cinema.',
  'onboarding.notifications.streaming': 'Quando un film arriva sulle tue piattaforme.',
  'onboarding.notifications.enable': 'Attiva le notifiche',
  'onboarding.notifications.later': 'Più tardi',
  'onboarding.titles.title': 'I tuoi primi titoli',
  'onboarding.titles.text': 'Tocca ciò che vuoi guardare o seguire.',
  'onboarding.titles.movies': 'Film',
  'onboarding.titles.series': 'Serie',
  'onboarding.titles.anime': 'Anime',
  'onboarding.titles.finish': 'Fine',
  'onboarding.titles.count.zero': 'Tocca una locandina per aggiungerla',
  'onboarding.titles.count.one': '1 titolo aggiunto',
  'onboarding.titles.count.other': '{count} titoli aggiunti',
  'onboarding.username.title': 'Scegli il tuo nome utente',
  'onboarding.username.text':
    'È il tuo identificativo su Zabava. Gli altri membri ti troveranno con questo. Non potrai più cambiarlo.',
};
