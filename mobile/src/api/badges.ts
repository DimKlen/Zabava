/**
 * Données de badge des affiches de catalogue (`GET /titles/badges`). Les affiches
 * affichées dans la même image sont regroupées en un seul appel.
 */
import { useQuery } from '@tanstack/react-query';

import type { Availability } from '@/domain/types';

import { api } from './http';
import { toAvailability } from './mappers';
import type { components } from './types';

type ApiTitleBadge = components['schemas']['TitleBadge'];

const DAY = 24 * 60 * 60 * 1000;
/** Limite de l'API par appel. */
const MAX_IDS = 60;
/** Attente pour regrouper les affiches rendues ensemble. */
const BATCH_DELAY_MS = 30;

export type BadgeData = {
  releaseTheatrical?: string;
  availability: Availability;
  network?: string;
  ended?: boolean;
};

type Waiter = { resolve: (data: BadgeData | null) => void; reject: (error: unknown) => void };

const waiting = new Map<string, Waiter[]>();
let timer: ReturnType<typeof setTimeout> | undefined;

export function toBadgeData(item: ApiTitleBadge): BadgeData {
  return {
    releaseTheatrical: item.releaseTheatrical,
    availability: toAvailability(item.availability),
    network: item.network,
    ended: item.ended,
  };
}

async function flush(): Promise<void> {
  timer = undefined;
  const ids = [...waiting.keys()].slice(0, MAX_IDS);
  const batch = ids.map((id) => [id, waiting.get(id) ?? []] as const);
  ids.forEach((id) => waiting.delete(id));
  if (waiting.size > 0) schedule();
  try {
    const items = await api<ApiTitleBadge[]>('/titles/badges', { query: { ids: ids.join(',') } });
    const byId = new Map(items.filter((item) => item.id).map((item) => [item.id, item]));
    for (const [id, waiters] of batch) {
      const item = byId.get(id);
      waiters.forEach((w) => w.resolve(item ? toBadgeData(item) : null));
    }
  } catch (error) {
    batch.forEach(([, waiters]) => waiters.forEach((w) => w.reject(error)));
  }
}

function schedule(): void {
  if (timer === undefined) timer = setTimeout(() => void flush(), BATCH_DELAY_MS);
}

/** Données de badge d'un titre ; null si le titre n'est pas trouvé. */
export function loadBadgeData(id: string): Promise<BadgeData | null> {
  return new Promise((resolve, reject) => {
    waiting.set(id, [...(waiting.get(id) ?? []), { resolve, reject }]);
    schedule();
  });
}

export function useBadgeData(id: string) {
  return useQuery({
    queryKey: ['badge', id],
    queryFn: () => loadBadgeData(id),
    staleTime: DAY,
  });
}
