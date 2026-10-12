import { useRef, useState } from 'react';

import type { PosterTitle } from '@/api/catalog';
import { addTitle, removeTitle } from '@/api/library';
import { initialStatus } from '@/domain/onboarding';
import { hapticLight } from '@/lib/haptics';

function toggled(set: ReadonlySet<string>, id: string, on: boolean): ReadonlySet<string> {
  const next = new Set(set);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

/**
 * Titres ajoutés pendant l'onboarding (étape 3). Mise à jour immédiate, appels
 * enchaînés titre par titre ; un échec rétablit l'état, sans toast.
 */
export function useOnboardingTitles() {
  const [added, setAdded] = useState<ReadonlySet<string>>(() => new Set());
  const chains = useRef(new Map<string, Promise<void>>());

  const toggle = (title: PosterTitle) => {
    hapticLight();
    const adding = !added.has(title.id);
    setAdded((current) => toggled(current, title.id, adding));

    const previous = chains.current.get(title.id) ?? Promise.resolve();
    const next = previous
      .then(() =>
        adding
          ? addTitle(title.tmdbId, title.type, initialStatus(title.type))
          : removeTitle(title.id),
      )
      .catch(() => setAdded((current) => toggled(current, title.id, !adding)));
    chains.current.set(title.id, next);
  };

  return { added, toggle };
}
