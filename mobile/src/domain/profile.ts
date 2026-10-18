/** Profil — specs/docs/09 §9.2. */
import { isGroupSelected, type ProviderGroup } from './providers';

export type NotificationSwitch = {
  key: 'episodes' | 'cinema' | 'streaming' | 'seasons';
  label: string;
};

export const NOTIFICATION_SWITCHES: readonly NotificationSwitch[] = [
  { key: 'episodes', label: 'Nouveaux épisodes' },
  { key: 'cinema', label: 'Sorties en salle' },
  { key: 'streaming', label: 'Disponibilité en streaming' },
  { key: 'seasons', label: 'Nouvelles saisons' },
];

/** « 9 h ». */
export function digestLabel(hour: number): string {
  return `${hour} h`;
}

/** Heures du récapitulatif quotidien, dans l'ordre de la spec. */
export const DIGEST_HOURS: readonly { value: string; label: string }[] = [8, 9, 12, 18, 20].map(
  (hour) => ({ value: String(hour), label: digestLabel(hour) }),
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
  return names.length > 0 ? names.join(', ') : 'Aucune';
}
