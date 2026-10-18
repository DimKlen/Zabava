/** Disponibilité d'un film dans la région — specs/docs/01 §5 (`A.mState`, `A.bestPlat`). */
import { daysFromToday } from './dates';
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
