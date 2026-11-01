import type { Messages } from '../types';

export const onboarding: Messages<typeof import('./fr').onboarding> = {
  'onboarding.back': 'Zurück',
  'onboarding.skip': 'Überspringen',
  'onboarding.login.busy': 'Anmeldung läuft…',
  'onboarding.login.cancelled': 'Anmeldung abgebrochen',
  'onboarding.login.error': 'Anmeldung nicht möglich, versuch es noch einmal',
  'onboarding.login.title': 'Alles, was du schaust, an einem Ort',
  'onboarding.login.text':
    'Filme, Serien und Animes: deine Liste, deine Folgen und kommende Starts.',
  'onboarding.login.apple': 'Weiter mit Apple',
  'onboarding.login.google': 'Weiter mit Google',
  'onboarding.login.legal': 'Wenn du fortfährst, akzeptierst du die {terms} und die {privacy}.',
  'onboarding.login.terms': 'Nutzungsbedingungen',
  'onboarding.login.privacy': 'Datenschutzerklärung',
  'onboarding.platforms.title': 'Deine Plattformen',
  'onboarding.platforms.text':
    'Wir heben sie hervor und sagen dir Bescheid, wenn ein Film aus deiner Liste dort erscheint.',
  'onboarding.notifications.title': 'Verpasse keinen Start',
  'onboarding.notifications.text':
    'Wir schicken dir höchstens eine Benachrichtigung pro Titel und Tag, nur für das, was du verfolgst.',
  'onboarding.notifications.episodes': 'Am Ausstrahlungstag, zur Ortszeit.',
  'onboarding.notifications.cinema': 'Wenn ein Film aus deiner Liste im Kino startet.',
  'onboarding.notifications.streaming': 'Wenn ein Film auf deinen Plattformen erscheint.',
  'onboarding.notifications.enable': 'Benachrichtigungen aktivieren',
  'onboarding.notifications.later': 'Später',
  'onboarding.titles.title': 'Deine ersten Titel',
  'onboarding.titles.text': 'Tippe auf das, was du sehen oder verfolgen möchtest.',
  'onboarding.titles.movies': 'Filme',
  'onboarding.titles.series': 'Serien',
  'onboarding.titles.anime': 'Animes',
  'onboarding.titles.finish': 'Fertig',
  'onboarding.titles.count.zero': 'Tippe auf ein Poster, um es hinzuzufügen',
  'onboarding.titles.count.one': '1 Titel hinzugefügt',
  'onboarding.titles.count.other': '{count} Titel hinzugefügt',
  'onboarding.username.title': 'Wähle deinen Benutzernamen',
  'onboarding.username.text':
    'Das ist deine Kennung bei Zabava. Andere Mitglieder finden dich damit. Du kannst sie später nicht mehr ändern.',
};
