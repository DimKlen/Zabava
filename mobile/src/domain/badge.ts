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

export function posterBadge(
  title: BadgeTitle,
  myProviderIds: readonly number[],
  now: Date,
): PosterBadge | null {
  if (title.type !== 'movie') {
    const name = title.network ?? title.availability.sub[0]?.name;
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
