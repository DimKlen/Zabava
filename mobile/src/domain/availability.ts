/** Disponibilité d'un film dans la région — specs/docs/01 §5 (`A.mState`, `A.bestPlat`). */
import { daysFromToday } from './dates';
import {
  groupProviders,
  isGroupSelected,
  isListedProvider,
  mergedCountries,
  type ProviderGroup,
} from './providers';
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
 * Standard with Ads » et « Amazon Video » rejoignent leur service, Cosmo Go est masqué), limité
 * aux plateformes de « Mes plateformes » du profil, les miennes en premier.
 */
export function whereToWatch(
  { sub, rent, buy }: Availability,
  myProviderIds: readonly number[],
): ProviderGroup[] {
  // Une même plateforme en abonnement et en location : ses pays des deux offres.
  const offers = new Map<number, Provider[]>();
  for (const provider of [...sub, ...rent, ...buy]) {
    offers.set(provider.id, [...(offers.get(provider.id) ?? []), provider]);
  }
  const unique = [...offers.values()].flatMap(([first, ...others]) =>
    first ? [{ ...first, countries: mergedCountries([first, ...others]) }] : [],
  );
  const groups = groupProviders(unique).filter((group) => isListedProvider(group, myProviderIds));
  const mine = groups.filter((group) => isGroupSelected(group, myProviderIds));
  return [...mine, ...groups.filter((group) => !mine.includes(group))];
}

/** Noms des pays proposés par le serveur. */
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

/** Centre approximatif des pays proposés par le serveur (latitude, longitude en degrés). */
const COUNTRY_CENTERS: Record<string, readonly [number, number]> = {
  CA: [56.1, -106.3],
  US: [39.8, -98.6],
  FR: [46.6, 2.2],
  BE: [50.6, 4.6],
  CH: [46.8, 8.2],
  GB: [54.0, -2.0],
  DE: [51.2, 10.4],
  ES: [40.4, -3.7],
  IT: [42.8, 12.6],
};

/** Distance angulaire entre deux pays (loi des cosinus sphérique), Infinity si l'un est inconnu. */
function distance(from: string, to: string): number {
  const a = COUNTRY_CENTERS[from];
  const b = COUNTRY_CENTERS[to];
  if (!a || !b) return Infinity;
  const rad = Math.PI / 180;
  const cos =
    Math.sin(a[0] * rad) * Math.sin(b[0] * rad) +
    Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.cos((a[1] - b[1]) * rad);
  return Math.acos(Math.min(1, Math.max(-1, cos)));
}

/**
 * Pays affiché à côté d'une plateforme : rien si elle propose le titre dans ma région, sinon
 * le pays le plus proche de ma région (« Netflix (États-Unis) »), le catalogue changeant selon le pays.
 */
export function countryLabel(
  countries: readonly string[] | undefined,
  region: string | undefined,
): string | undefined {
  if (!countries || countries.length === 0 || !region || countries.includes(region)) {
    return undefined;
  }
  const [closest] = [...countries].sort((a, b) => distance(region, a) - distance(region, b));
  return closest ? `(${COUNTRY_NAMES[closest] ?? closest})` : undefined;
}
