/** Disponibilité d'un film dans la région — specs/docs/01 §5 (`A.mState`, `A.bestPlat`). */
import { daysFromToday } from './dates';
import { groupProviders, isGroupSelected, type ProviderGroup } from './providers';
import type { Availability, Provider } from './types';

export type MovieState = 'upcoming' | 'avail' | 'cinema' | 'unknown';

export type MovieAvailability = {
  /** Sortie en salle dans la région (ISO). */
  releaseTheatrical?: string;
  availability: Availability;
};

/** Au cinéma : sortie en salle depuis moins de 60 jours, sans offre en ligne. */
const CINEMA_WINDOW_DAYS = 60;

/** Abonnement ou location : l'achat seul n'est plus affiché, il ne rend pas un film disponible. */
function hasOffer({ sub, rent }: Availability): boolean {
  return sub.length > 0 || rent.length > 0;
}

export function movieState(movie: MovieAvailability, now: Date): MovieState {
  const release =
    movie.releaseTheatrical === undefined ? undefined : daysFromToday(movie.releaseTheatrical, now);
  if (release !== undefined && release > 0) return 'upcoming';
  if (hasOffer(movie.availability)) return 'avail';
  if (release !== undefined && release > -CINEMA_WINDOW_DAYS) return 'cinema';
  return 'unknown';
}

/** Abonnement ou location chez une de mes plateformes (l'achat n'est plus affiché). */
export function isOnMyPlatforms(availability: Availability, myProviderIds: readonly number[]) {
  return [...availability.sub, ...availability.rent].some((provider) =>
    myProviderIds.includes(provider.id),
  );
}

/**
 * Plateforme prioritaire : abonnement chez moi, premier abonnement, location chez moi,
 * première location, premier achat.
 */
export function bestProvider(
  { sub, rent, buy }: Availability,
  myProviderIds: readonly number[],
): Provider | undefined {
  const mine = (provider: Provider) => myProviderIds.includes(provider.id);
  return sub.find(mine) ?? sub[0] ?? rent.find(mine) ?? rent[0] ?? buy[0];
}

/** Mes plateformes en premier, l'ordre d'origine conservé sinon (« Où regarder »). */
export function mineFirst(providers: readonly Provider[], myProviderIds: readonly number[]) {
  const mine = providers.filter((provider) => myProviderIds.includes(provider.id));
  const others = providers.filter((provider) => !myProviderIds.includes(provider.id));
  return [...mine, ...others];
}

/**
 * « Où regarder » : abonnement, location puis achat, une seule entrée par service (« Netflix
 * Standard with Ads » et « Amazon Video » rejoignent leur service, Cosmo Go est masqué), les
 * miennes en premier.
 */
export function whereToWatch(
  { sub, rent, buy }: Availability,
  myProviderIds: readonly number[],
): ProviderGroup[] {
  const unique = new Map<number, Provider>();
  for (const provider of [...sub, ...rent, ...buy]) {
    if (!unique.has(provider.id)) unique.set(provider.id, provider);
  }
  const groups = groupProviders([...unique.values()]);
  const mine = groups.filter((group) => isGroupSelected(group, myProviderIds));
  return [...mine, ...groups.filter((group) => !mine.includes(group))];
}

const COUNTRY_NAMES: Record<string, string> = {
  CA: 'Canada',
  FR: 'France',
  BE: 'Belgique',
  CH: 'Suisse',
  US: 'États-Unis',
  GB: 'Royaume-Uni',
  DE: 'Allemagne',
  ES: 'Espagne',
  IT: 'Italie',
};

/** « (France, Canada) » : pays où la plateforme propose le titre, ou rien si on ne le sait pas. */
export function countriesLabel(countries: readonly string[] | undefined): string | undefined {
  if (!countries || countries.length === 0) return undefined;
  return `(${countries.map((code) => COUNTRY_NAMES[code] ?? code).join(', ')})`;
}
