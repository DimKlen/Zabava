import { router } from 'expo-router';

import { prefetchPerson } from '@/api/discover';

/** Ce que l'écran d'origine sait d'une personne : affiché pendant le chargement de sa fiche. */
export type PersonPreview = { id: number; name: string; profilePath?: string };

/** Aperçus récents, par identifiant ; les plus anciens partent. */
const previews = new Map<number, PersonPreview>();
const MAX_PREVIEWS = 50;

function remember(preview: PersonPreview): void {
  previews.delete(preview.id);
  previews.set(preview.id, preview);
  if (previews.size > MAX_PREVIEWS) {
    const oldest = previews.keys().next().value;
    if (oldest !== undefined) previews.delete(oldest);
  }
}

export function personPreview(id: number): PersonPreview | undefined {
  return previews.get(id);
}

/** Début de l'appui sur un nom : la fiche part avant le relâchement. */
export function pressPerson(preview: PersonPreview): void {
  remember(preview);
  prefetchPerson(preview.id);
}

export function openPerson(preview: PersonPreview): void {
  remember(preview);
  router.push(`/person/${preview.id}`);
}
