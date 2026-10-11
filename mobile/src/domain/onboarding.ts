/** Onboarding — specs/docs/05-ecrans-auth-onboarding.md §5.2 et §5.3. */
import type { MediaType, UserTitle } from './types';

export type RegionCode = 'CA' | 'FR' | 'BE' | 'CH' | 'US';
export type LanguageCode = 'fr-CA' | 'fr-FR' | 'en-CA' | 'en-US';

export const REGIONS: readonly { value: RegionCode; label: string }[] = [
  { value: 'CA', label: 'Canada' },
  { value: 'FR', label: 'France' },
  { value: 'BE', label: 'Belgique' },
  { value: 'CH', label: 'Suisse' },
  { value: 'US', label: 'États-Unis' },
];

export const LANGUAGES: readonly { value: LanguageCode; label: string }[] = [
  { value: 'fr-CA', label: 'Français (fr-CA)' },
  { value: 'fr-FR', label: 'Français (fr-FR)' },
  { value: 'en-CA', label: 'English (en-CA)' },
  { value: 'en-US', label: 'English (en-US)' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'fr-CA';

/** Région du téléphone si elle est proposée, sinon Canada. */
export function defaultRegion(deviceRegion: string | null | undefined): RegionCode {
  const code = deviceRegion?.toUpperCase();
  return REGIONS.find((region) => region.value === code)?.value ?? 'CA';
}

export const ONBOARDING_STEPS = ['region', 'platforms', 'titles'] as const;
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

/** Étape précédente (retour aux étapes 2 et 3 seulement). */
export function previousStep(step: OnboardingStep): OnboardingStep | null {
  return ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) - 1] ?? null;
}

/** Compteur de l'étape 3 (titres ajoutés pendant l'onboarding). */
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
