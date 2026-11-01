/** Profil — specs/docs/09 §9.2. */
import { t } from '@/i18n';

import { COUNTRY_NAMES } from './availability';
import { isGroupSelected, type ProviderGroup } from './providers';

/**
 * Région du profil (le pays) : dates de sortie, classification, et pays affiché à côté d'une
 * plateforme qui ne propose le titre qu'ailleurs (« Netflix (France) »). Valeurs du serveur.
 */
export const REGIONS: readonly { value: string; label: string }[] = [
  'CA',
  'FR',
  'BE',
  'CH',
  'US',
].map((code) => ({
  value: code,
  get label() {
    return COUNTRY_NAMES[code] ?? code;
  },
}));

/** « Canada » ; le code tel quel s'il est inconnu, rien sans région. */
export function regionLabel(region: string | undefined): string {
  return region ? (COUNTRY_NAMES[region] ?? region) : '';
}

export type NotificationSwitch = {
  key: 'episodes' | 'cinema' | 'streaming' | 'seasons';
};

export const NOTIFICATION_SWITCHES: readonly NotificationSwitch[] = [
  { key: 'episodes' },
  { key: 'cinema' },
  { key: 'streaming' },
  { key: 'seasons' },
];

/** « 9 h ». */
export function digestLabel(hour: number): string {
  return t('common.format.digestHour', { hour });
}

/** Heures du récapitulatif quotidien, dans l'ordre de la spec. */
export const DIGEST_HOURS: readonly { value: string; label: string }[] = [8, 9, 12, 18, 20].map(
  (hour) => ({
    value: String(hour),
    get label() {
      return digestLabel(hour);
    },
  }),
);

const PROVIDER_NAMES: Record<string, string> = { google: 'Google', apple: 'Apple' };

/** « dim@exemple.ca · Apple » ; fournisseur inconnu : l'adresse seule. */
export function accountLine(email: string | undefined, authProvider: string | undefined): string {
  const provider = authProvider ? PROVIDER_NAMES[authProvider.toLowerCase()] : undefined;
  return [email, provider].filter(Boolean).join(' · ');
}

/** « Netflix, Crave » dans l'ordre des plateformes de la région ; « Aucune » si vide. */
export function platformsSummary(
  providers: readonly ProviderGroup[],
  selectedIds: readonly number[],
): string {
  const names = providers.filter((p) => isGroupSelected(p, selectedIds)).map((p) => p.name);
  return names.length > 0 ? names.join(', ') : t('common.profile.noPlatform');
}
