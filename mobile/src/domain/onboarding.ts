/** Onboarding — specs/docs/05-ecrans-auth-onboarding.md §5.2 et §5.3. */
import { tPlural } from '@/lib/plural';
import { t } from '@/i18n';

import type { MediaType, UserTitle } from './types';

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
  if (count === 0) return t('common.onboarding.tapPoster');
  return tPlural('common.onboarding.added', count);
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
