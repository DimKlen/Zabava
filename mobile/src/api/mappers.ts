/** Conversion des réponses de l'API vers le modèle client (specs/docs/10 §1). */
import type { Availability, MediaType, UserTitle } from '@/domain/types';

import { toProvider } from './catalog';
import type { components } from './types';

type ApiAvailability = components['schemas']['Availability'];
type ApiUserTitle = components['schemas']['UserTitle'];

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

export function toAvailability(availability: ApiAvailability | undefined): Availability {
  return {
    sub: (availability?.sub ?? []).map(toProvider).filter(isDefined),
    rent: (availability?.rent ?? []).map(toProvider).filter(isDefined),
    buy: (availability?.buy ?? []).map(toProvider).filter(isDefined),
    link: availability?.link,
  };
}

const STATUSES: readonly UserTitle['status'][] = ['towatch', 'watched', 'following', 'abandoned'];

export function toUserTitle(
  userTitle: ApiUserTitle | undefined,
  titleId: string,
): UserTitle | undefined {
  const status = STATUSES.find((value) => value === userTitle?.status);
  if (!userTitle || !status) return undefined;
  return {
    titleId: userTitle.titleId ?? titleId,
    status,
    addedAt: userTitle.addedAt ?? new Date().toISOString(),
    watchedAt: userTitle.watchedAt,
    notificationsEnabled: userTitle.notificationsEnabled ?? true,
  };
}

export function toMediaType(type: string | undefined, fallback: MediaType): MediaType {
  return type === 'movie' || type === 'tv' || type === 'anime' ? type : fallback;
}
