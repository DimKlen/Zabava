import { router } from 'expo-router';

import { prefetchTitle } from '@/api/titles';
import type { MediaType } from '@/domain/types';

/** Taille d'affiche déjà chargée par la liste d'origine (image en cache, affichée tout de suite). */
export type PosterSize = 'w92' | 'w185' | 'w342';

/** Ce que la liste sait déjà d'un titre : montré pendant que la fiche se charge. */
export type TitlePreview = {
  type: MediaType;
  tmdbId: number;
  title: string;
  posterPath?: string;
  year?: number;
  posterSize?: PosterSize;
};

/** Aperçu d'un titre de liste ; `posterSize` : taille d'affiche que la liste a affichée. */
export function previewOf(
  title: { type: MediaType; tmdbId: number; title: string; posterPath?: string; year?: number },
  posterSize?: PosterSize,
): TitlePreview {
  const { type, tmdbId, posterPath, year } = title;
  return { type, tmdbId, title: title.title, posterPath, year, posterSize };
}

/** Aperçus récents, par identifiant `${type}-${tmdbId}` ; les plus anciens partent. */
const previews = new Map<string, TitlePreview>();
const MAX_PREVIEWS = 50;

function remember(preview: TitlePreview): void {
  const id = `${preview.type}-${preview.tmdbId}`;
  previews.delete(id);
  previews.set(id, preview);
  if (previews.size > MAX_PREVIEWS) {
    const oldest = previews.keys().next().value;
    if (oldest !== undefined) previews.delete(oldest);
  }
}

export function titlePreview(id: string): TitlePreview | undefined {
  return previews.get(id);
}

/** Début de l'appui sur un titre : la fiche part avant le relâchement. */
export function pressTitle(preview: TitlePreview): void {
  remember(preview);
  prefetchTitle(preview.type, preview.tmdbId);
}

/** Ouvre la fiche ; une série peut s'ouvrir sur une saison (onglet Épisodes). */
export function openTitle(preview: TitlePreview, season?: number): void {
  remember(preview);
  router.push({
    pathname: '/title/[type]/[id]',
    params: {
      type: preview.type,
      id: String(preview.tmdbId),
      ...(season !== undefined ? { season: String(season) } : {}),
    },
  });
}
