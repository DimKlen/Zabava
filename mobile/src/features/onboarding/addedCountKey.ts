import type { MessageKey } from '@/i18n';

/** Clé du compteur de l'étape des titres : aucun, un seul ou plusieurs titres ajoutés. */
export function addedCountKey(count: number): MessageKey {
  if (count === 0) return 'onboarding.titles.count.zero';
  if (count === 1) return 'onboarding.titles.count.one';
  return 'onboarding.titles.count.other';
}
