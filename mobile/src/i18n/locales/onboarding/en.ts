import type { Messages } from '../types';

export const onboarding: Messages<typeof import('./fr').onboarding> = {
  'onboarding.back': 'Back',
  'onboarding.skip': 'Skip',
  'onboarding.login.busy': 'Signing in…',
  'onboarding.login.cancelled': 'Sign-in cancelled',
  'onboarding.login.error': 'Unable to sign in, try again',
  'onboarding.login.title': 'Everything you watch, in one place',
  'onboarding.login.text':
    'Movies, series and anime: your list, your episodes and upcoming releases.',
  'onboarding.login.apple': 'Continue with Apple',
  'onboarding.login.google': 'Continue with Google',
  'onboarding.login.legal': 'By continuing, you accept the {terms} and the {privacy}.',
  'onboarding.login.terms': 'terms of use',
  'onboarding.login.privacy': 'privacy policy',
  'onboarding.platforms.title': 'Your platforms',
  'onboarding.platforms.text':
    'We highlight them and let you know when a movie from your list arrives on them.',
  'onboarding.notifications.title': "Don't miss a release",
  'onboarding.notifications.text':
    'We send you at most one alert per title per day, only for what you follow.',
  'onboarding.notifications.episodes': 'On the day it airs, at local time.',
  'onboarding.notifications.cinema': 'When a movie from your list hits theaters.',
  'onboarding.notifications.streaming': 'When a movie arrives on your platforms.',
  'onboarding.notifications.enable': 'Turn on notifications',
  'onboarding.notifications.later': 'Later',
  'onboarding.titles.title': 'Your first titles',
  'onboarding.titles.text': 'Tap what you want to watch or follow.',
  'onboarding.titles.movies': 'Movies',
  'onboarding.titles.series': 'Series',
  'onboarding.titles.anime': 'Anime',
  'onboarding.titles.finish': 'Finish',
  'onboarding.titles.count.zero': 'Tap a poster to add it',
  'onboarding.titles.count.one': '1 title added',
  'onboarding.titles.count.other': '{count} titles added',
  'onboarding.username.title': 'Choose your username',
  'onboarding.username.text':
    'This is your ID on Zabava. Other members will find you with it. You will not be able to change it later.',
};
