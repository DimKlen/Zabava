/** Badge d'affiche — specs/docs/01 §5 (`A.badge`). */
import { bestProvider, movieState, type MovieAvailability } from './availability';
import { formatShortDate } from './format';
import type { MediaType } from './types';

export type PosterBadge = { text: string; highlight?: boolean };

export type BadgeTitle = MovieAvailability & {
  type: MediaType;
  /** Plateforme ou chaîne d'origine d'une série. */
  network?: string;
};

/**
 * Plateforme d'une série : abonnement (une des miennes d'abord), sinon la chaîne
 * d'origine. Shōgun affiche « Disney+ » et non « FX » (capture 08).
 */
export function seriesPlatform(
  title: Pick<BadgeTitle, 'availability' | 'network'>,
  myProviderIds: readonly number[],
): string | undefined {
  const sub = title.availability.sub;
  const platform = sub.find((p) => myProviderIds.includes(p.id)) ?? sub[0];
  return platform?.name ?? title.network;
}

export function posterBadge(
  title: BadgeTitle,
  myProviderIds: readonly number[],
  now: Date,
): PosterBadge | null {
  if (title.type !== 'movie') {
    const name = seriesPlatform(title, myProviderIds);
    return name ? { text: name } : null;
  }
  switch (movieState(title, now)) {
    case 'upcoming':
      return title.releaseTheatrical ? { text: formatShortDate(title.releaseTheatrical) } : null;
    case 'cinema':
      return { text: 'Au cinéma', highlight: true };
    case 'avail': {
      const provider = bestProvider(title.availability, myProviderIds);
      return provider ? { text: provider.name } : null;
    }
    case 'unknown':
      return null;
  }
}
