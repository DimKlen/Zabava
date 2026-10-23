/** Onboarding — specs/docs/05-ecrans-auth-onboarding.md §5.2 et §5.3. */
import type { MediaType, UserTitle } from './types';

export type LanguageCode = 'fr-CA' | 'fr-FR' | 'en-CA' | 'en-US';

/** Deux langues proposées ; les anciens fr-FR et en-CA restent lus (même langue). */
export const LANGUAGES: readonly { value: LanguageCode; label: string }[] = [
  { value: 'fr-CA', label: 'Français' },
  { value: 'en-US', label: 'Anglais' },
];

/** Langue proposée correspondant à un code enregistré (« fr-FR » → « fr-CA »). */
export function languageChoice(code: string | undefined): LanguageCode {
  return code?.startsWith('en') ? 'en-US' : 'fr-CA';
}

export function languageLabel(code: string | undefined): string {
  const choice = languageChoice(code);
  return LANGUAGES.find((language) => language.value === choice)?.label ?? '';
}

export const DEFAULT_LANGUAGE: LanguageCode = 'fr-CA';

/** Le pseudo vient en premier (specs/social/docs/04 §4.1). */
export const ONBOARDING_STEPS = ['username', 'region', 'platforms', 'titles'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Étape d'un chemin `/onboarding/…`, ou null (écran des notifications). */
export function stepFromPath(pathname: string): OnboardingStep | null {
  const last = pathname.split('/').pop();
  return ONBOARDING_STEPS.find((step) => step === last) ?? null;
}

/** Après la dernière étape vient l'explication des notifications. */
export function nextStep(step: OnboardingStep): OnboardingStep | 'notifications' {
  return ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1] ?? 'notifications';
}

/** Étape précédente (pas de retour depuis le pseudo). */
export function previousStep(step: OnboardingStep): OnboardingStep | null {
  return ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) - 1] ?? null;
}

/** « Passer » : jamais sur l'étape du pseudo, obligatoire. */
export function canSkip(step: OnboardingStep): boolean {
  return step !== 'username';
}

/** Compteur de l'étape des titres (titres ajoutés pendant l'onboarding). */
export function addedCountLabel(count: number): string {
  if (count === 0) return "Touche une affiche pour l'ajouter";
  if (count === 1) return '1 titre ajouté';
  return `${count} titres ajoutés`;
}

/** Statut d'un titre ajouté : film → À voir, série ou animé → suivi. */
export function initialStatus(type: MediaType): UserTitle['status'] {
  return type === 'movie' ? 'towatch' : 'following';
}

/** Permission refusée : les 4 préférences de notification sont coupées. */
export const NOTIFICATIONS_OFF = {
  episodes: false,
  cinema: false,
  streaming: false,
  seasons: false,
} as const;

/** Au moins une des 4 notifications est activée (`notificationPrefs` du profil). */
export function anyNotificationEnabled(
  prefs: Partial<Record<keyof typeof NOTIFICATIONS_OFF, boolean>> | undefined,
): boolean {
  return Boolean(prefs?.episodes || prefs?.cinema || prefs?.streaming || prefs?.seasons);
}
